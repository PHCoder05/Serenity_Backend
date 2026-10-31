import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AllConfigType } from '../../config/config.type';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { UserProfileEntity } from '../infrastructure/persistence/relational/entities/user-profile.entity';
import { getMenuMeta, toMenuItemDto } from '../mappers';
import { tagsForMenuItem } from '../mappers/menu-tags';
import { selectMenuForOutlet } from '../menu-outlet';
import { ContentService } from './content.service';

function matchesDiet(item: MenuItemEntity, selectedIds: string[]) {
  const tags = tagsForMenuItem(item);
  return selectedIds.every((id) => tags.dietPreferenceIds.includes(id));
}

function searchNeedle(raw: string | undefined): string | null {
  const trimmed = raw?.trim().toLowerCase() ?? '';
  if (!trimmed) {
    return null;
  }
  const escaped = trimmed.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository: Repository<UserProfileEntity>,
    private readonly contentService: ContentService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async findAll(query: {
    category?: string;
    mood?: string;
    q?: string;
    inStock?: boolean;
    outletId?: string;
  }) {
    const qb = this.menuRepository
      .createQueryBuilder('item')
      .orderBy('item.name', 'ASC');
    if (query.category) {
      qb.andWhere('item.category = :category', { category: query.category });
    }
    if (query.inStock === true) {
      qb.andWhere('item.inStock = true');
    }
    if (query.mood) {
      qb.andWhere('item.moods @> CAST(:mood AS jsonb)', {
        mood: JSON.stringify([query.mood]),
      });
    }
    const needle = searchNeedle(query.q);
    if (needle) {
      qb.andWhere(
        `(LOWER(item.name) LIKE :needle ESCAPE '\\' OR LOWER(item."shortLabel") LIKE :needle ESCAPE '\\' OR LOWER(item.description) LIKE :needle ESCAPE '\\')`,
        { needle },
      );
    }

    const items = selectMenuForOutlet(await qb.getMany(), query.outletId);

    const store = await this.getStoreMeta();
    const homeMoods = await this.contentService.listMoods(false);

    return {
      items: items.map(toMenuItemDto),
      ...getMenuMeta(),
      homeMoods: homeMoods.map((mood) => ({
        id: mood.id,
        label: mood.label,
        body: mood.body,
      })),
      meta: store,
    };
  }

  async findOne(id: string, outletId?: string) {
    const item = await this.menuRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    if (outletId?.trim()) {
      const visible = selectMenuForOutlet(
        await this.menuRepository.find(),
        outletId,
      );
      if (!visible.some((row) => row.id === item.id)) {
        throw new NotFoundException('Menu item not found');
      }
    }
    return toMenuItemDto(item);
  }

  async getHome(userId?: number, outletId?: string) {
    const allItems = selectMenuForOutlet(
      await this.menuRepository.find(),
      outletId,
    );
    const byId = new Map(allItems.map((item) => [item.id, item]));
    const useLive = await this.shouldUseLiveMenu(allItems);

    let recentIds: string[] = [];
    if (userId) {
      const orders = await this.orderRepository.find({
        where: { userId },
        order: { orderedAt: 'DESC' },
        take: 4,
      });
      if (orders.length) {
        const fromOrders = orders
          .flatMap((order) =>
            (order.lineItems ?? [])
              .map((line) => line.menuItemId)
              .filter((id): id is string => Boolean(id)),
          )
          .slice(0, 4);
        if (fromOrders.length) {
          recentIds = fromOrders;
        } else {
          recentIds = orders
            .map((order) => order.itemSummary.split(' ')[0]?.toLowerCase())
            .filter((id): id is string => Boolean(id));
        }
      }
    }

    const recentOrders = recentIds
      .map((id) => byId.get(id))
      .filter((item): item is MenuItemEntity => Boolean(item))
      .map(toMenuItemDto);

    const featuredIds = await this.contentService.getFeaturedMenuItemIds();
    const featured = featuredIds
      .map((id) => byId.get(id))
      .filter((item): item is MenuItemEntity => Boolean(item))
      .map(toMenuItemDto);

    const dietPreferenceIds = userId
      ? ((
          await this.profileRepository.findOne({
            where: { userId },
          })
        )?.dietPreferenceIds ?? [])
      : [];
    const inStockItems = allItems.filter((item) => item.inStock);
    const matchingRecommendations = (
      dietPreferenceIds.length
        ? inStockItems.filter((item) => matchesDiet(item, dietPreferenceIds))
        : inStockItems
    ).slice(0, 4);
    const recommendations = matchingRecommendations.map(toMenuItemDto);

    const mealItems = allItems
      .filter((item) => item.category === 'Meals')
      .slice(0, 4)
      .map(toMenuItemDto);

    return {
      recentOrders,
      featured,
      recommendations,
      mealItems:
        mealItems.length > 0
          ? mealItems
          : allItems
              .filter((item) => item.category === 'Meals')
              .slice(0, 4)
              .map(toMenuItemDto),
      moods: (await this.contentService.listMoods(false)).map((mood) => ({
        id: mood.id,
        label: mood.label,
        body: mood.body,
      })),
      banners: await this.contentService.getActiveBanners(),
      menuSource: useLive ? 'petpooja' : 'seed',
    };
  }

  private async shouldUseLiveMenu(
    allItems: MenuItemEntity[],
  ): Promise<boolean> {
    const mode =
      this.configService.get('serenity.menuSource', { infer: true }) ?? 'auto';
    if (mode === 'seed') {
      return false;
    }
    if (mode === 'petpooja') {
      return true;
    }
    const liveCount =
      allItems.filter((item) => Boolean(item.petpoojaItemId)).length ||
      (await this.menuRepository.count({
        where: { petpoojaItemId: Not(IsNull()) },
      }));
    return liveCount > 0;
  }

  private async getStoreMeta() {
    const store =
      (await this.storeRepository.findOne({ where: { id: 1 } })) ??
      this.storeRepository.create({ id: 1, isOpen: true });

    return {
      restaurantId: 'serenity-1',
      lastSyncedAt: new Date().toISOString(),
      storeOpen: store.isOpen,
      message: store.message,
    };
  }
}
