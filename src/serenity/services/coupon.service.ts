import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponEntity } from '../infrastructure/persistence/relational/entities/coupon.entity';
import { UpsertCouponDto } from '../dto/serenity.dto';

export type CouponDiscountResult = {
  code: string | null;
  discountInr: number;
  label: string | null;
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
  ): Promise<CouponDiscountResult> {
    const code = this.normalizeCode(rawCode);
    if (!code) {
      return { code: null, discountInr: 0, label: null };
    }

    const coupon = await this.couponRepository.findOne({ where: { code } });
    this.assertApplicable(coupon, code, subtotal);

    const discount = this.computeDiscount(coupon!, subtotal);
    return {
      code,
      discountInr: discount,
      label:
        coupon!.type === 'percent'
          ? `${coupon!.value}% off`
          : `₹${coupon!.value} off`,
    };
  }

  async redeem(rawCode: string | undefined): Promise<void> {
    const code = this.normalizeCode(rawCode);
    if (!code) {
      return;
    }

    const result = await this.couponRepository
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
    row.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    row.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    row.maxRedemptions = dto.maxRedemptions ?? null;
    row.isActive = dto.isActive ?? true;

    const saved = await this.couponRepository.save(row);
    return this.toAdminDto(saved);
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
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
