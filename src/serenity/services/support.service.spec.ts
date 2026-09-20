import { BadRequestException } from '@nestjs/common';
import { SupportService } from './support.service';

describe('SupportService', () => {
  it('should rejects short queries', async () => {
    const service = new SupportService({} as any, {} as any, {} as any);
    await expect(service.searchCustomers('a')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should searches customers by email', async () => {
    const userRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: 'aarav@serenity.app',
          firstName: 'Aarav',
          lastName: 'Menon',
          provider: 'email',
        },
      ]),
      findOne: jest.fn(),
    };
    const profileRepository = {
      find: jest.fn().mockResolvedValue([{ userId: 1, phone: '9876543210' }]),
    };
    const service = new SupportService(
      userRepository as any,
      profileRepository as any,
      {} as any,
    );

    const result = await service.searchCustomers('aarav@');
    expect(result.data[0].email).toBe('aarav@serenity.app');
    expect(result.data[0].phone).toBe('9876543210');
  });
});
