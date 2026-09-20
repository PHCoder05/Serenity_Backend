import { BadRequestException } from '@nestjs/common';
import { DIY_CATALOG_STEPS, DiyStepKey } from '../data/diy-catalog.data';

export type DiySelections = {
  base: string;
  protein: string;
  fibre: string;
};

export type DiyPricedResult = {
  unitPrice: number;
  detail: string;
  ingredients: string[];
};

export function priceDiyBowl(
  basePrice: number,
  selections: DiySelections,
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

  const unitPrice =
    basePrice +
    resolved.reduce((sum, option) => sum + (option.priceDelta ?? 0), 0);

  return {
    unitPrice,
    detail: resolved.map((option) => option.name).join(' / '),
    ingredients: resolved.map((option) => option.name),
  };
}
