import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { UserNotificationEntity } from '../infrastructure/persistence/relational/entities/user-notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(UserNotificationEntity)
    private readonly notificationRepository: Repository<UserNotificationEntity>,
    @Optional()
    @InjectRepository(UserEntity)
    private readonly userRepository?: Repository<UserEntity>,
  ) {}

  async create(input: {
    userId: number;
    type: string;
    title: string;
    body: string;
    meta?: Record<string, string>;
  }) {
    const row = await this.notificationRepository.save(
      this.notificationRepository.create({
        id: `ntf-${Date.now()}-${randomBytes(3).toString('hex')}`,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        meta: input.meta ?? null,
        readAt: null,
      }),
    );
    return this.toDto(row);
  }

  async broadcast(input: { title: string; body: string; type?: string }) {
    const users = this.userRepository
      ? await this.userRepository.find({ select: ['id'] })
      : [];
    const type = input.type?.trim() || 'broadcast';
    const title = input.title.trim();
    const body = input.body.trim();
    const rows = users.map((user) =>
      this.notificationRepository.create({
        id: `ntf-${Date.now()}-${randomBytes(3).toString('hex')}-${user.id}`,
        userId: user.id,
        type,
        title,
        body,
        meta: { audience: 'all' },
        readAt: null,
      }),
    );
    if (rows.length) {
      await this.notificationRepository.save(rows, { chunk: 100 });
    }
    return { sent: rows.length, type };
  }

  async list(userId: number) {
    const rows = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      data: rows.map((row) => this.toDto(row)),
      unreadCount: rows.filter((row) => !row.readAt).length,
    };
  }

  async markRead(userId: number, id: string) {
    const row = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (!row.readAt) {
      row.readAt = new Date();
      await this.notificationRepository.save(row);
    }
    return this.toDto(row);
  }

  async markAllRead(userId: number) {
    const unread = await this.notificationRepository.find({
      where: { userId, readAt: IsNull() },
    });
    const now = new Date();
    for (const row of unread) {
      row.readAt = now;
    }
    if (unread.length) {
      await this.notificationRepository.save(unread);
    }
    return this.list(userId);
  }

  private toDto(row: UserNotificationEntity) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      meta: row.meta,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
