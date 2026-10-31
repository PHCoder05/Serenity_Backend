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
    expect(priced.addons[0]?.id).toBe('a-herbed-rice');
  });

  it('should uses a matching PetPooja extra price and id', () => {
    const priced = priceDiyBowl(
      399,
      {
        base: 'herbed-rice',
        protein: 'paneer-lababdar',
        fibre: 'thai-slaw',
      },
      [{ id: 'a-4411', label: 'Herbed Rice', price: 55 }],
    );
    expect(priced.unitPrice).toBe(399 + 55 + 40 + 20);
    expect(priced.addons[0]).toEqual({
      id: 'a-4411',
      name: 'Herbed Rice',
      price: 55,
    });
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
