import {
  clampRedeemPoints,
  earnedPointsForTotal,
  LoyaltyRules,
  maxRedeemablePoints,
  pointsToDiscount,
} from './loyalty.rules';
import { toLoyaltyActivityDto } from './mappers';
import { LoyaltyTransactionEntity } from './infrastructure/persistence/relational/entities/loyalty-transaction.entity';

const RULES: LoyaltyRules = {
  pointValueInr: 1,
  maxRedeemPercent: 0.2,
  earnRate: 0.2,
};

describe('loyalty.rules', () => {
  describe('maxRedeemablePoints', () => {
    it('should cap at the configured percent of the order total', () => {
      expect(maxRedeemablePoints(1000, 500, RULES)).toBe(100);
    });

    it('should limit by the balance when balance is smaller', () => {
      expect(maxRedeemablePoints(40, 500, RULES)).toBe(40);
    });

    it('should return 0 for empty balance or empty total', () => {
      expect(maxRedeemablePoints(0, 500, RULES)).toBe(0);
      expect(maxRedeemablePoints(100, 0, RULES)).toBe(0);
    });

    it('should respect a different configured cap', () => {
      expect(
        maxRedeemablePoints(1000, 500, { ...RULES, maxRedeemPercent: 0.5 }),
      ).toBe(250);
    });
  });

  describe('clampRedeemPoints', () => {
    it('should return 0 when nothing requested', () => {
      expect(clampRedeemPoints(undefined, 100, 500, RULES)).toBe(0);
      expect(clampRedeemPoints(0, 100, 500, RULES)).toBe(0);
      expect(clampRedeemPoints(-10, 100, 500, RULES)).toBe(0);
    });

    it('should honour the request when within balance and cap', () => {
      expect(clampRedeemPoints(50, 100, 500, RULES)).toBe(50);
    });

    it('should clamp to the configured cap', () => {
      expect(clampRedeemPoints(400, 1000, 500, RULES)).toBe(100);
    });

    it('should clamp to the balance', () => {
      expect(clampRedeemPoints(80, 30, 500, RULES)).toBe(30);
    });

    it('should floor fractional requests', () => {
      expect(clampRedeemPoints(10.9, 100, 500, RULES)).toBe(10);
    });
  });

  describe('pointsToDiscount', () => {
    it('should convert points to a negative discount using the configured value', () => {
      expect(pointsToDiscount(75, RULES)).toBe(-75);
      expect(pointsToDiscount(75, { ...RULES, pointValueInr: 0.5 })).toBe(
        -37.5,
      );
    });
  });

  describe('earnedPointsForTotal', () => {
    it('should earn the configured rate of the net total', () => {
      expect(earnedPointsForTotal(400, RULES)).toBe(80);
    });

    it('should never go negative', () => {
      expect(earnedPointsForTotal(-50, RULES)).toBe(0);
    });
  });
});

describe('toLoyaltyActivityDto points label', () => {
  function buildTx(points: number): LoyaltyTransactionEntity {
    return {
      id: 1,
      userId: 1,
      label: 'Test',
      points,
      orderId: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
    } as LoyaltyTransactionEntity;
  }

  it('should prefix earned points with +', () => {
    expect(toLoyaltyActivityDto(buildTx(64)).pointsLabel).toBe('+64 pts');
  });

  it('should render redeemed points with their own sign', () => {
    expect(toLoyaltyActivityDto(buildTx(-50)).pointsLabel).toBe('-50 pts');
  });
});
