import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AllConfigType } from '../../config/config.type';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import {
  FEATURED_MENU_IDS,
  RECENT_ORDER_MENU_IDS,
} from '../../database/seeds/relational/serenity/serenity-seed.data';
import { getMenuMeta, toMenuItemDto } from '../mappers';
import { ContentService } from './content.service';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    private readonly contentService: ContentService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async findAll(query: {
    category?: string;
    mood?: string;
    q?: string;
    inStock?: boolean;
  }) {
    const items = await this.menuRepository.find({
      order: { name: 'ASC' },
    });

    const filtered = items.filter((item) => {
      if (query.category && item.category !== query.category) return false;
      if (query.mood && !item.moods.includes(query.mood)) return false;
      if (query.inStock === true && !item.inStock) return false;
      if (query.q) {
        const needle = query.q.toLowerCase();
        const haystack = [item.name, item.shortLabel, item.description]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const store = await this.getStoreMeta();
    const homeMoods = await this.contentService.listMoods(false);

    return {
      items: filtered.map(toMenuItemDto),
      ...getMenuMeta(),
      homeMoods: homeMoods.map((mood) => ({
        id: mood.id,
        label: mood.label,
        body: mood.body,
      })),
      meta: store,
    };
  }

  async findOne(id: string) {
    const item = await this.menuRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return toMenuItemDto(item);
  }

  async getHome(userId?: number) {
    const allItems = await this.menuRepository.find();
    const byId = new Map(allItems.map((item) => [item.id, item]));
    const useLive = await this.shouldUseLiveMenu(allItems);

    let recentIds: string[] = [...RECENT_ORDER_MENU_IDS];
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

    const livePool = allItems
      .filter((item) => item.petpoojaItemId && item.inStock)
      .slice(0, 8);

    const featured = useLive
      ? livePool.slice(0, 4).map(toMenuItemDto)
      : FEATURED_MENU_IDS.map((id) => byId.get(id))
          .filter((item): item is MenuItemEntity => Boolean(item))
          .map(toMenuItemDto);

    const recommendations = useLive
      ? livePool.slice(0, 4).map(toMenuItemDto)
      : [...RECENT_ORDER_MENU_IDS]
          .map((id) => byId.get(id))
          .filter((item): item is MenuItemEntity => Boolean(item))
          .map(toMenuItemDto);

    const mealItems = (
      useLive
        ? livePool.filter((item) => item.category === 'Meals').slice(0, 4)
        : allItems.filter((item) => item.category === 'Meals').slice(0, 4)
    ).map(toMenuItemDto);

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
