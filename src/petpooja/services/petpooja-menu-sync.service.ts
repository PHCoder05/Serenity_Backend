import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AllConfigType } from '../../config/config.type';
import { MenuItemEntity } from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import {
  mapPetpoojaMenuPayload,
  PetpoojaMenuPayload,
} from '../mappers/petpooja-menu.mapper';

@Injectable()
export class PetpoojaMenuSyncService {
  private readonly logger = new Logger(PetpoojaMenuSyncService.name);

  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  isEnabled(): boolean {
    return (
      this.configService.get('petpooja.menuSyncEnabled', { infer: true }) ??
      true
    );
  }

  async syncFromPayload(payload: PetpoojaMenuPayload): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }
    const mappedItems = mapPetpoojaMenuPayload(payload);

    if (!mappedItems.length) {
      this.logger.warn(
        'PetPooja menu payload did not produce any mapped items',
      );
      return 0;
    }

    for (const item of mappedItems) {
      await this.menuRepository.save(
        this.menuRepository.create({
          id: item.id,
          petpoojaItemId: item.petpoojaItemId,
          name: item.name,
          description: item.description,
          shortLabel: item.shortLabel,
          image: item.image,
          category: item.category,
          basePrice: item.basePrice,
          moods: item.moods,
          variants: item.variants,
          extras: item.extras,
          isCustomizable: item.isCustomizable,
          inStock: item.inStock,
        }),
      );
    }

    this.logger.log(`Synced ${mappedItems.length} menu items from PetPooja`);
    return mappedItems.length;
  }

  async updateStockByPetpoojaIds(
    petpoojaItemIds: string[],
    inStock: boolean,
  ): Promise<number> {
    if (!petpoojaItemIds.length) {
      return 0;
    }

    const result = await this.menuRepository.update(
      { petpoojaItemId: In(petpoojaItemIds) },
      { inStock },
    );

    return result.affected ?? 0;
  }
}
