export type MenuItemTags = {
  dietaryTags: string[];
  allergens: string[];
  dietPreferenceIds: string[];
};

const CATALOG: Record<string, MenuItemTags> = {
  'golden-lentil-bowl': {
    dietaryTags: ['Vegan-friendly', 'High protein', 'Gluten-aware'],
    allergens: ['Sesame'],
    dietPreferenceIds: [
      'vegetarian',
      'vegan-light',
      'high-protein',
      'gluten-aware',
    ],
  },
  'garden-greens-bowl': {
    dietaryTags: ['Vegan-friendly', 'Gluten-aware'],
    allergens: [],
    dietPreferenceIds: ['vegetarian', 'vegan-light', 'gluten-aware'],
  },
  'miso-rice-bowl': {
    dietaryTags: ['Vegetarian', 'Mild spice'],
    allergens: ['Soy', 'Egg'],
    dietPreferenceIds: ['vegetarian', 'mild-spice'],
  },
  'roasted-plate': {
    dietaryTags: ['Vegetarian', 'Gluten-aware'],
    allergens: ['Dairy'],
    dietPreferenceIds: ['vegetarian', 'gluten-aware'],
  },
  'slow-lunch-plate': {
    dietaryTags: ['Vegetarian', 'High protein'],
    allergens: ['Wheat'],
    dietPreferenceIds: ['vegetarian', 'high-protein'],
  },
  'citrus-tea': {
    dietaryTags: ['Vegan-friendly', 'Gluten-aware', 'Mild spice'],
    allergens: [],
    dietPreferenceIds: [
      'vegetarian',
      'vegan-light',
      'gluten-aware',
      'mild-spice',
    ],
  },
  'warm-ginger-tea': {
    dietaryTags: ['Vegan-friendly', 'Gluten-aware', 'Mild spice'],
    allergens: [],
    dietPreferenceIds: [
      'vegetarian',
      'vegan-light',
      'gluten-aware',
      'mild-spice',
    ],
  },
  'seed-crackers': {
    dietaryTags: ['Vegetarian'],
    allergens: ['Dairy', 'Seeds'],
    dietPreferenceIds: ['vegetarian'],
  },
  'roasted-chickpeas': {
    dietaryTags: ['Vegan-friendly', 'High protein', 'Gluten-aware'],
    allergens: [],
    dietPreferenceIds: [
      'vegetarian',
      'vegan-light',
      'high-protein',
      'gluten-aware',
    ],
  },
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function inferTags(
  name: string,
  description: string,
  extras: Array<{ label: string }> = [],
): MenuItemTags {
  const hay = `${name} ${description} ${extras
    .map((extra) => extra.label)
    .join(' ')}`.toLowerCase();
  const dietaryTags = ['Vegetarian'];
  const dietPreferenceIds = ['vegetarian'];
  const allergens: string[] = [];

  const dairyOrEgg = /labneh|egg|paneer|honey|mayo|dairy/.test(hay);
  if (
    /vegan|lentil|greens|chickpea|citrus|ginger|tea/.test(hay) &&
    !dairyOrEgg
  ) {
    dietaryTags.push('Vegan-friendly');
    dietPreferenceIds.push('vegan-light');
  }
  if (!/wheat|sourdough|cracker|bread|noodle/.test(hay)) {
    dietaryTags.push('Gluten-aware');
    dietPreferenceIds.push('gluten-aware');
  }
  if (/lentil|chickpea|protein|egg/.test(hay)) {
    dietaryTags.push('High protein');
    dietPreferenceIds.push('high-protein');
  }
  if (/mild|ginger|citrus|mint|tea/.test(hay)) {
    dietaryTags.push('Mild spice');
    dietPreferenceIds.push('mild-spice');
  }
  if (/tahini|sesame/.test(hay)) allergens.push('Sesame');
  if (/soy|miso/.test(hay)) allergens.push('Soy');
  if (/egg/.test(hay)) allergens.push('Egg');
  if (/labneh|honey|dairy|paneer/.test(hay)) allergens.push('Dairy');
  if (/\bnut/.test(hay)) allergens.push('Nuts');

  return {
    dietaryTags: unique(dietaryTags),
    allergens: unique(allergens),
    dietPreferenceIds: unique(dietPreferenceIds),
  };
}

export function tagsForMenuItem(item: {
  id: string;
  name: string;
  description: string;
  extras?: Array<{ label: string }> | null;
}): MenuItemTags {
  return (
    CATALOG[item.id] ??
    inferTags(item.name, item.description, item.extras ?? undefined)
  );
}
