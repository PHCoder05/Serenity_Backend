export type LoyaltyRules = {
  pointValueInr: number;
  maxRedeemPercent: number;
  earnRate: number;
};

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
