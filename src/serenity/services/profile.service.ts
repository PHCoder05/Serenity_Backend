import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { DietPreferenceEntity } from '../infrastructure/persistence/relational/entities/diet-preference.entity';
import { UserProfileEntity } from '../infrastructure/persistence/relational/entities/user-profile.entity';
import {
  UpdateDietPreferencesDto,
  UpdateProfileDto,
} from '../dto/serenity.dto';
import { findCampusLocation } from '../campus-locations';

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
      dateOfBirth: formatDateOfBirth(profile.dateOfBirth),
      dietPreferenceIds: profile.dietPreferenceIds,
      pushEnabled: profile.pushEnabled !== false,
      emailEnabled: profile.emailEnabled === true,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let userChanged = false;
    if (dto.fullName) {
      const [firstName, ...rest] = dto.fullName.trim().split(/\s+/);
      user.firstName = firstName ?? user.firstName;
      user.lastName = rest.join(' ') || user.lastName;
      userChanged = true;
    }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const current = (user.email ?? '').trim().toLowerCase();
      if (email !== current) {
        throw new BadRequestException({
          message:
            'Open the confirmation link we send before this email can be used to sign in.',
          code: 'EMAIL_CHANGE_REQUIRES_CONFIRMATION',
        });
      }
    }
    if (userChanged) {
      await this.userRepository.save(user);
    }

    const profile = await this.ensureProfile(userId);
    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.defaultAddress !== undefined) {
      const trimmed = dto.defaultAddress.trim();
      if (!trimmed) {
        profile.defaultAddress = '';
      } else {
        const location = findCampusLocation(trimmed);
        if (!location) {
          throw new BadRequestException({
            message: 'Pick a MIT ADT campus location',
            code: 'CAMPUS_LOCATION_REQUIRED',
          });
        }
        profile.defaultAddress = location.label;
      }
    }
    if (dto.pushEnabled !== undefined) profile.pushEnabled = dto.pushEnabled;
    if (dto.emailEnabled !== undefined) profile.emailEnabled = dto.emailEnabled;
    if (dto.dateOfBirth !== undefined) {
      profile.dateOfBirth = dto.dateOfBirth?.trim() || null;
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
          savedEventIds: [],
          pushEnabled: true,
          emailEnabled: false,
        }),
      );
    }
    return profile;
  }
}

function formatDateOfBirth(value: string | Date | null | undefined) {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}
