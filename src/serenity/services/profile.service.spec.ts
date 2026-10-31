import { BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';

describe('ProfileService notification prefs', () => {
  function build() {
    const user = {
      id: 7,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    };
    const profile = {
      userId: 7,
      phone: '9876543210',
      defaultAddress: 'Campus',
      dietPreferenceIds: [],
      pushEnabled: true,
      emailEnabled: false,
      dateOfBirth: null,
    };
    const userRepository = {
      findOne: jest.fn(async (query?: { where?: { email?: string } }) => {
        if (query?.where?.email === 'other@example.com') {
          return { id: 99, email: query.where.email };
        }
        return user;
      }),
      save: jest.fn(async (row) => row),
    };
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(profile),
      save: jest.fn(async (row) => row),
      create: jest.fn((row) => row),
    };
    const dietRepository = { find: jest.fn().mockResolvedValue([]) };
    const service = new ProfileService(
      userRepository as any,
      profileRepository as any,
      dietRepository as any,
    );
    return { service, profile, profileRepository, userRepository };
  }

  it('should returns settings toggles on the profile', async () => {
    const { service } = build();
    await expect(service.getProfile(7)).resolves.toEqual(
      expect.objectContaining({
        pushEnabled: true,
        emailEnabled: false,
      }),
    );
  });

  it('should persists date of birth', async () => {
    const { service, profile, profileRepository } = build();
    await service.updateProfile(7, { dateOfBirth: '1998-04-26' });
    expect(profile.dateOfBirth).toBe('1998-04-26');
    expect(profileRepository.save).toHaveBeenCalled();
  });

  it('should stores a campus default address by id or label', async () => {
    const { service, profile } = build();
    await service.updateProfile(7, { defaultAddress: 'hostel-a' });
    expect(profile.defaultAddress).toBe('Hostel Block A');
  });

  it('should rejects a free-text default address', async () => {
    const { service } = build();
    await expect(
      service.updateProfile(7, { defaultAddress: 'My hostel room 12' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should leaves the login email unchanged', async () => {
    const { service, userRepository } = build();
    const saved = await service.updateProfile(7, {
      email: 'Ada@Example.com',
    });
    expect(saved.email).toBe('ada@example.com');
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should rejects a different email on the profile route', async () => {
    const { service, userRepository } = build();
    await expect(
      service.updateProfile(7, { email: 'other@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should persists notification toggles', async () => {
    const { service, profile, profileRepository } = build();
    await service.updateProfile(7, {
      pushEnabled: false,
      emailEnabled: true,
    });
    expect(profile.pushEnabled).toBe(false);
    expect(profile.emailEnabled).toBe(true);
    expect(profileRepository.save).toHaveBeenCalled();
  });
});
