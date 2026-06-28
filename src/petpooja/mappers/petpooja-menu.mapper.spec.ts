import * as fs from 'fs';
import * as path from 'path';
import { mapPetpoojaMenuPayload } from './petpooja-menu.mapper';

describe('PetpoojaMenuMapper', () => {
  const fixture = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '../../../test/fixtures/petpooja-push-menu.sample.json',
      ),
      'utf8',
    ),
  );

  it('should map categories, prices, variants, and extras from the sample fixture', () => {
    const items = mapPetpoojaMenuPayload(fixture);

    expect(items).toHaveLength(4);

    const goldenBowl = items.find((item) => item.petpoojaItemId === '7778660');

    expect(goldenBowl).toMatchObject({
      name: 'Golden Lentil Bowl',
      category: 'Bowls',
      basePrice: 420,
      petpoojaItemId: '7778660',
      isCustomizable: true,
      inStock: true,
    });
    expect(goldenBowl?.variants).toEqual([
      { id: 'v-9001', label: 'Regular bowl', priceDelta: 0 },
      { id: 'v-9002', label: 'Hearty bowl', priceDelta: 90 },
    ]);
    expect(goldenBowl?.extras).toEqual([
      { id: 'a-8001', label: 'Avocado slices', price: 70 },
      { id: 'a-8002', label: 'Seed crisp', price: 40 },
    ]);

    const drink = items.find((item) => item.petpoojaItemId === '7532306');
    expect(drink).toMatchObject({
      name: 'Citrus Cooler',
      category: 'Drinks',
      basePrice: 180,
    });
  });

  it('should map flat item lists grouped by category id', () => {
    const items = mapPetpoojaMenuPayload({
      restaurants: [
        {
          restaurantid: 'test-rest-id',
          items: [
            {
              itemid: '100',
              itemname: 'Snack Plate',
              itemdescription: 'Light bites',
              price: '120',
              item_categoryid: '55',
              categoryname: 'Snacks',
              active: '1',
            },
          ],
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      petpoojaItemId: '100',
      category: 'Sides/Snacks',
      basePrice: 120,
    });
  });
});
