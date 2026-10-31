import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session binding', () => {
  const secret = 'test-secret';

  function build(session: {
    hash: string;
    user: { id: number };
  } | null) {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(secret),
    };
    const sessionService = {
      findById: jest.fn().mockResolvedValue(session),
    };
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: number) => ({
        id,
        role: { id: id === 1 ? 1 : 2 },
      })),
    };
    const strategy = new JwtStrategy(
      configService as never,
      sessionService as never,
      usersService as never,
    );
    return { strategy, usersService };
  }

  it('should accept a token whose user matches the session', async () => {
    const { strategy } = build({ hash: 'session-hash', user: { id: 38 } });
    const user = await strategy.validate({
      id: 38,
      sessionId: 173,
      hash: 'session-hash',
      role: { id: 2 },
      iat: 1,
      exp: 2,
    });
    expect(user.role).toEqual({ id: 2 });
  });

  it('should reject a token that reuses another user session', async () => {
    const { strategy, usersService } = build({
      hash: 'session-hash',
      user: { id: 38 },
    });
    await expect(
      strategy.validate({
        id: 1,
        sessionId: 173,
        hash: 'session-hash',
        role: { id: 1 },
        iat: 1,
        exp: 2,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('should reject a token with the wrong session hash', async () => {
    const { strategy } = build({ hash: 'session-hash', user: { id: 38 } });
    await expect(
      strategy.validate({
        id: 38,
        sessionId: 173,
        hash: 'other-hash',
        role: { id: 2 },
        iat: 1,
        exp: 2,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
