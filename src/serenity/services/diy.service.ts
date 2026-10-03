import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import {
  DIY_CATALOG_STEPS,
  DIY_DEFAULT_MENU_ITEM_ID,
  DiyCatalogItemSeed,
  DiyStepKey,
} from '../data/diy-catalog.data';

export type DiyQuoteInput = {
  base?: string;
  protein?: string;
  fibre?: string;
};

const DIY_ASSET_DIR = join(
  process.cwd(),
  '../serenity-mobile/assets/images/diy',
);

@Injectable()
export class DiyService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
  ) {}

  async getCatalog(assetBaseUrl: string) {
    const bowlItem = await this.resolveBowl();
    const assetUrl = (imageKey: string) =>
      `${assetBaseUrl}/${imageKey}.png`;

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
        heroImage: assetUrl(step.heroKey),
        heroSelectedImage: assetUrl(step.heroSelectedKey),
        items: step.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          imageKey: item.imageKey,
          image: assetUrl(item.imageKey),
          priceDelta: item.priceDelta ?? 0,
        })),
      })),
    };
  }

  async quote(input: DiyQuoteInput) {
    const bowlItem = await this.resolveBowl();
    const basePrice = bowlItem?.basePrice ?? 399;
    const selected = (['base', 'protein', 'fibre'] as DiyStepKey[])
      .map((key) => {
        const optionId = input[key]?.trim();
        if (!optionId) return null;
        const option = this.findOption(key, optionId);
        if (!option) {
          throw new BadRequestException({
            message: `Invalid DIY ${key} selection: ${optionId}`,
            code: 'DIY_SELECTION_INVALID',
          });
        }
        return option;
      })
      .filter((option): option is DiyCatalogItemSeed => Boolean(option));

    const unitPrice =
      basePrice +
      selected.reduce((sum, option) => sum + (option.priceDelta ?? 0), 0);

    return {
      menuItemId: bowlItem?.id ?? DIY_DEFAULT_MENU_ITEM_ID,
      unitPrice,
      detail: selected.map((option) => option.name).join(' / '),
      ingredients: selected.map((option) => option.name),
    };
  }

  resolveAssetPath(fileName: string): string {
    if (!this.allowedAssetNames().has(fileName)) {
      throw new NotFoundException('DIY asset not found');
    }
    const filePath = join(DIY_ASSET_DIR, fileName);
    if (!existsSync(filePath)) {
      throw new NotFoundException('DIY asset not found');
    }
    return filePath;
  }

  private allowedAssetNames(): Set<string> {
    const names = new Set<string>();
    for (const step of DIY_CATALOG_STEPS) {
      names.add(`${step.heroKey}.png`);
      names.add(`${step.heroSelectedKey}.png`);
      for (const item of step.items) {
        names.add(`${item.imageKey}.png`);
      }
    }
    return names;
  }

  private findOption(
    key: DiyStepKey,
    optionId: string,
  ): DiyCatalogItemSeed | undefined {
    return DIY_CATALOG_STEPS.find((step) => step.key === key)?.items.find(
      (item) => item.id === optionId,
    );
  }

  private async resolveBowl() {
    return (
      (await this.menuRepository.findOne({
        where: { isCustomizable: true },
      })) ??
      (await this.menuRepository.findOne({
        where: { id: DIY_DEFAULT_MENU_ITEM_ID },
      }))
    );
  }
}
