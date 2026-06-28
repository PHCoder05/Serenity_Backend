import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import {
  FEATURED_MENU_IDS,
  RECENT_ORDER_MENU_IDS,
} from '../../database/seeds/relational/serenity/serenity-seed.data';
import { getMenuMeta, toMenuItemDto } from '../mappers';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
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

    return {
      items: filtered.map(toMenuItemDto),
      ...getMenuMeta(),
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

    let recentIds = [...RECENT_ORDER_MENU_IDS];
    if (userId) {
      const orders = await this.orderRepository.find({
        where: { userId },
        order: { orderedAt: 'DESC' },
        take: 4,
      });
      if (orders.length) {
        recentIds = orders
          .map((order) => order.itemSummary.split(' ')[0]?.toLowerCase())
          .filter(Boolean) as typeof recentIds;
      }
    }

    const recentOrders = recentIds
      .map((id) => byId.get(id))
      .filter((item): item is MenuItemEntity => Boolean(item))
      .map(toMenuItemDto);

    const featured = FEATURED_MENU_IDS.map((id) => byId.get(id))
      .filter((item): item is MenuItemEntity => Boolean(item))
      .map(toMenuItemDto);

    const recommendations = [...RECENT_ORDER_MENU_IDS]
      .map((id) => byId.get(id))
      .filter((item): item is MenuItemEntity => Boolean(item))
      .map(toMenuItemDto);

    const mealItems = allItems
      .filter((item) => item.category === 'Meals')
      .slice(0, 4)
      .map(toMenuItemDto);

    return {
      recentOrders,
      featured,
      recommendations,
      mealItems,
      moods: getMenuMeta().homeMoods,
    };
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
