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

  it('should map fetch-menu payloads with root-level items and categories', () => {
    const items = mapPetpoojaMenuPayload({
      success: '1',
      restaurants: [{ restaurantid: 'hbmp8vufrd', active: '1' }],
      categories: [
        { categoryid: '88376', categoryname: 'Sizzling', active: '1' },
        { categoryid: '88378', categoryname: 'Starters', active: '1' },
      ],
      items: [
        {
          itemid: '5079',
          itemname: 'Veg Mocha Special Sizzling',
          itemdescription: 'Hot sizzling plate',
          price: '189.00',
          item_categoryid: '88376',
          active: '1',
          variation: [],
          addon: [],
        },
        {
          itemid: '5041',
          itemname: 'French Fries',
          itemdescription: 'Crispy fries',
          price: '0',
          item_categoryid: '88378',
          active: '1',
          itemallowvariation: '1',
          variation: [
            {
              variationid: '13842',
              name: 'Half',
              price: '59.00',
              active: '1',
            },
            {
              variationid: '13843',
              name: 'Full',
              price: '99.00',
              active: '1',
            },
          ],
          addon: [],
        },
      ],
    });

    expect(items).toHaveLength(2);

    const sizzling = items.find((item) => item.petpoojaItemId === '5079');
    expect(sizzling).toMatchObject({
      name: 'Veg Mocha Special Sizzling',
      category: 'Meals',
      basePrice: 189,
      petpoojaItemId: '5079',
    });

    const fries = items.find((item) => item.petpoojaItemId === '5041');
    expect(fries).toMatchObject({
      name: 'French Fries',
      category: 'Sides/Snacks',
      isCustomizable: true,
    });
    expect(fries?.variants).toEqual([
      { id: 'v-13842', label: 'Half', priceDelta: 59 },
      { id: 'v-13843', label: 'Full', priceDelta: 99 },
    ]);
  });
});
