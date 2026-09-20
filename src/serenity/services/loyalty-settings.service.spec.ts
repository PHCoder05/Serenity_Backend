import { LoyaltySettingsService } from './loyalty-settings.service';

describe('LoyaltySettingsService', () => {
  it('should returns env defaults when no DB row', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue(null) };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'serenity.loyaltyPointValueInr') return 2;
        if (key === 'serenity.loyaltyMaxRedeemPercent') return 0.25;
        if (key === 'serenity.loyaltyEarnRate') return 0.1;
        return 0;
      }),
    };
    const service = new LoyaltySettingsService(repo as any, config as any);
    await expect(service.getRules()).resolves.toEqual({
      pointValueInr: 2,
      maxRedeemPercent: 0.25,
      earnRate: 0.1,
      source: 'env',
    });
  });

  it('should updates singleton row', async () => {
    const row = {
      id: 1,
      pointValueInr: 1,
      maxRedeemPercent: 0.2,
      earnRate: 0.2,
    };
    const repo = {
      findOne: jest.fn().mockResolvedValue(row),
      create: jest.fn((x) => x),
      save: jest.fn((x) => x),
    };
    const service = new LoyaltySettingsService(
      repo as any,
      {
        getOrThrow: jest.fn(),
      } as any,
    );

    const result = await service.update({ earnRate: 0.15 });
    expect(row.earnRate).toBe(0.15);
    expect(result.source).toBe('db');
    expect(result.earnRate).toBe(0.15);
  });
});
