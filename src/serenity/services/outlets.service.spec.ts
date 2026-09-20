import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OutletsService } from './outlets.service';

describe('OutletsService', () => {
  function setup(rows: any[] = []) {
    const outletRepository = {
      find: jest.fn().mockResolvedValue(rows.filter((r) => r.isActive)),
      findOne: jest.fn(({ where }) => {
        const clauses = Array.isArray(where) ? where : [where];
        return (
          rows.find((row) =>
            clauses.some(
              (clause) =>
                (clause.id && clause.id === row.id) ||
                (clause.slug && clause.slug === row.slug) ||
                (clause.isDefault && row.isDefault) ||
                (clause.petpoojaRestId &&
                  clause.petpoojaRestId === row.petpoojaRestId),
            ),
          ) ?? null
        );
      }),
      save: jest.fn((row) => row),
      create: jest.fn((row) => row),
      update: jest.fn(),
    };
    const storeRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((row) => row),
      create: jest.fn((row) => row),
      createQueryBuilder: jest.fn(() => ({
        select: () => ({
          getRawOne: () => ({ max: '0' }),
        }),
      })),
    };

    return {
      service: new OutletsService(
        outletRepository as any,
        storeRepository as any,
      ),
      outletRepository,
    };
  }

  it('should resolves default outlet when id omitted', async () => {
    const { service } = setup([
      {
        id: 'outlet-serenity-1',
        slug: 'serenity-demo',
        name: 'Serenity Demo',
        isActive: true,
        isDefault: true,
      },
    ]);
    const outlet = await service.resolveOutletId();
    expect(outlet.id).toBe('outlet-serenity-1');
  });

  it('should rejects unknown outlet ids', async () => {
    const { service } = setup([]);
    await expect(service.resolveOutletId('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should get throws when inactive/missing', async () => {
    const { service } = setup([]);
    await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
