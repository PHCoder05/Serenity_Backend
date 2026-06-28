import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedBowlEntity } from '../infrastructure/persistence/relational/entities/saved-bowl.entity';
import { toSavedBowlDto, toSavedBowlListItemDto } from '../mappers';
import { UpsertSavedBowlDto } from '../dto/serenity.dto';

@Injectable()
export class SavedBowlsService {
  constructor(
    @InjectRepository(SavedBowlEntity)
    private readonly savedBowlRepository: Repository<SavedBowlEntity>,
  ) {}

  async findAll(userId: number) {
    const bowls = await this.savedBowlRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    return {
      data: bowls.map(toSavedBowlDto),
      list: bowls.map(toSavedBowlListItemDto),
    };
  }

  async findOne(userId: number, id: string) {
    const bowl = await this.savedBowlRepository.findOne({
      where: { id, userId },
    });

    if (!bowl) {
      throw new NotFoundException('Saved bowl not found');
    }

    return toSavedBowlDto(bowl);
  }

  async create(userId: number, dto: UpsertSavedBowlDto) {
    const entity = this.savedBowlRepository.create({
      ...this.mapPayload(dto),
      id: `sb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
    });
    const saved = await this.savedBowlRepository.save(entity);
    return toSavedBowlDto(saved);
  }

  async update(userId: number, id: string, dto: UpsertSavedBowlDto) {
    const bowl = await this.savedBowlRepository.findOne({
      where: { id, userId },
    });
    if (!bowl) {
      throw new NotFoundException('Saved bowl not found');
    }

    Object.assign(bowl, this.mapPayload(dto));
    const saved = await this.savedBowlRepository.save(bowl);
    return toSavedBowlDto(saved);
  }

  async remove(userId: number, id: string) {
    const result = await this.savedBowlRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Saved bowl not found');
    }
    return { success: true };
  }

  private mapPayload(dto: UpsertSavedBowlDto) {
    return {
      title: dto.title,
      note: dto.note ?? '',
      description: dto.description,
      price: dto.price,
      image: dto.image,
      ingredients: dto.ingredients,
      addons: dto.addons,
      savedNote: dto.savedNote ?? '',
      subtitle: dto.subtitle ?? null,
    };
  }
}
