import { tagsForMenuItem } from './menu-tags';

describe('tagsForMenuItem', () => {
  it('should return catalog tags for a known seed item', () => {
    expect(
      tagsForMenuItem({
        id: 'golden-lentil-bowl',
        name: 'Golden Lentil Bowl',
        description: 'Turmeric rice, roasted squash, herbs, and lemon tahini.',
      }),
    ).toEqual({
      dietaryTags: ['Vegan-friendly', 'High protein', 'Gluten-aware'],
      allergens: ['Sesame'],
      dietPreferenceIds: [
        'vegetarian',
        'vegan-light',
        'high-protein',
        'gluten-aware',
      ],
    });
  });

  it('should infer vegan-friendly tags for unknown dairy-free items', () => {
    const tags = tagsForMenuItem({
      id: 'new-greens-cup',
      name: 'Garden greens cup',
      description: 'Chickpea, citrus, and seed oil.',
    });

    expect(tags.dietaryTags).toContain('Vegan-friendly');
    expect(tags.dietPreferenceIds).toContain('vegan-light');
    expect(tags.allergens).toEqual([]);
  });
});
