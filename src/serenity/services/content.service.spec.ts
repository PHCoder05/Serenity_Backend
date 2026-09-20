import { ContentService } from './content.service';

describe('ContentService', () => {
  it('should falls back to seed moods when table empty', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const service = new ContentService(repo as any);
    const moods = await service.listMoods();
    expect(moods.length).toBeGreaterThan(0);
    expect(moods[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        label: expect.any(String),
      }),
    );
  });

  it('should upserts existing mood', async () => {
    const mood = {
      id: 'relax',
      label: 'Relax',
      body: 'old',
      sortOrder: 1,
      isActive: true,
    };
    const repo = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue(mood),
      create: jest.fn((x) => x),
      save: jest.fn((x) => x),
    };
    const service = new ContentService(repo as any);
    const updated = await service.upsertMood('relax', { body: 'new body' });
    expect(updated.body).toBe('new body');
  });
});
