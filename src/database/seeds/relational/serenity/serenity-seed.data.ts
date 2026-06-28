export const DEMO_USER_EMAIL = 'aarav@serenity.app';
export const DEMO_USER_PASSWORD = 'secret';

export const MOOD_COPY = {
  Relax: {
    subtitle: 'Lighter choices for a slower stretch of the day.',
    descriptor: 'Soft bowls and simple plates that settle in gently.',
  },
  Refuel: {
    subtitle: 'More grounding dishes when you need something sustaining.',
    descriptor: 'Warm grains, deeper textures, and a little more weight.',
  },
  Focus: {
    subtitle: 'Balanced combinations to keep the afternoon feeling clear.',
    descriptor: 'Clean flavors with enough substance to hold attention.',
  },
  Refresh: {
    subtitle: 'Brighter ingredients and cooler textures to reset the pace.',
    descriptor: 'Fresh pairings with herbs, citrus, and lift.',
  },
} as const;

export const CATEGORIES = ['Meals', 'Bowls', 'Drinks', 'Sides/Snacks'] as const;

export const MOODS = ['Relax', 'Refuel', 'Focus', 'Refresh'] as const;

export const MENU_ITEMS_SEED = [
  {
    id: 'golden-lentil-bowl',
    name: 'Golden Lentil Bowl',
    shortLabel: 'Turmeric rice and lemon tahini',
    description: 'Turmeric rice, roasted squash, herbs, and lemon tahini.',
    basePrice: 420,
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
    moods: ['Relax', 'Focus'],
    category: 'Bowls',
    variants: [
      { id: 'regular', label: 'Regular bowl', priceDelta: 0 },
      { id: 'hearty', label: 'Hearty bowl', priceDelta: 90 },
    ],
    extras: [
      { id: 'avocado', label: 'Avocado slices', price: 70 },
      { id: 'seed-crisp', label: 'Seed crisp', price: 40 },
    ],
    isCustomizable: true,
  },
  {
    id: 'garden-greens-bowl',
    name: 'Garden Greens Bowl',
    shortLabel: 'Greens, avocado, and citrus',
    description: 'Charred greens, avocado, citrus, and soft grains.',
    basePrice: 440,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    moods: ['Refresh', 'Focus'],
    category: 'Bowls',
    variants: [
      { id: 'regular', label: 'Regular bowl', priceDelta: 0 },
      { id: 'protein', label: 'With extra greens', priceDelta: 60 },
    ],
    extras: [
      { id: 'citrus-dressing', label: 'Extra citrus dressing', price: 25 },
      { id: 'toasted-seeds', label: 'Toasted seeds', price: 35 },
    ],
    isCustomizable: true,
  },
  {
    id: 'miso-rice-bowl',
    name: 'Miso Rice Bowl',
    shortLabel: 'Mushrooms and sesame greens',
    description:
      'Sticky rice, glazed mushrooms, sesame greens, and warm broth.',
    basePrice: 445,
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    moods: ['Relax', 'Refuel'],
    category: 'Bowls',
    variants: [
      { id: 'regular', label: 'Regular bowl', priceDelta: 0 },
      { id: 'brothy', label: 'With extra broth', priceDelta: 35 },
    ],
    extras: [
      { id: 'soft-egg', label: 'Soft egg', price: 45 },
      { id: 'kimchi', label: 'Mild kimchi', price: 30 },
    ],
    isCustomizable: true,
  },
  {
    id: 'roasted-plate',
    name: 'Roasted Harvest Plate',
    shortLabel: 'Vegetables, hummus, and grains',
    description: 'Roasted vegetables, hummus, grains, and a quiet green salad.',
    basePrice: 490,
    image:
      'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=1200&q=80',
    moods: ['Relax', 'Refuel'],
    category: 'Meals',
    variants: [
      { id: 'plate', label: 'Standard plate', priceDelta: 0 },
      { id: 'slow-lunch', label: 'Slow lunch portion', priceDelta: 110 },
    ],
    extras: [{ id: 'labneh', label: 'Whipped labneh', price: 55 }],
    isCustomizable: true,
  },
  {
    id: 'slow-lunch-plate',
    name: 'Slow Lunch Plate',
    shortLabel: 'Balanced midday plate',
    description:
      'A balanced midday plate with grains, greens, and warm vegetables.',
    basePrice: 510,
    image:
      'https://images.unsplash.com/photo-1511690078903-71dc5a49f5e3?auto=format&fit=crop&w=1200&q=80',
    moods: ['Focus', 'Refuel'],
    category: 'Meals',
    variants: [
      { id: 'balanced', label: 'Balanced portion', priceDelta: 0 },
      { id: 'shared', label: 'Shared plate', priceDelta: 160 },
    ],
    extras: [
      { id: 'green-salad', label: 'Side green salad', price: 60 },
      { id: 'sourdough', label: 'Warm sourdough', price: 45 },
    ],
    isCustomizable: true,
  },
  {
    id: 'citrus-tea',
    name: 'Citrus Mint Tea',
    shortLabel: 'Iced, bright, and clean',
    description: 'A bright iced tea with mint, orange, and a clean finish.',
    basePrice: 180,
    image:
      'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=1200&q=80',
    moods: ['Refresh', 'Focus'],
    category: 'Drinks',
    variants: [
      { id: 'single', label: 'Single serve', priceDelta: 0 },
      { id: 'carafe', label: 'Table carafe', priceDelta: 160 },
    ],
    isCustomizable: true,
  },
  {
    id: 'warm-ginger-tea',
    name: 'Warm Ginger Tea',
    shortLabel: 'Soft spice and gentle heat',
    description: 'Soft spice, gentle heat, and a slower cup for evenings.',
    basePrice: 160,
    image:
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80',
    moods: ['Relax'],
    category: 'Drinks',
    extras: [{ id: 'honey', label: 'Wild honey', price: 20 }],
    isCustomizable: true,
  },
  {
    id: 'seed-crackers',
    name: 'Seeded Crackers',
    shortLabel: 'Crisp with whipped labneh',
    description: 'Crisp crackers with whipped labneh and herbs.',
    basePrice: 210,
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    moods: ['Refresh', 'Focus'],
    category: 'Sides/Snacks',
    extras: [{ id: 'herb-oil', label: 'Herb oil', price: 25 }],
    isCustomizable: true,
  },
  {
    id: 'roasted-chickpeas',
    name: 'Roasted Chickpeas',
    shortLabel: 'Warm spices and olive oil',
    description: 'Warm spices, olive oil, and a grounding salty bite.',
    basePrice: 190,
    image:
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
    moods: ['Refuel', 'Relax'],
    category: 'Sides/Snacks',
    isCustomizable: false,
  },
] as const;

export const DIET_PREFERENCES_SEED = [
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    description: 'Prefer bowls and plates built around vegetables and grains.',
  },
  {
    id: 'vegan-light',
    label: 'Vegan-friendly',
    description: 'Surface gentler dairy-free options first when available.',
  },
  {
    id: 'gluten-aware',
    label: 'Gluten-aware',
    description: 'Keep an eye on wheat-based ingredients and simpler swaps.',
  },
  {
    id: 'mild-spice',
    label: 'Mild spice',
    description: 'Favor softer heat and calmer seasoning profiles.',
  },
  {
    id: 'high-protein',
    label: 'Higher protein',
    description: 'Lean toward bowls that feel a little more sustaining.',
  },
] as const;

export const HOME_MOODS_SEED = [
  {
    id: 'refresh',
    label: 'Refresh',
    body: 'Brighter ingredients and cooler textures to reset the pace.',
  },
  {
    id: 'refuel',
    label: 'Refuel',
    body: 'Warm grains, steady energy, and a little more substance for the afternoon.',
  },
  {
    id: 'relax',
    label: 'Relax',
    body: 'Soft textures and gentler flavors built for a slower, quieter kind of meal.',
  },
  {
    id: 'focus',
    label: 'Focus',
    body: 'Clean bowls and lighter sips that stay crisp without feeling sharp or rushed.',
  },
] as const;

export const RECENT_ORDER_MENU_IDS = [
  'miso-rice-bowl',
  'slow-lunch-plate',
  'citrus-tea',
  'seed-crackers',
] as const;

export const FEATURED_MENU_IDS = [
  'golden-lentil-bowl',
  'garden-greens-bowl',
] as const;
