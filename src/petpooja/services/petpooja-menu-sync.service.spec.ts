import { PetpoojaMenuSyncService } from './petpooja-menu-sync.service';

describe('PetpoojaMenuSyncService', () => {
  it('should attach petpoojaItemId to a seed row with the same name', async () => {
    const seed = {
      id: 'golden-lentil-bowl',
      name: 'Golden Lentil Bowl',
      petpoojaItemId: null,
      image: 'https://seed.example/bowl.jpg',
      moods: ['Relax'],
      stockQty: 100,
      inStock: true,
    };
    const rows = [seed];
    const menuRepository = {
      find: jest.fn().mockResolvedValue(rows),
      save: jest.fn(async (row) => {
        const index = rows.findIndex((entry) => entry.id === row.id);
        if (index >= 0) {
          Object.assign(rows[index], row);
          return rows[index];
        }
        rows.push(row);
        return row;
      }),
      create: jest.fn((row) => row),
    };
    const service = new PetpoojaMenuSyncService(
      menuRepository as any,
      { get: () => true } as any,
    );

    const count = await service.syncFromPayload({
      items: [
        {
          itemid: '7778660',
          itemname: 'Golden Lentil Bowl',
          price: '420',
          item_categoryid: '1',
        },
      ],
      categories: [{ categoryid: '1', categoryname: 'Bowls' }],
    });

    expect(count).toBe(1);
    expect(seed.id).toBe('golden-lentil-bowl');
    expect(seed.petpoojaItemId).toBe('7778660');
    expect(seed.image).toBe('https://seed.example/bowl.jpg');
    expect(rows).toHaveLength(1);
  });
});
