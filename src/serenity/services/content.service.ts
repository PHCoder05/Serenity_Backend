import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HOME_MOODS_SEED } from '../../database/seeds/relational/serenity/serenity-seed.data';
import { HomeMoodEntity } from '../infrastructure/persistence/relational/entities/home-mood.entity';
import { UpsertHomeMoodDto } from '../dto/serenity.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(HomeMoodEntity)
    private readonly moodRepository: Repository<HomeMoodEntity>,
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
