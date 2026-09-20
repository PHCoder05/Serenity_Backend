import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { DietPreferenceEntity } from '../infrastructure/persistence/relational/entities/diet-preference.entity';
import { UserProfileEntity } from '../infrastructure/persistence/relational/entities/user-profile.entity';
import {
  UpdateDietPreferencesDto,
  UpdateProfileDto,
} from '../dto/serenity.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository: Repository<UserProfileEntity>,
    @InjectRepository(DietPreferenceEntity)
    private readonly dietRepository: Repository<DietPreferenceEntity>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.ensureProfile(userId);

    return {
      fullName: [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim(),
      email: user.email ?? '',
      phone: profile.phone ?? '',
      defaultAddress: profile.defaultAddress ?? '',
      dietPreferenceIds: profile.dietPreferenceIds,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.fullName) {
      const [firstName, ...rest] = dto.fullName.trim().split(/\s+/);
      user.firstName = firstName ?? user.firstName;
      user.lastName = rest.join(' ') || user.lastName;
      await this.userRepository.save(user);
    }

    const profile = await this.ensureProfile(userId);
    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.defaultAddress !== undefined) {
      profile.defaultAddress = dto.defaultAddress;
    }
    await this.profileRepository.save(profile);

    return this.getProfile(userId);
  }

  async getDietPreferences(userId: number) {
    const profile = await this.ensureProfile(userId);
    const options = await this.dietRepository.find({ order: { id: 'ASC' } });

    return {
      options: options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
      })),
      selectedIds: profile.dietPreferenceIds,
    };
  }

  async updateDietPreferences(userId: number, dto: UpdateDietPreferencesDto) {
    const profile = await this.ensureProfile(userId);
    profile.dietPreferenceIds = dto.selectedIds;
    await this.profileRepository.save(profile);
    return this.getDietPreferences(userId);
  }

  private async ensureProfile(userId: number) {
    let profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = await this.profileRepository.save(
        this.profileRepository.create({
          userId,
          dietPreferenceIds: [],
        }),
      );
    }
    return profile;
  }
}
