import { BadRequestException } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponEntity } from '../infrastructure/persistence/relational/entities/coupon.entity';

describe('CouponService', () => {
  function buildService(row?: Partial<CouponEntity> | null) {
    const coupon: CouponEntity | null =
      row === null
        ? null
        : ({
            id: 1,
            code: 'SERENITY10',
            type: 'percent',
            value: 10,
            minSubtotal: 0,
            maxDiscount: 50,
            startsAt: null,
            endsAt: null,
            maxRedemptions: null,
            redeemedCount: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...row,
          } as CouponEntity);

    const repo = {
      findOne: jest.fn().mockResolvedValue(coupon),
      find: jest.fn().mockResolvedValue(coupon ? [coupon] : []),
      createQueryBuilder: jest.fn(),
    };

    return {
      service: new CouponService(repo as any),
      repo,
      coupon,
    };
  }

  it('should returns zero discount when code omitted', async () => {
    const { service } = buildService();
    // Method is named apply (coupon), not Function.prototype.apply.
    // eslint-disable-next-line prefer-spread -- service.apply is a domain method
    await expect(service.apply(undefined, 500)).resolves.toEqual({
      code: null,
      discountInr: 0,
      label: null,
    });
  });

  it('should applies percent with maxDiscount cap', async () => {
    const { service } = buildService();
    const result = await service.apply('serenity10', 1000);
    expect(result.discountInr).toBe(50);
    expect(result.code).toBe('SERENITY10');
  });

  it('should applies flat coupon', async () => {
    const { service } = buildService({
      type: 'flat',
      value: 20,
      maxDiscount: null,
    });
    const result = await service.apply('SERENITY10', 100);
    expect(result.discountInr).toBe(20);
  });

  it('should rejects inactive coupon', async () => {
    const { service } = buildService({ isActive: false });
    await expect(service.apply('SERENITY10', 100)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should rejects when below minSubtotal', async () => {
    const { service } = buildService({ minSubtotal: 500 });
    await expect(service.apply('SERENITY10', 100)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'COUPON_INVALID' }),
    });
  });

  it('should lists only currently redeemable public coupons', async () => {
    const expired = {
      id: 2,
      code: 'OLD',
      type: 'flat' as const,
      value: 10,
      minSubtotal: 0,
      maxDiscount: null,
      startsAt: null,
      endsAt: new Date('2020-01-01'),
      maxRedemptions: null,
      redeemedCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CouponEntity;
    const { service, repo, coupon } = buildService();
    repo.find.mockResolvedValue([coupon, expired]);

    await expect(service.listAvailable()).resolves.toEqual({
      data: [
        {
          code: 'SERENITY10',
          type: 'percent',
          value: 10,
          minSubtotal: 0,
          maxDiscount: 50,
          label: '10% off',
          endsAt: null,
        },
      ],
    });
  });

  it('should computes discount helpers', () => {
    const { service, coupon } = buildService({
      type: 'flat',
      value: 999,
    });
    expect(service.computeDiscount(coupon!, 100)).toBe(100);
  });
});
