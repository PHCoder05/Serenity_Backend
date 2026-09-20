import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthProvidersEnum } from './auth-providers.enum';

describe('AuthService phone OTP', () => {
  function build() {
    const rows: any[] = [];
    const phoneOtpRepository = {
      count: jest.fn(
        ({ where }: any) => rows.filter((r) => r.phone === where.phone).length,
      ),
      create: jest.fn((x) => x),
      save: jest.fn((row) => {
        if (!row.id) {
          row.id = rows.length + 1;
          rows.push(row);
        }
        return row;
      }),
      findOne: jest.fn(({ where }: any) => {
        const match = [...rows]
          .reverse()
          .find(
            (r) =>
              r.phone === where.phone &&
              (where.consumedAt === undefined || r.consumedAt == null),
          );
        return match ?? null;
      }),
    };

    const usersService = {
      findBySocialIdAndProvider: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 42 }),
      findById: jest.fn().mockResolvedValue({
        id: 42,
        role: { id: 1 },
        provider: AuthProvidersEnum.phone,
        socialId: '9876543210',
      }),
      update: jest.fn(),
    };

    const sessionService = {
      create: jest.fn().mockResolvedValue({ id: 9, hash: 'h' }),
    };

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('tok'),
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'auth.expires') return '1h';
        if (key === 'auth.refreshExpires') return '7d';
        return 'secret';
      }),
    };

    const service = new AuthService(
      jwtService as any,
      usersService as any,
      sessionService as any,
      {} as any,
      configService as any,
      phoneOtpRepository as any,
    );

    return { service, phoneOtpRepository, usersService, rows };
  }

  it('should issues OTP and verifies into a session', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    process.env.AUTH_OTP_PROVIDER = 'console';

    const { service, usersService } = build();
    const requested = await service.requestPhoneOtp('9876543210');
    expect(requested.ok).toBe(true);
    expect(requested.devCode).toHaveLength(6);

    const login = await service.verifyPhoneOtp(
      '9876543210',
      requested.devCode!,
    );
    expect(login.token).toBe('tok');
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: AuthProvidersEnum.phone,
        socialId: '9876543210',
      }),
    );

    process.env.NODE_ENV = prev;
  });

  it('should rate limits OTP requests', async () => {
    const { service, rows } = build();
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      rows.push({
        id: i + 1,
        phone: '9876543210',
        createdAt: now,
        consumedAt: null,
      });
    }
    await expect(service.requestPhoneOtp('9876543210')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'OTP_RATE_LIMITED' }),
    });
  });

  it('should rejects wrong OTP', async () => {
    const { service } = build();
    const requested = await service.requestPhoneOtp('9876543210');
    await expect(
      service.verifyPhoneOtp('9876543210', '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(requested.devCode).toBeDefined();
  });

  it('should exchanges a firebase token for a session', async () => {
    const { service, usersService } = build();
    jest.spyOn(service, 'lookupFirebasePhone').mockResolvedValue({
      phone: '+919876543210',
      name: 'Ada',
    });

    const login = await service.loginWithFirebaseIdToken('fake-id-token');
    expect(login.token).toBe('tok');
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: AuthProvidersEnum.phone,
        socialId: '9876543210',
        firstName: 'Ada',
      }),
    );
  });
});
