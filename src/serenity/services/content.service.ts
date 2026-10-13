import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FEATURED_MENU_IDS,
  HOME_MOODS_SEED,
} from '../../database/seeds/relational/serenity/serenity-seed.data';
import { HomeMoodEntity } from '../infrastructure/persistence/relational/entities/home-mood.entity';
import {
  HomeBanner,
  HomeSettingsEntity,
} from '../infrastructure/persistence/relational/entities/home-settings.entity';
import { UpsertHomeMoodDto, UpsertHomeSettingsDto } from '../dto/serenity.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(HomeMoodEntity)
    private readonly moodRepository: Repository<HomeMoodEntity>,
    @InjectRepository(HomeSettingsEntity)
    private readonly settingsRepository: Repository<HomeSettingsEntity>,
  ) {}

  async listMoods(includeInactive = false) {
    const moods = await this.moodRepository.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    if (!moods.length) {
      return HOME_MOODS_SEED.map((mood, index) => ({
        id: mood.id,
        label: mood.label,
        body: mood.body,
        sortOrder: index + 1,
        isActive: true,
      }));
    }
    return moods
      .filter((mood) => includeInactive || mood.isActive)
      .map((mood) => this.toDto(mood));
  }

  async upsertMood(id: string, dto: UpsertHomeMoodDto) {
    let mood = await this.moodRepository.findOne({ where: { id } });
    if (!mood) {
      if (!dto.label || !dto.body) {
        throw new NotFoundException(
          'Mood not found; label and body required to create',
        );
      }
      mood = this.moodRepository.create({
        id,
        label: dto.label,
        body: dto.body,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      });
    } else {
      if (dto.label !== undefined) mood.label = dto.label;
      if (dto.body !== undefined) mood.body = dto.body;
      if (dto.sortOrder !== undefined) mood.sortOrder = dto.sortOrder;
      if (dto.isActive !== undefined) mood.isActive = dto.isActive;
    }
    await this.moodRepository.save(mood);
    return this.toDto(mood);
  }

  async getSettings() {
    const row = await this.ensureSettings();
    return this.toSettingsDto(row);
  }

  async getFeaturedMenuItemIds(): Promise<string[]> {
    const settings = await this.ensureSettings();
    if (settings.featuredMenuItemIds?.length) {
      return settings.featuredMenuItemIds;
    }
    return [...FEATURED_MENU_IDS];
  }

  async getActiveBanners(): Promise<HomeBanner[]> {
    const settings = await this.ensureSettings();
    return [...(settings.banners ?? [])]
      .filter((banner) => banner.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getDeliveryFeeInr(): Promise<number> {
    const settings = await this.ensureSettings();
    const fee = Number(settings.deliveryFeeInr);
    return Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0;
  }

  async upsertSettings(dto: UpsertHomeSettingsDto) {
    const row = await this.ensureSettings();
    if (dto.featuredMenuItemIds !== undefined) {
      row.featuredMenuItemIds = dto.featuredMenuItemIds
        .map((id) => id.trim())
        .filter(Boolean);
    }
    if (dto.banners !== undefined) {
      row.banners = dto.banners.map((banner, index) => ({
        id: banner.id.trim() || `banner-${index + 1}`,
        title: banner.title.trim(),
        body: banner.body?.trim() || undefined,
        image: banner.image?.trim() || undefined,
        href: banner.href?.trim() || undefined,
        isActive: banner.isActive !== false,
        sortOrder: banner.sortOrder ?? index,
      }));
    }
    if (dto.deliveryFeeInr !== undefined) {
      row.deliveryFeeInr = dto.deliveryFeeInr;
    }
    await this.settingsRepository.save(row);
    return this.toSettingsDto(row);
  }

  private async ensureSettings() {
    let row = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!row) {
      row = await this.settingsRepository.save(
        this.settingsRepository.create({
          id: 1,
          featuredMenuItemIds: [...FEATURED_MENU_IDS],
          banners: [],
          deliveryFeeInr: 0,
        }),
      );
    }
    return row;
  }

  private toSettingsDto(row: HomeSettingsEntity) {
    return {
      featuredMenuItemIds: row.featuredMenuItemIds?.length
        ? row.featuredMenuItemIds
        : [...FEATURED_MENU_IDS],
      banners: row.banners ?? [],
      deliveryFeeInr: row.deliveryFeeInr ?? 0,
    };
  }

  private toDto(mood: HomeMoodEntity) {
    return {
      id: mood.id,
      label: mood.label,
      body: mood.body,
      sortOrder: mood.sortOrder,
      isActive: mood.isActive,
    };
  }
}
