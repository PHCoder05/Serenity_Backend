import { BadRequestException } from '@nestjs/common';
import { priceDiyBowl } from './diy-pricing';

describe('priceDiyBowl', () => {
  it('should sums base price and option deltas', () => {
    const priced = priceDiyBowl(399, {
      base: 'herbed-rice',
      protein: 'paneer-lababdar',
      fibre: 'thai-slaw',
    });
    // 20 + 40 + 20
    expect(priced.unitPrice).toBe(479);
    expect(priced.detail).toContain('Herbed Rice');
    expect(priced.ingredients).toHaveLength(3);
  });

  it('should rejects unknown option ids', () => {
    expect(() =>
      priceDiyBowl(399, {
        base: 'not-a-base',
        protein: 'rajma-masala',
        fibre: 'dahi-raita',
      }),
    ).toThrow(BadRequestException);
  });
});
