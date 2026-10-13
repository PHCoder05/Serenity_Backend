import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import { In, Repository } from 'typeorm';
import { DeviceTokenEntity } from '../infrastructure/persistence/relational/entities/device-token.entity';
import { UserProfileEntity } from '../infrastructure/persistence/relational/entities/user-profile.entity';

export type PushPayload = {
  title: string;
  body: string;
  type?: string;
  meta?: Record<string, string> | null;
};

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private fcmAuth: GoogleAuth | null | undefined;
  private fcmProjectId: string | null = null;

  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly tokenRepository: Repository<DeviceTokenEntity>,
    @Optional()
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository?: Repository<UserProfileEntity>,
  ) {}

  async register(userId: number, tokenRaw: string, platformRaw?: string) {
    const token = tokenRaw.trim();
    const platform = normalizePlatform(platformRaw);
    let row = await this.tokenRepository.findOne({ where: { token } });
    if (!row) {
      row = this.tokenRepository.create({ userId, token, platform });
    } else {
      row.userId = userId;
      row.platform = platform;
    }
    await this.tokenRepository.save(row);
    return { ok: true as const, platform };
  }

  async unregister(userId: number, tokenRaw: string) {
    const token = tokenRaw.trim();
    await this.tokenRepository.delete({ userId, token });
    return { ok: true as const };
  }

  async notifyUser(userId: number, payload: PushPayload) {
    if (!(await this.pushAllowed(userId))) {
      return { attempted: 0, skipped: true as const };
    }
    const tokens = await this.tokenRepository.find({ where: { userId } });
    return this.dispatch(tokens, payload);
  }

  async notifyUsers(userIds: number[], payload: PushPayload) {
    if (!userIds.length) {
      return { attempted: 0 };
    }
    const tokens = await this.tokenRepository.find({
      where: { userId: In(userIds) },
    });
    const allowed = await this.pushAllowedSet(userIds);
    return this.dispatch(
      tokens.filter((row) => allowed.has(row.userId)),
      payload,
    );
  }

  private async pushAllowed(userId: number): Promise<boolean> {
    const allowed = await this.pushAllowedSet([userId]);
    return allowed.has(userId);
  }

  private async pushAllowedSet(userIds: number[]): Promise<Set<number>> {
    if (!this.profileRepository) {
      return new Set(userIds);
    }
    const profiles = await this.profileRepository.find({
      where: { userId: In(userIds) },
    });
    const disabled = new Set(
      profiles
        .filter((profile) => profile.pushEnabled === false)
        .map((profile) => profile.userId),
    );
    return new Set(userIds.filter((id) => !disabled.has(id)));
  }

  private async dispatch(tokens: DeviceTokenEntity[], payload: PushPayload) {
    let attempted = 0;
    for (const row of tokens) {
      attempted += 1;
      try {
        if (isExpoToken(row.token)) {
          await this.sendExpo(row.token, payload);
        } else {
          await this.sendFcm(row.token, payload);
        }
      } catch (error) {
        if (isStaleToken(error)) {
          await this.tokenRepository.delete({ id: row.id });
        } else {
          this.logger.warn(
            `Push failed for user ${row.userId}: ${errorMessage(error)}`,
          );
        }
      }
    }
    return { attempted };
  }

  private async sendExpo(token: string, payload: PushPayload) {
    const response = await axios.post(
      EXPO_PUSH_URL,
      {
        to: token,
        title: payload.title,
        body: payload.body,
        sound: 'default',
        data: {
          type: payload.type ?? 'notice',
          ...(payload.meta ?? {}),
        },
      },
      { timeout: 10_000, validateStatus: () => true },
    );
    const ticket = Array.isArray(response.data?.data)
      ? response.data.data[0]
      : response.data?.data;
    if (ticket?.status === 'error') {
      const error = new Error(ticket.message || 'Expo push failed') as Error & {
        stale?: boolean;
      };
      error.stale = ticket.details?.error === 'DeviceNotRegistered';
      throw error;
    }
    if (response.status >= 400) {
      throw new Error(`Expo push HTTP ${response.status}`);
    }
  }

  private async sendFcm(token: string, payload: PushPayload) {
    const auth = this.ensureFcmAuth();
    if (!auth || !this.fcmProjectId) {
      return;
    }
    const accessToken = await auth.getAccessToken();
    if (!accessToken) {
      return;
    }
    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${this.fcmProjectId}/messages:send`,
      {
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: stringifyData({
            type: payload.type ?? 'notice',
            ...(payload.meta ?? {}),
          }),
          android: { priority: 'HIGH' },
          apns: { payload: { aps: { sound: 'default' } } },
        },
      },
      {
        timeout: 10_000,
        validateStatus: () => true,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (response.status === 404 || response.data?.error?.status === 'NOT_FOUND') {
      const error = new Error('FCM token unregistered') as Error & {
        stale?: boolean;
      };
      error.stale = true;
      throw error;
    }
    if (response.status >= 400) {
      throw new Error(
        response.data?.error?.message || `FCM HTTP ${response.status}`,
      );
    }
  }

  private ensureFcmAuth(): GoogleAuth | null {
    if (this.fcmAuth !== undefined) {
      return this.fcmAuth;
    }
    const credentials = loadServiceAccount();
    if (!credentials) {
      this.fcmAuth = null;
      return null;
    }
    this.fcmProjectId = credentials.project_id;
    this.fcmAuth = new GoogleAuth({
      credentials,
      scopes: [FCM_SCOPE],
    });
    return this.fcmAuth;
  }
}

function normalizePlatform(raw?: string): string {
  const value = raw?.trim().toLowerCase();
  if (value === 'ios' || value === 'android' || value === 'web') {
    return value;
  }
  return 'android';
}

export function isExpoToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
  );
}

function stringifyData(data: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value != null) {
      out[key] = String(value);
    }
  }
  return out;
}

function loadServiceAccount(): {
  project_id: string;
  client_email: string;
  private_key: string;
} | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch {
    return null;
  }
}

function isStaleToken(error: unknown): boolean {
  return Boolean((error as { stale?: boolean })?.stale);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
