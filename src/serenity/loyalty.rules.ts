export type LoyaltyRules = {
  pointValueInr: number;
  maxRedeemPercent: number;
  earnRate: number;
  expiryDays?: number | null;
};

export function loyaltyExpiryCutoff(
  expiryDays?: number | null,
): Date | null {
  if (!expiryDays || expiryDays <= 0) {
    return null;
  }
  return new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);
}

export function activeLoyaltyPoints<
  T extends { points: number; createdAt: Date },
>(transactions: T[], cutoff: Date | null): { balance: number; activity: T[] } {
  const activity = cutoff
    ? transactions.filter((tx) => tx.points < 0 || tx.createdAt >= cutoff)
    : transactions;
  const balance = Math.max(
    0,
    activity.reduce((sum, tx) => sum + tx.points, 0),
  );
  return { balance, activity };
}

export function maxRedeemablePoints(
  balance: number,
  totalBeforeLoyalty: number,
  rules: LoyaltyRules,
): number {
  if (balance <= 0 || totalBeforeLoyalty <= 0) {
    return 0;
  }
  const cap = Math.floor(totalBeforeLoyalty * rules.maxRedeemPercent);
  return Math.min(balance, cap);
}

export function clampRedeemPoints(
  requested: number | undefined,
  balance: number,
  totalBeforeLoyalty: number,
  rules: LoyaltyRules,
): number {
  if (!requested || requested <= 0) {
    return 0;
  }
  return Math.min(
    Math.floor(requested),
    maxRedeemablePoints(balance, totalBeforeLoyalty, rules),
  );
}

export function pointsToDiscount(points: number, rules: LoyaltyRules): number {
  return -points * rules.pointValueInr;
}

export function earnedPointsForTotal(
  netTotal: number,
  rules: LoyaltyRules,
): number {
  return Math.max(Math.round(netTotal * rules.earnRate), 0);
}
