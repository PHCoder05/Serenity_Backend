import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UserNotificationEntity } from '../infrastructure/persistence/relational/entities/user-notification.entity';

describe('NotificationsService', () => {
  function build(rows: Partial<UserNotificationEntity>[] = []) {
    const now = new Date();
    const store = rows.map(
      (row, i) =>
        ({
          id: row.id ?? `ntf-${i}`,
          userId: row.userId ?? 1,
          type: row.type ?? 'event-rejected',
          title: row.title ?? 'Title',
          body: row.body ?? 'Body',
          meta: row.meta ?? { eventId: 'evt-1' },
          readAt: row.readAt ?? null,
          createdAt: row.createdAt ?? now,
          updatedAt: row.updatedAt ?? now,
        }) as UserNotificationEntity,
    );

    const notificationRepository = {
      find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        store.filter((row) => {
          if (where.userId != null && row.userId !== where.userId) return false;
          if (where.readAt === null && row.readAt) return false;
          return true;
        }),
      ),
      findOne: jest.fn(
        async ({ where }: { where: { id: string; userId: number } }) =>
          store.find(
            (row) => row.id === where.id && row.userId === where.userId,
          ) ?? null,
      ),
      create: jest.fn((x) => x),
      save: jest.fn(async (row: UserNotificationEntity | UserNotificationEntity[]) => {
        const list = Array.isArray(row) ? row : [row];
        const saved = list.map((item) => {
          const existing = store.find((r) => r.id === item.id);
          const next = {
            ...(existing ?? {}),
            ...item,
            createdAt: item.createdAt ?? existing?.createdAt ?? now,
            updatedAt: now,
          } as UserNotificationEntity;
          if (existing) {
            Object.assign(existing, next);
          } else {
            store.push(next);
          }
          return next;
        });
        return Array.isArray(row) ? saved : saved[0];
      }),
    };

    const service = new NotificationsService(notificationRepository as any);
    return { service, store, notificationRepository };
  }

  it('creates a notification for a user', async () => {
    const { service, store } = build();
    const created = await service.create({
      userId: 7,
      type: 'event-published',
      title: 'Approved',
      body: 'Live now',
      meta: { eventId: 'evt-9' },
    });
    expect(created.type).toBe('event-published');
    expect(created.readAt).toBeNull();
    expect(store).toHaveLength(1);
    expect(store[0].userId).toBe(7);
  });

  it('lists newest first and reports unread count', async () => {
    const older = new Date('2026-01-01T00:00:00Z');
    const newer = new Date('2026-02-01T00:00:00Z');
    const { service, notificationRepository } = build([
      {
        id: 'ntf-old',
        userId: 1,
        createdAt: older,
        readAt: new Date(),
      },
      { id: 'ntf-new', userId: 1, createdAt: newer, readAt: null },
      { id: 'ntf-other', userId: 2, createdAt: newer },
    ]);
    notificationRepository.find.mockImplementation(async () => {
      return [
        {
          id: 'ntf-new',
          userId: 1,
          type: 'event-published',
          title: 'Title',
          body: 'Body',
          meta: null,
          readAt: null,
          createdAt: newer,
          updatedAt: newer,
        },
        {
          id: 'ntf-old',
          userId: 1,
          type: 'event-rejected',
          title: 'Title',
          body: 'Body',
          meta: null,
          readAt: older,
          createdAt: older,
          updatedAt: older,
        },
      ] as UserNotificationEntity[];
    });
    const result = await service.list(1);
    expect(result.data).toHaveLength(2);
    expect(result.unreadCount).toBe(1);
    expect(result.data[0].id).toBe('ntf-new');
  });

  it('marks one notification read and ignores missing ids', async () => {
    const { service } = build([
      { id: 'ntf-1', userId: 1, readAt: null },
    ]);
    const read = await service.markRead(1, 'ntf-1');
    expect(read.readAt).toBeTruthy();
    await expect(service.markRead(1, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marks all unread notifications for that user', async () => {
    const { service, store } = build([
      { id: 'ntf-1', userId: 1, readAt: null },
      { id: 'ntf-2', userId: 1, readAt: null },
      { id: 'ntf-3', userId: 2, readAt: null },
    ]);
    const result = await service.markAllRead(1);
    expect(store.find((row) => row.id === 'ntf-1')?.readAt).toBeTruthy();
    expect(store.find((row) => row.id === 'ntf-2')?.readAt).toBeTruthy();
    expect(store.find((row) => row.id === 'ntf-3')?.readAt).toBeNull();
    expect(result.unreadCount).toBe(0);
  });
});
