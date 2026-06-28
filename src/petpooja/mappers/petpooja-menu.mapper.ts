import {
  MenuExtraJson,
  MenuVariantJson,
} from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';

export type PetpoojaMenuPayload = Record<string, unknown>;

export type MappedPetpoojaMenuItem = {
  id: string;
  petpoojaItemId: string;
  name: string;
  description: string;
  shortLabel: string;
  image: string;
  category: string;
  basePrice: number;
  moods: string[];
  variants: MenuVariantJson[] | null;
  extras: MenuExtraJson[] | null;
  isCustomizable: boolean;
  inStock: boolean;
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';

const CATEGORY_IMAGES: Record<string, string> = {
  Bowls:
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
  Drinks:
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80',
  'Sides/Snacks':
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
  Meals:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
};

const CATEGORY_MOODS: Record<string, string[]> = {
  Bowls: ['Relax', 'Focus'],
  Meals: ['Refuel', 'Focus'],
  Drinks: ['Refresh'],
  'Sides/Snacks': ['Relax', 'Refresh'],
};

export function mapPetpoojaMenuPayload(
  payload: PetpoojaMenuPayload,
): MappedPetpoojaMenuItem[] {
  const restaurants = asArray(payload.restaurants);
  const mapped: MappedPetpoojaMenuItem[] = [];

  for (const restaurant of restaurants) {
    const categories = extractCategories(restaurant);

    for (const category of categories) {
      const categoryName =
        readString(category, ['categoryname', 'name']) ?? 'Meals';
      const serenityCategory = mapSerenityCategory(categoryName);
      const items = asArray(category.items);

      for (const item of items) {
        const mappedItem = mapItem(item, serenityCategory);
        if (mappedItem) {
          mapped.push(mappedItem);
        }
      }
    }
  }

  return mapped;
}

function extractCategories(restaurant: Record<string, unknown>) {
  const nested = asArray(restaurant.categories);
  if (nested.length) {
    return nested;
  }

  const flatItems = asArray(restaurant.items);
  if (!flatItems.length) {
    return [];
  }

  const byCategory = new Map<string, Record<string, unknown>>();

  for (const item of flatItems) {
    const categoryId =
      readString(item, ['item_categoryid', 'categoryid', 'category_id']) ??
      'uncategorized';
    const categoryName =
      readString(item, ['categoryname', 'category_name']) ?? 'Meals';

    if (!byCategory.has(categoryId)) {
      byCategory.set(categoryId, {
        categoryid: categoryId,
        categoryname: categoryName,
        items: [],
      });
    }

    asMutableArray(byCategory.get(categoryId)!, 'items').push(item);
  }

  return [...byCategory.values()];
}

function mapItem(
  rawItem: Record<string, unknown>,
  serenityCategory: string,
): MappedPetpoojaMenuItem | null {
  const petpoojaItemId = readString(rawItem, ['itemid', 'item_id', 'id']);
  const name = readString(rawItem, ['itemname', 'item_name', 'name']);

  if (!petpoojaItemId || !name) {
    return null;
  }

  if (isInactive(rawItem)) {
    return null;
  }

  const description =
    readString(rawItem, [
      'itemdescription',
      'item_description',
      'description',
    ]) ?? name;
  const basePrice = parsePrice(rawItem, ['price', 'itemprice', 'item_price']);
  const variants = mapVariants(rawItem);
  const extras = mapExtras(rawItem);
  const isCustomizable =
    variants.length > 0 ||
    extras.length > 0 ||
    readString(rawItem, ['itemallowvariation']) === '1';

  return {
    id: buildSerenityItemId(name, petpoojaItemId),
    petpoojaItemId,
    name,
    description,
    shortLabel: buildShortLabel(description, name),
    image: CATEGORY_IMAGES[serenityCategory] ?? DEFAULT_IMAGE,
    category: serenityCategory,
    basePrice,
    moods: CATEGORY_MOODS[serenityCategory] ?? ['Relax'],
    variants: variants.length ? variants : null,
    extras: extras.length ? extras : null,
    isCustomizable,
    inStock: true,
  };
}

function mapVariants(rawItem: Record<string, unknown>): MenuVariantJson[] {
  return asArray(rawItem.variation)
    .filter((entry) => !isInactive(entry))
    .map((entry, index) => {
      const label =
        readString(entry, ['name', 'variationname', 'variation_name']) ??
        `Option ${index + 1}`;
      const variationId =
        readString(entry, ['variationid', 'variation_id', 'id']) ??
        String(index + 1);

      return {
        id: `v-${variationId}`,
        label,
        priceDelta: parsePrice(entry, ['price', 'variationprice']),
      };
    });
}

function mapExtras(rawItem: Record<string, unknown>): MenuExtraJson[] {
  const extras: MenuExtraJson[] = [];

  for (const group of asArray(rawItem.addon)) {
    for (const addon of asArray(group.addonitem)) {
      if (isInactive(addon)) {
        continue;
      }

      const addonId =
        readString(addon, ['addonitemid', 'addonitem_id', 'id']) ??
        readString(addon, ['addonitem_name', 'name']);
      const label = readString(addon, ['addonitem_name', 'name']) ?? 'Extra';

      if (!addonId) {
        continue;
      }

      extras.push({
        id: `a-${addonId}`,
        label,
        price: parsePrice(addon, ['addonitem_price', 'price']),
      });
    }
  }

  return extras;
}

function mapSerenityCategory(categoryName: string): string {
  const normalized = categoryName.trim().toLowerCase();

  if (normalized.includes('bowl')) return 'Bowls';
  if (
    normalized.includes('drink') ||
    normalized.includes('beverage') ||
    normalized.includes('juice') ||
    normalized.includes('coffee')
  ) {
    return 'Drinks';
  }
  if (
    normalized.includes('snack') ||
    normalized.includes('side') ||
    normalized.includes('starter')
  ) {
    return 'Sides/Snacks';
  }
  if (normalized.includes('meal') || normalized.includes('main'))
    return 'Meals';

  return 'Meals';
}

function buildSerenityItemId(name: string, petpoojaItemId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug ? `${slug}-${petpoojaItemId}` : `pp-${petpoojaItemId}`;
}

function buildShortLabel(description: string, name: string): string {
  const trimmed = description.trim();
  if (!trimmed || trimmed === name) {
    return name.slice(0, 60);
  }

  const firstSentence = trimmed.split(/[.!?\n]/)[0]?.trim() ?? trimmed;
  return firstSentence.slice(0, 60);
}

function parsePrice(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const parsed = Number(String(value).replace(/,/g, ''));
    if (!Number.isNaN(parsed)) {
      return Math.round(parsed);
    }
  }

  return 0;
}

function isInactive(source: Record<string, unknown>): boolean {
  const active = readString(source, ['active', 'itemactive', 'is_active']);
  return active === '0' || active === 'false';
}

function readString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
  );
}

function asMutableArray(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const existing = source[key];
  if (!Array.isArray(existing)) {
    source[key] = [];
  }

  return source[key] as Record<string, unknown>[];
}
