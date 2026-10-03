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

    const existing = await this.menuRepository.find();
    const byPetpoojaId = new Map(
      existing
        .filter((row) => row.petpoojaItemId)
        .map((row) => [row.petpoojaItemId as string, row]),
    );
    const byName = new Map(
      existing.map((row) => [row.name.trim().toLowerCase(), row]),
    );

    for (const item of mappedItems) {
      const named = byName.get(item.name.trim().toLowerCase());
      const alreadyMapped = byPetpoojaId.get(item.petpoojaItemId);

      if (named && alreadyMapped && named.id !== alreadyMapped.id) {
        alreadyMapped.petpoojaItemId = null;
        alreadyMapped.inStock = false;
        await this.menuRepository.save(alreadyMapped);
        byPetpoojaId.delete(item.petpoojaItemId);
      }

      const target = named ?? alreadyMapped;
      if (target) {
        target.petpoojaItemId = item.petpoojaItemId;
        target.description = item.description;
        target.shortLabel = item.shortLabel;
        target.category = item.category;
        target.basePrice = item.basePrice;
        target.variants = item.variants;
        target.extras = item.extras;
        target.isCustomizable = item.isCustomizable;
        target.inStock = item.inStock;
        await this.menuRepository.save(target);
        byPetpoojaId.set(item.petpoojaItemId, target);
        byName.set(target.name.trim().toLowerCase(), target);
        continue;
      }

      const created = await this.menuRepository.save(
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
          stockQty: 100,
        }),
      );
      byPetpoojaId.set(item.petpoojaItemId, created);
      byName.set(created.name.trim().toLowerCase(), created);
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
