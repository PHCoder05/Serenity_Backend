import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import {
  DIY_CATALOG_STEPS,
  DIY_DEFAULT_MENU_ITEM_ID,
} from '../data/diy-catalog.data';

@Injectable()
export class DiyService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
  ) {}

  async getCatalog() {
    const bowlItem =
      (await this.menuRepository.findOne({
        where: { isCustomizable: true },
      })) ??
      (await this.menuRepository.findOne({
        where: { id: DIY_DEFAULT_MENU_ITEM_ID },
      }));

    return {
      bowl: {
        menuItemId: bowlItem?.id ?? DIY_DEFAULT_MENU_ITEM_ID,
        name: bowlItem?.name ?? 'DIY Bowl',
        basePrice: bowlItem?.basePrice ?? 399,
        image:
          bowlItem?.image ??
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
      },
      steps: DIY_CATALOG_STEPS.map((step) => ({
        key: step.key,
        title: step.title,
        heroKey: step.heroKey,
        heroSelectedKey: step.heroSelectedKey,
        items: step.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          imageKey: item.imageKey,
          priceDelta: item.priceDelta ?? 0,
        })),
      })),
    };
  }
}
