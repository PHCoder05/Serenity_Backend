import { BadRequestException } from '@nestjs/common';
import { DIY_CATALOG_STEPS, DiyStepKey } from '../data/diy-catalog.data';

export type DiySelections = {
  base: string;
  protein: string;
  fibre: string;
};

export type DiyOrderAddon = {
  id: string;
  name: string;
  price: number;
};

export type DiyPricedResult = {
  unitPrice: number;
  detail: string;
  ingredients: string[];
  addons: DiyOrderAddon[];
};

type PricedExtra = {
  id: string;
  label: string;
  price: number;
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

export function addonForDiyOption(
  option: { id: string; name: string; priceDelta?: number },
  extras?: PricedExtra[] | null,
): DiyOrderAddon {
  const extra = extras?.find(
    (entry) => normalizeLabel(entry.label) === normalizeLabel(option.name),
  );
  if (extra) {
    return { id: extra.id, name: extra.label, price: extra.price };
  }
  return {
    id: `a-${option.id}`,
    name: option.name,
    price: option.priceDelta ?? 0,
  };
}

export function priceDiyBowl(
  basePrice: number,
  selections: DiySelections,
  extras?: PricedExtra[] | null,
): DiyPricedResult {
  const resolved = (['base', 'protein', 'fibre'] as DiyStepKey[]).map((key) => {
    const step = DIY_CATALOG_STEPS.find((entry) => entry.key === key);
    const optionId = selections[key];
    const option = step?.items.find((item) => item.id === optionId);
    if (!option) {
      throw new BadRequestException({
        message: `Invalid DIY ${key} selection: ${optionId}`,
        code: 'DIY_SELECTION_INVALID',
      });
    }
    return option;
  });

  const addons = resolved.map((option) => addonForDiyOption(option, extras));

  return {
    unitPrice: basePrice + addons.reduce((sum, addon) => sum + addon.price, 0),
    detail: resolved.map((option) => option.name).join(' / '),
    ingredients: resolved.map((option) => option.name),
    addons,
  };
}
