import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CouponEntity } from '../infrastructure/persistence/relational/entities/coupon.entity';
import { UpsertCouponDto } from '../dto/serenity.dto';

export type CouponDiscountResult = {
  code: string | null;
  discountInr: number;
  label: string | null;
};

export type CouponCartItem = {
  itemId: string;
  categoryId?: string;
  lineTotal: number;
};

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepository: Repository<CouponEntity>,
  ) {}

  normalizeCode(code?: string | null): string | null {
    if (!code?.trim()) {
      return null;
    }
    return code.trim().toUpperCase();
  }

  async apply(
    rawCode: string | undefined,
    subtotal: number,
    items?: CouponCartItem[],
  ): Promise<CouponDiscountResult> {
    const code = this.normalizeCode(rawCode);
    if (!code) {
      return { code: null, discountInr: 0, label: null };
    }

    const coupon = await this.couponRepository.findOne({ where: { code } });
    this.assertApplicable(coupon, code, subtotal);
    const eligible = this.eligibleSubtotal(coupon, subtotal, items);
    const discount = this.computeDiscount(coupon, eligible);
    return {
      code,
      discountInr: discount,
      label: this.publicLabel(coupon),
    };
  }

  async redeem(
    rawCode: string | undefined,
    manager?: EntityManager,
  ): Promise<void> {
    const code = this.normalizeCode(rawCode);
    if (!code) {
      return;
    }

    const repo = manager
      ? manager.getRepository(CouponEntity)
      : this.couponRepository;
    const result = await repo
      .createQueryBuilder()
      .update(CouponEntity)
      .set({ redeemedCount: () => '"redeemedCount" + 1' })
      .where('code = :code', { code })
      .andWhere('"isActive" = true')
      .andWhere(
        '("maxRedemptions" IS NULL OR "redeemedCount" < "maxRedemptions")',
      )
      .execute();

    if (!result.affected) {
      throw new BadRequestException({
        message: 'Coupon is no longer available',
        code: 'COUPON_INVALID',
      });
    }
  }

  async list() {
    const rows = await this.couponRepository.find({
      order: { code: 'ASC' },
    });
    return rows.map((row) => this.toAdminDto(row));
  }

  async listAvailable() {
    const now = Date.now();
    const rows = await this.couponRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });

    return {
      data: rows
        .filter((row) => this.isCurrentlyRedeemable(row, now))
        .map((row) => ({
          code: row.code,
          type: row.type,
          value: row.value,
          minSubtotal: row.minSubtotal,
          maxDiscount: row.maxDiscount,
          label: this.publicLabel(row),
          endsAt: row.endsAt?.toISOString() ?? null,
        })),
    };
  }

  async get(code: string) {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      throw new NotFoundException('Coupon not found');
    }
    const row = await this.couponRepository.findOne({
      where: { code: normalized },
    });
    if (!row) {
      throw new NotFoundException('Coupon not found');
    }
    return this.toAdminDto(row);
  }

  async upsert(code: string, dto: UpsertCouponDto) {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      throw new BadRequestException('Coupon code is required');
    }

    let row = await this.couponRepository.findOne({
      where: { code: normalized },
    });
    if (!row) {
      row = this.couponRepository.create({
        code: normalized,
        redeemedCount: 0,
      });
    }

    row.type = dto.type;
    row.value = dto.value;
    row.minSubtotal = dto.minSubtotal ?? 0;
    row.maxDiscount = dto.maxDiscount ?? null;
    if (dto.startsAt !== undefined) {
      row.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.endsAt !== undefined) {
      row.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    row.maxRedemptions = dto.maxRedemptions ?? null;
    row.isActive = dto.isActive ?? true;
    if (dto.itemIds !== undefined) {
      row.itemIds = dto.itemIds?.length ? dto.itemIds : null;
    }
    if (dto.categoryIds !== undefined) {
      row.categoryIds = dto.categoryIds?.length ? dto.categoryIds : null;
    }

    const saved = await this.couponRepository.save(row);
    return this.toAdminDto(saved);
  }

  private isCurrentlyRedeemable(coupon: CouponEntity, now: number): boolean {
    if (coupon.startsAt && coupon.startsAt.getTime() > now) {
      return false;
    }
    if (coupon.endsAt && coupon.endsAt.getTime() < now) {
      return false;
    }
    if (
      coupon.maxRedemptions != null &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      return false;
    }
    return true;
  }

  private publicLabel(coupon: CouponEntity): string {
    return coupon.type === 'percent'
      ? `${coupon.value}% off`
      : `₹${coupon.value} off`;
  }

  private eligibleSubtotal(
    coupon: CouponEntity,
    subtotal: number,
    items?: CouponCartItem[],
  ): number {
    const itemIds = coupon.itemIds?.filter(Boolean) ?? [];
    const categoryIds = coupon.categoryIds?.filter(Boolean) ?? [];
    if (!itemIds.length && !categoryIds.length) {
      return subtotal;
    }

    const matching = (items ?? []).filter((item) => {
      const itemOk = !itemIds.length || itemIds.includes(item.itemId);
      const categoryOk =
        !categoryIds.length ||
        (!!item.categoryId && categoryIds.includes(item.categoryId));
      return itemOk && categoryOk;
    });
    const eligible = matching.reduce((sum, item) => sum + item.lineTotal, 0);
    if (eligible <= 0) {
      throw new BadRequestException({
        message: `Coupon ${coupon.code} does not apply to these items`,
        code: 'COUPON_INVALID',
      });
    }
    return eligible;
  }

  computeDiscount(coupon: CouponEntity, subtotal: number): number {
    if (coupon.type === 'flat') {
      return Math.min(Math.abs(coupon.value), subtotal);
    }
    const raw = Math.floor((subtotal * Math.abs(coupon.value)) / 100);
    const capped =
      coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
    return Math.min(capped, subtotal);
  }

  private assertApplicable(
    coupon: CouponEntity | null,
    code: string,
    subtotal: number,
  ): asserts coupon is CouponEntity {
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException({
        message: `Coupon ${code} is invalid`,
        code: 'COUPON_INVALID',
      });
    }

    const now = Date.now();
    if (coupon.startsAt && coupon.startsAt.getTime() > now) {
      throw new BadRequestException({
        message: `Coupon ${code} is not active yet`,
        code: 'COUPON_INVALID',
      });
    }
    if (coupon.endsAt && coupon.endsAt.getTime() < now) {
      throw new BadRequestException({
        message: `Coupon ${code} has expired`,
        code: 'COUPON_INVALID',
      });
    }
    if (
      coupon.maxRedemptions != null &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      throw new BadRequestException({
        message: `Coupon ${code} has been fully redeemed`,
        code: 'COUPON_INVALID',
      });
    }
    if (subtotal < coupon.minSubtotal) {
      throw new BadRequestException({
        message: `Coupon ${code} requires a minimum subtotal of ₹${coupon.minSubtotal}`,
        code: 'COUPON_INVALID',
      });
    }
  }

  private toAdminDto(row: CouponEntity) {
    return {
      code: row.code,
      type: row.type,
      value: row.value,
      minSubtotal: row.minSubtotal,
      maxDiscount: row.maxDiscount,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      maxRedemptions: row.maxRedemptions,
      redeemedCount: row.redeemedCount,
      isActive: row.isActive,
      itemIds: row.itemIds ?? [],
      categoryIds: row.categoryIds ?? [],
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
