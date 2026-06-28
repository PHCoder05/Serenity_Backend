import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PetpoojaOrderOutboundService } from '../../petpooja/services/petpooja-order-outbound.service';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { OrderLineItemEntity } from '../infrastructure/persistence/relational/entities/order-line-item.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import {
  CreateOrderDto,
  OrderQuoteDto,
  SubmitOrderFeedbackDto,
} from '../dto/serenity.dto';
import { toOrderDetailDto, toOrderListItemDto } from '../mappers';

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
    @Optional()
    private readonly petpoojaOrderOutbound?: PetpoojaOrderOutboundService,
  ) {}

  async quote(dto: OrderQuoteDto) {
    const priced = await this.priceItems(dto.items);
    const summary = this.summarizeQuote(priced, dto.couponCode);

    return {
      items: summary.publicItems,
      subtotal: summary.subtotal,
      couponDiscount: summary.couponDiscount,
      gst: summary.gst,
      deliveryFee: 0,
      total: summary.total,
      loyaltyPointsEarned: summary.loyaltyPointsEarned,
      valid: true,
    };
  }

  async create(userId: number, dto: CreateOrderDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.orderRepository.findOne({
        where: { userId, idempotencyKey },
      });
      if (existing) {
        return toOrderDetailDto(existing);
      }
    }

    const store = await this.storeRepository.findOne({ where: { id: 1 } });
    if (store && !store.isOpen) {
      throw new BadRequestException('Store is currently closed');
    }

    const priced = await this.priceItems(dto.items);
    const summary = this.summarizeQuote(priced, dto.couponCode);
    const orderId = `order-${Date.now()}`;
    const quantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);
    const firstItem = summary.publicItems[0];

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        id: orderId,
        userId,
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
        amountPaid: summary.total,
        paidVia: dto.paymentMethod,
        idempotencyKey: idempotencyKey ?? null,
      }),
    );

    await this.lineItemRepository.save(
      summary.publicItems.map((line) =>
        this.lineItemRepository.create({
          orderId: order.id,
          title: line.name,
          quantity: line.quantity,
          linePrice: line.lineTotal,
          ingredients: line.ingredients,
        }),
      ),
    );

    if (summary.loyaltyPointsEarned > 0) {
      await this.loyaltyRepository.save(
        this.loyaltyRepository.create({
          userId,
          label: firstItem?.name ?? 'Order',
          points: summary.loyaltyPointsEarned,
        }),
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

    return toOrderDetailDto(saved as SerenityOrderEntity);
  }

  async findAll(userId: number) {
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { orderedAt: 'DESC' },
    });

    return {
      data: orders.map(toOrderListItemDto),
      hasNextPage: false,
    };
  }

  async findOne(userId: number, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return toOrderDetailDto(order);
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

  private summarizeQuote(priced: PricedLine[], couponCode?: string) {
    const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);
    const couponDiscount = couponCode ? -20 : 0;
    const gst = Math.round(subtotal * 0.025);
    const total = subtotal + couponDiscount + gst;

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
      couponDiscount,
      gst,
      total,
      loyaltyPointsEarned: Math.max(Math.round(total * 0.2), 0),
    };
  }

  private async priceItems(
    items: OrderQuoteDto['items'],
  ): Promise<PricedLine[]> {
    if (!items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const menuItems = await this.menuRepository.find({
      where: { id: In(items.map((item) => item.itemId)) },
    });
    const menuById = new Map(menuItems.map((item) => [item.id, item]));

    return items.map((cartItem) => {
      const menuItem = menuById.get(cartItem.itemId);
      if (!menuItem) {
        throw new BadRequestException(`Unknown menu item: ${cartItem.itemId}`);
      }
      if (!menuItem.inStock) {
        throw new BadRequestException(`${menuItem.name} is out of stock`);
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
}
