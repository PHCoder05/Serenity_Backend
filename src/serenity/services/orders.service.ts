import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { In, QueryFailedError, Repository } from 'typeorm';
import { AllConfigType } from '../../config/config.type';
import { AuthService } from '../../auth/auth.service';
import { normalizePhone } from '../../auth/utils/phone.util';
import { PetpoojaOrderOutboundService } from '../../petpooja/services/petpooja-order-outbound.service';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { OrderLineItemEntity } from '../infrastructure/persistence/relational/entities/order-line-item.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import { OrderStatusHistoryEntity } from '../infrastructure/persistence/relational/entities/order-status-history.entity';
import {
  CreateOrderDto,
  OrderQuoteDto,
  SubmitOrderFeedbackDto,
} from '../dto/serenity.dto';
import { toOrderDetailDto, toOrderListItemDto } from '../mappers';
import {
  clampRedeemPoints,
  earnedPointsForTotal,
  LoyaltyRules,
  maxRedeemablePoints,
  pointsToDiscount,
} from '../loyalty.rules';
import { PaymentsService } from './payments.service';
import { CouponService } from './coupon.service';
import { OutletsService } from './outlets.service';
import { LoyaltySettingsService } from './loyalty-settings.service';
import { priceDiyBowl } from '../pricing/diy-pricing';
import {
  clampLimit,
  clampPage,
  fingerprintCreateOrder,
  normalizeIdempotencyKey,
} from '../orders/order-idempotency';

const CANCELLABLE_ORDER_STATUSES = new Set(['confirmed']);

type PricedLine = {
  itemId: string;
  menuItem: MenuItemEntity;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantId?: string;
  extraIds?: string[];
  detail?: string;
  ingredients: string[];
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(OrderLineItemEntity)
    private readonly lineItemRepository: Repository<OrderLineItemEntity>,
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly loyaltyRepository: Repository<LoyaltyTransactionEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    @InjectRepository(OrderStatusHistoryEntity)
    private readonly historyRepository: Repository<OrderStatusHistoryEntity>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly couponService: CouponService,
    private readonly outletsService: OutletsService,
    private readonly authService: AuthService,
    private readonly loyaltySettings: LoyaltySettingsService,
    private readonly configService: ConfigService<AllConfigType>,
    @Optional()
    private readonly petpoojaOrderOutbound?: PetpoojaOrderOutboundService,
  ) {}

  async quote(dto: OrderQuoteDto, userId?: number) {
    const outlet = await this.outletsService.resolveOutletId(dto.outletId);
    const priced = await this.priceItems(dto.items);
    const balance = userId ? await this.getLoyaltyBalance(userId) : 0;
    const summary = await this.summarizeQuote(priced, dto.couponCode, {
      requested: userId ? dto.redeemPoints : undefined,
      balance,
    });

    return {
      items: summary.publicItems,
      subtotal: summary.subtotal,
      couponCode: summary.couponCode,
      couponDiscount: summary.couponDiscount,
      couponLabel: summary.couponLabel,
      gst: summary.gst,
      deliveryFee: 0,
      total: summary.total,
      loyaltyPointsEarned: summary.loyaltyPointsEarned,
      loyaltyBalance: balance,
      maxRedeemablePoints: summary.maxRedeemablePoints,
      loyaltyPointsRedeemed: summary.loyaltyPointsRedeemed,
      loyaltyDiscount: summary.loyaltyDiscount,
      outletId: outlet.id,
      valid: true,
    };
  }

  async create(
    userId: number | undefined,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ) {
    const key = normalizeIdempotencyKey(idempotencyKey);
    if (!key) {
      throw new BadRequestException({
        message: 'x-idempotency-key header is required',
        code: 'IDEMPOTENCY_KEY_REQUIRED',
      });
    }

    const isGuest = userId == null;
    let resolvedUserId: number | null = userId ?? null;
    let guestToken: string | null = null;
    let guestPhone: string | null = null;

    if (isGuest) {
      if (!dto.guest?.name?.trim() || !dto.guest?.phone?.trim()) {
        throw new BadRequestException({
          message: 'guest.name and guest.phone are required without auth',
          code: 'GUEST_CONTACT_REQUIRED',
        });
      }
      if (dto.paymentMethod !== 'COD') {
        throw new BadRequestException({
          message: 'Guest checkout supports COD only',
          code: 'GUEST_COD_ONLY',
        });
      }
      guestPhone = normalizePhone(dto.guest.phone);
      resolvedUserId = null;
      guestToken = randomBytes(24).toString('hex');
    }

    if (!isGuest && resolvedUserId == null) {
      throw new BadRequestException({
        message: 'Authentication required',
        code: 'GUEST_CONTACT_REQUIRED',
      });
    }

    const fingerprint = fingerprintCreateOrder(dto);
    const existing = await this.findIdempotentOrder(
      isGuest,
      resolvedUserId,
      guestPhone,
      key,
    );
    if (existing) {
      return this.replayOrder(existing, fingerprint, isGuest);
    }

    const outlet = await this.outletsService.resolveOutletId(dto.outletId);
    const store = await this.outletsService.ensureStoreStatus(outlet.id);
    if (!store.isOpen) {
      throw new BadRequestException({
        message: 'Store is currently closed',
        code: 'STORE_CLOSED',
      });
    }

    const priced = await this.priceItems(dto.items);
    const loyaltyBalance =
      resolvedUserId == null
        ? 0
        : await this.getLoyaltyBalance(resolvedUserId);
    const summary = await this.summarizeQuote(priced, dto.couponCode, {
      requested: isGuest ? undefined : dto.redeemPoints,
      balance: loyaltyBalance,
    });

    let paymentIntentId: string | null = dto.paymentIntentId ?? null;
    if (dto.paymentMethod !== 'COD') {
      if (!paymentIntentId) {
        throw new BadRequestException({
          message: 'paymentIntentId is required for online payments',
          code: 'PAYMENT_INTENT_REQUIRED',
        });
      }
      await this.paymentsService.assertSucceededForOrder({
        userId: resolvedUserId as number,
        paymentIntentId,
        orderTotal: summary.total,
        method: dto.paymentMethod,
      });
    } else if (isGuest) {
      paymentIntentId = null;
    } else if (paymentIntentId) {
      await this.paymentsService.assertIntentUnused(paymentIntentId);
    }

    const orderId = `order-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const quantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);
    const firstItem = summary.publicItems[0];
    const guestTokenHash = guestToken
      ? createHash('sha256').update(guestToken).digest('hex')
      : null;

    let order: SerenityOrderEntity;
    try {
      order = await this.orderRepository.save(
        this.orderRepository.create({
          id: orderId,
          userId: resolvedUserId,
          status: 'confirmed',
          orderedAt: new Date(),
          itemSummary: firstItem
            ? `${firstItem.name} x ${firstItem.quantity}`
            : 'Serenity order',
          note: dto.note ?? '',
          total: summary.total,
          quantity,
          subtotal: summary.subtotal,
          couponDiscount: summary.couponDiscount,
          gst: summary.gst,
          loyaltyDiscount: summary.loyaltyDiscount,
          loyaltyPointsRedeemed: summary.loyaltyPointsRedeemed,
          amountPaid: dto.paymentMethod === 'COD' ? 0 : summary.total,
          paidVia: dto.paymentMethod,
          paymentIntentId,
          idempotencyKey: key,
          idempotencyFingerprint: fingerprint,
          outletId: outlet.id,
          guestTokenHash,
          guestPhone,
          isGuestCheckout: isGuest,
        }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const raced = await this.findIdempotentOrder(
          isGuest,
          resolvedUserId,
          guestPhone,
          key,
        );
        if (raced) {
          return this.replayOrder(raced, fingerprint, isGuest);
        }
      }
      throw error;
    }

    await this.lineItemRepository.save(
      summary.publicItems.map((line) =>
        this.lineItemRepository.create({
          orderId: order.id,
          title: line.name,
          menuItemId: line.itemId,
          detail: line.detail ?? null,
          quantity: line.quantity,
          linePrice: line.lineTotal,
          ingredients: line.ingredients,
        }),
      ),
    );

    try {
      await this.reserveStock(priced);
    } catch (error) {
      await this.orderRepository.delete(order.id);
      throw error;
    }

    if (summary.couponCode) {
      try {
        await this.couponService.redeem(summary.couponCode);
      } catch (error) {
        await this.restoreReservedStock(priced);
        await this.orderRepository.delete(order.id);
        throw error;
      }
    }

    if (resolvedUserId != null) {
      await this.recordLoyaltyForOrder(
        resolvedUserId,
        order.id,
        firstItem?.name ?? 'Order',
        summary.loyaltyPointsRedeemed,
        summary.loyaltyPointsEarned,
      );
    }

    await this.petpoojaOrderOutbound?.pushSerenityOrder({
      order,
      dto,
      pricedLines: priced,
      subtotal: summary.subtotal,
      gst: summary.gst,
      total: summary.total,
    });

    const saved = await this.orderRepository.findOne({
      where: { id: order.id },
    });

    const detail = toOrderDetailDto(saved as SerenityOrderEntity);
    return isGuest ? { ...detail, guestToken } : detail;
  }

  async findOneByGuestToken(token: string) {
    const hash = createHash('sha256').update(token.trim()).digest('hex');
    const order = await this.orderRepository.findOne({
      where: { guestTokenHash: hash },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const history = await this.historyRepository.find({
      where: { orderId: order.id },
      order: { createdAt: 'ASC' },
    });
    return toOrderDetailDto(order, history);
  }

  async findAll(userId: number, pageInput?: number, limitInput?: number) {
    const page = clampPage(pageInput);
    const limit = clampLimit(limitInput);
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      order: { orderedAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: orders.map(toOrderListItemDto),
      page,
      limit,
      total,
      hasNextPage: page * limit < total,
    };
  }

  async findOne(userId: number, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const history = await this.historyRepository.find({
      where: { orderId: order.id },
      order: { createdAt: 'ASC' },
    });

    return toOrderDetailDto(order, history);
  }

  async cancel(userId: number, id: string, reason?: string) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const cancellable = CANCELLABLE_ORDER_STATUSES;
    if (order.status === 'cancelled') {
      return toOrderDetailDto(order);
    }
    if (!cancellable.has(order.status)) {
      throw new BadRequestException({
        message: `Order cannot be cancelled while status is ${order.status}`,
        code: 'ORDER_NOT_CANCELLABLE',
      });
    }

    const fromStatus = order.status;
    order.status = 'cancelled';
    order.cancelReason = reason?.trim() || 'Cancelled by customer';
    await this.orderRepository.save(order);

    await this.historyRepository.save(
      this.historyRepository.create({
        orderId: order.id,
        fromStatus,
        toStatus: 'cancelled',
        source: 'customer',
        rawStatus: null,
        note: order.cancelReason,
      }),
    );

    await this.restoreStockForOrder(order.id);
    await this.reverseLoyaltyForCancel(order);

    const refundResult = await this.paymentsService.refundForOrderCancel({
      paymentIntentId: order.paymentIntentId,
      reason: order.cancelReason ?? undefined,
    });

    await this.petpoojaOrderOutbound?.cancelSerenityOrder(order);

    return {
      ...toOrderDetailDto(order),
      refunded: refundResult.refunded,
      refundFailed: refundResult.refundFailed ?? false,
      refundQueued: refundResult.refundQueued ?? false,
      refundRef: refundResult.refundRef,
    };
  }

  async settleKitchenCancel(order: SerenityOrderEntity) {
    await this.restoreStockForOrder(order.id);
    if (order.userId != null) {
      await this.reverseLoyaltyForCancel(order);
    }
    await this.paymentsService.refundForOrderCancel({
      paymentIntentId: order.paymentIntentId,
      reason: order.cancelReason ?? 'Cancelled by kitchen',
    });
  }

  private async findIdempotentOrder(
    isGuest: boolean,
    userId: number | null,
    guestPhone: string | null,
    key: string,
  ) {
    if (isGuest) {
      return this.orderRepository.findOne({
        where: { guestPhone: guestPhone ?? '', idempotencyKey: key, isGuestCheckout: true },
      });
    }
    return this.orderRepository.findOne({
      where: { userId: userId as number, idempotencyKey: key },
    });
  }

  private async replayOrder(
    existing: SerenityOrderEntity,
    fingerprint: string,
    isGuest: boolean,
  ) {
    const replay = await this.resolveIdempotentReplay(existing, fingerprint);
    if (!isGuest) {
      return replay;
    }
    const guestToken = randomBytes(24).toString('hex');
    await this.orderRepository.update(existing.id, {
      guestTokenHash: createHash('sha256').update(guestToken).digest('hex'),
    });
    return { ...replay, guestToken };
  }

  private async reverseLoyaltyForCancel(order: SerenityOrderEntity) {
    if (order.userId == null) {
      return;
    }
    const userId = order.userId;
    const orderTxs = await this.loyaltyRepository.find({
      where: { orderId: order.id },
    });
    const alreadyReversed = orderTxs.some(
      (tx) =>
        tx.label.startsWith('Redemption refund') ||
        tx.label.startsWith('Earned points reversed'),
    );
    if (alreadyReversed) {
      return;
    }

    const earned = orderTxs
      .filter((tx) => tx.points > 0)
      .reduce((sum, tx) => sum + tx.points, 0);

    const reversals: Partial<LoyaltyTransactionEntity>[] = [];
    if (order.loyaltyPointsRedeemed > 0) {
      reversals.push({
        userId,
        label: `Redemption refund · ${order.itemSummary}`,
        points: order.loyaltyPointsRedeemed,
        orderId: order.id,
      });
    }
    if (earned > 0) {
      reversals.push({
        userId,
        label: `Earned points reversed · ${order.itemSummary}`,
        points: -earned,
        orderId: order.id,
      });
    }

    if (reversals.length) {
      await this.loyaltyRepository.save(
        reversals.map((entry) => this.loyaltyRepository.create(entry)),
      );
    }
  }

  async reorder(userId: number, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const lines = order.lineItems ?? [];
    if (!lines.length) {
      throw new BadRequestException({
        message: 'Order has no items to reorder',
        code: 'ORDER_EMPTY_REORDER',
      });
    }

    const menuIds = lines
      .map((line) => line.menuItemId)
      .filter((value): value is string => Boolean(value));

    const menuById = new Map<string, MenuItemEntity>();
    if (menuIds.length) {
      const found = await this.menuRepository.find({
        where: { id: In(menuIds) },
      });
      for (const item of found) {
        menuById.set(item.id, item);
      }
    }

    const needsNameLookup = lines.some(
      (line) => !line.menuItemId || !menuById.has(line.menuItemId),
    );
    if (needsNameLookup) {
      const allMenu = await this.menuRepository.find();
      for (const item of allMenu) {
        menuById.set(`name:${item.name.toLowerCase()}`, item);
      }
    }

    const items = lines.map((line) => {
      const byId =
        line.menuItemId && menuById.get(line.menuItemId)
          ? menuById.get(line.menuItemId)
          : undefined;
      const byName = menuById.get(`name:${line.title.toLowerCase()}`);
      const menuItem = byId ?? byName;
      if (!menuItem) {
        throw new BadRequestException({
          message: `Cannot reorder: "${line.title}" is no longer on the menu`,
          code: 'MENU_ITEM_UNKNOWN',
        });
      }
      if (!menuItem.inStock) {
        throw new BadRequestException({
          message: `${menuItem.name} is out of stock`,
          code: 'MENU_ITEM_OOS',
        });
      }
      if (menuItem.stockQty != null && line.quantity > menuItem.stockQty) {
        throw new BadRequestException({
          message: `${menuItem.name} does not have enough stock`,
          code: 'MENU_ITEM_OOS',
        });
      }

      return {
        itemId: menuItem.id,
        quantity: line.quantity,
        detail: line.detail ?? undefined,
        name: menuItem.name,
        image: menuItem.image,
        unitPrice: menuItem.basePrice,
      };
    });

    return { items };
  }

  async submitFeedback(
    userId: number,
    id: string,
    dto: SubmitOrderFeedbackDto,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.foodRating = dto.foodRating;
    order.serviceRating = dto.serviceRating;
    order.feedbackNote = dto.note ?? null;
    order.feedbackAt = new Date();
    await this.orderRepository.save(order);

    return {
      success: true as const,
      message: 'Feedback submitted',
    };
  }

  private async summarizeQuote(
    priced: PricedLine[],
    couponCode?: string,
    redemption?: { requested?: number; balance: number },
  ) {
    const rules: LoyaltyRules = await this.loyaltySettings.getRules();
    const gstRate = this.configService.getOrThrow('serenity.gstRate', {
      infer: true,
    });

    const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);
    const coupon = await this.couponService.apply(couponCode, subtotal);
    const couponDiscount = coupon.discountInr ? -coupon.discountInr : 0;
    const gst = Math.round(subtotal * gstRate);
    const totalBeforeLoyalty = subtotal + couponDiscount + gst;

    const balance = redemption?.balance ?? 0;
    const loyaltyPointsRedeemed = clampRedeemPoints(
      redemption?.requested,
      balance,
      totalBeforeLoyalty,
      rules,
    );
    const loyaltyDiscount = pointsToDiscount(loyaltyPointsRedeemed, rules);
    const total = totalBeforeLoyalty + loyaltyDiscount;

    return {
      publicItems: priced.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        variantId: line.variantId,
        extraIds: line.extraIds,
        detail: line.detail,
        ingredients: line.ingredients,
      })),
      subtotal,
      couponCode: coupon.code,
      couponLabel: coupon.label,
      couponDiscount,
      gst,
      total,
      loyaltyPointsEarned: earnedPointsForTotal(total, rules),
      maxRedeemablePoints: maxRedeemablePoints(
        balance,
        totalBeforeLoyalty,
        rules,
      ),
      loyaltyPointsRedeemed,
      loyaltyDiscount,
    };
  }

  private async recordLoyaltyForOrder(
    userId: number,
    orderId: string,
    label: string,
    redeemed: number,
    earned: number,
  ) {
    if (redeemed <= 0 && earned <= 0) {
      return;
    }

    await this.loyaltyRepository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
      const result = await manager
        .createQueryBuilder(LoyaltyTransactionEntity, 'tx')
        .select('COALESCE(SUM(tx.points), 0)', 'balance')
        .where('tx.userId = :userId', { userId })
        .getRawOne<{ balance: string }>();
      const balance = Number(result?.balance ?? 0);
      if (redeemed > 0 && balance < redeemed) {
        throw new BadRequestException({
          message: 'Not enough loyalty points',
          code: 'LOYALTY_INSUFFICIENT',
        });
      }

      if (redeemed > 0) {
        await manager.save(
          manager.create(LoyaltyTransactionEntity, {
            userId,
            label: `Redeemed · ${label}`,
            points: -redeemed,
            orderId,
          }),
        );
      }
      if (earned > 0) {
        await manager.save(
          manager.create(LoyaltyTransactionEntity, {
            userId,
            label,
            points: earned,
            orderId,
          }),
        );
      }
    });
  }

  private async reserveStock(priced: PricedLine[]) {
    const reserved: { id: string; quantity: number }[] = [];
    try {
      for (const line of priced) {
        if (line.menuItem.stockQty == null) {
          continue;
        }
        const quantity = Math.trunc(line.quantity);
        const result = await this.menuRepository
          .createQueryBuilder()
          .update(MenuItemEntity)
          .set({ stockQty: () => `"stockQty" - ${quantity}` })
          .where('id = :id', { id: line.itemId })
          .andWhere('"stockQty" >= :qty', { qty: quantity })
          .execute();
        if (!result.affected) {
          throw new BadRequestException({
            message: `${line.menuItem.name} does not have enough stock`,
            code: 'MENU_ITEM_OOS',
          });
        }
        reserved.push({ id: line.itemId, quantity });
      }
    } catch (error) {
      await this.restoreStock(reserved);
      throw error;
    }
  }

  private async restoreReservedStock(priced: PricedLine[]) {
    await this.restoreStock(
      priced
        .filter((line) => line.menuItem.stockQty != null)
        .map((line) => ({ id: line.itemId, quantity: line.quantity })),
    );
  }

  private async restoreStockForOrder(orderId: string) {
    const lines = await this.lineItemRepository.find({ where: { orderId } });
    await this.restoreStock(
      lines
        .filter((line) => line.menuItemId)
        .map((line) => ({
          id: line.menuItemId as string,
          quantity: line.quantity,
        })),
    );
  }

  private async restoreStock(rows: { id: string; quantity: number }[]) {
    for (const row of rows) {
      const quantity = Math.trunc(row.quantity);
      if (!row.id || quantity < 1) {
        continue;
      }
      await this.menuRepository
        .createQueryBuilder()
        .update(MenuItemEntity)
        .set({ stockQty: () => `"stockQty" + ${quantity}` })
        .where('id = :id', { id: row.id })
        .andWhere('"stockQty" IS NOT NULL')
        .execute();
    }
  }

  private async getLoyaltyBalance(userId: number): Promise<number> {
    const result = await this.loyaltyRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.points), 0)', 'balance')
      .where('tx.userId = :userId', { userId })
      .getRawOne<{ balance: string }>();

    return Number(result?.balance ?? 0);
  }

  private async priceItems(
    items: OrderQuoteDto['items'],
  ): Promise<PricedLine[]> {
    if (!items.length) {
      throw new BadRequestException({
        message: 'Cart is empty',
        code: 'CART_EMPTY',
      });
    }

    const menuItems = await this.menuRepository.find({
      where: { id: In(items.map((item) => item.itemId)) },
    });
    const menuById = new Map(menuItems.map((item) => [item.id, item]));

    return items.map((cartItem) => {
      const menuItem = menuById.get(cartItem.itemId);
      if (!menuItem) {
        throw new BadRequestException({
          message: `Unknown menu item: ${cartItem.itemId}`,
          code: 'MENU_ITEM_UNKNOWN',
        });
      }
      if (!menuItem.inStock) {
        throw new BadRequestException({
          message: `${menuItem.name} is out of stock`,
          code: 'MENU_ITEM_OOS',
        });
      }
      if (
        menuItem.stockQty != null &&
        cartItem.quantity > menuItem.stockQty
      ) {
        throw new BadRequestException({
          message: `${menuItem.name} does not have enough stock`,
          code: 'MENU_ITEM_OOS',
        });
      }

      if (cartItem.diySelections) {
        if (!menuItem.isCustomizable) {
          throw new BadRequestException({
            message: `${menuItem.name} does not support DIY selections`,
            code: 'DIY_SELECTION_INVALID',
          });
        }
        const diy = priceDiyBowl(menuItem.basePrice, cartItem.diySelections);
        return {
          itemId: menuItem.id,
          menuItem,
          name: diy.detail,
          quantity: cartItem.quantity,
          unitPrice: diy.unitPrice,
          lineTotal: diy.unitPrice * cartItem.quantity,
          detail: diy.detail,
          ingredients: diy.ingredients,
        };
      }

      let unitPrice = menuItem.basePrice;
      const variant = menuItem.variants?.find(
        (entry) => entry.id === cartItem.variantId,
      );
      if (variant) {
        unitPrice += variant.priceDelta;
      }

      const extras = menuItem.extras?.filter((extra) =>
        cartItem.extraIds?.includes(extra.id),
      );
      const extrasTotal =
        extras?.reduce((sum, extra) => sum + extra.price, 0) ?? 0;
      unitPrice += extrasTotal;

      const ingredients = [
        menuItem.shortLabel,
        ...(extras?.map((extra) => extra.label) ?? []),
      ];

      return {
        itemId: menuItem.id,
        menuItem,
        name: menuItem.name,
        quantity: cartItem.quantity,
        unitPrice,
        lineTotal: unitPrice * cartItem.quantity,
        variantId: cartItem.variantId,
        extraIds: cartItem.extraIds,
        detail: cartItem.detail,
        ingredients,
      };
    });
  }

  private resolveIdempotentReplay(
    existing: SerenityOrderEntity,
    fingerprint: string,
  ) {
    if (
      existing.idempotencyFingerprint &&
      existing.idempotencyFingerprint !== fingerprint
    ) {
      throw new ConflictException({
        message: 'Idempotency key already used with a different request',
        code: 'IDEMPOTENCY_CONFLICT',
      });
    }
    return toOrderDetailDto(existing);
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }
}
