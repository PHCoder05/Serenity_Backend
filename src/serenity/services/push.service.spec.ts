import axios from 'axios';
import { PushService, isExpoToken } from './push.service';

jest.mock('axios');

describe('PushService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function build(profile?: { pushEnabled: boolean } | null) {
    const rows: Array<{
      id: number;
      userId: number;
      token: string;
      platform: string;
    }> = [];
    const tokenRepository = {
      findOne: jest.fn(async ({ where }: { where: { token: string } }) =>
        rows.find((row) => row.token === where.token) ?? null,
      ),
      find: jest.fn(async ({ where }: { where: { userId: number } }) =>
        rows.filter((row) => row.userId === where.userId),
      ),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => {
        const existing = rows.find((item) => item.token === row.token);
        if (existing) {
          Object.assign(existing, row);
          return existing;
        }
        const created = { id: rows.length + 1, ...row };
        rows.push(created);
        return created;
      }),
      delete: jest.fn(async ({ userId, token }: { userId: number; token: string }) => {
        const index = rows.findIndex(
          (row) => row.userId === userId && row.token === token,
        );
        if (index >= 0) {
          rows.splice(index, 1);
        }
      }),
    };
    const profileRepository = {
      find: jest.fn(async () =>
        profile === null
          ? []
          : [{ userId: 7, pushEnabled: profile?.pushEnabled ?? true }],
      ),
    };
    const service = new PushService(
      tokenRepository as any,
      profileRepository as any,
    );
    return { service, rows, tokenRepository };
  }

  it('detects Expo push tokens', () => {
    expect(isExpoToken('ExponentPushToken[abc]')).toBe(true);
    expect(isExpoToken('fcm-native-token')).toBe(false);
  });

  it('upserts a device token onto the signed-in user', async () => {
    const { service, rows } = build();
    await service.register(7, '  ExponentPushToken[one]  ', 'ios');
    expect(rows).toEqual([
      expect.objectContaining({
        userId: 7,
        token: 'ExponentPushToken[one]',
        platform: 'ios',
      }),
    ]);
    await service.register(9, 'ExponentPushToken[one]', 'android');
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(9);
    expect(rows[0].platform).toBe('android');
  });

  it('sends Expo tokens without Firebase credentials', async () => {
    const posted = axios.post as jest.Mock;
    posted.mockResolvedValue({
      status: 200,
      data: { data: { status: 'ok' } },
    });
    const { service } = build();
    await service.register(7, 'ExponentPushToken[abc]', 'android');
    const result = await service.notifyUser(7, {
      title: 'Order confirmed',
      body: 'Kitchen has it',
      type: 'order',
    });
    expect(result.attempted).toBe(1);
    expect(posted).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        to: 'ExponentPushToken[abc]',
        title: 'Order confirmed',
      }),
      expect.any(Object),
    );
  });

  it('skips push when the profile has push disabled', async () => {
    const { service } = build({ pushEnabled: false });
    await service.register(7, 'ExponentPushToken[abc]', 'android');
    const result = await service.notifyUser(7, {
      title: 'Hi',
      body: 'There',
    });
    expect(result).toEqual({ attempted: 0, skipped: true });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('stores FCM tokens and no-ops send without FIREBASE_SERVICE_ACCOUNT', async () => {
    const { service } = build();
    await service.register(7, 'native-fcm-token', 'android');
    const result = await service.notifyUser(7, {
      title: 'Hi',
      body: 'There',
      type: 'broadcast',
    });
    expect(result.attempted).toBe(1);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
