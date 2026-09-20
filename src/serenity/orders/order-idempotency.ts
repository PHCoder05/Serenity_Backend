import { createHash } from 'crypto';
import { CreateOrderDto } from '../dto/serenity.dto';

/** Stable fingerprint of create payload for idempotency conflict detection. */
export function fingerprintCreateOrder(dto: CreateOrderDto): string {
  const canonical = {
    items: (dto.items ?? []).map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      variantId: item.variantId ?? null,
      extraIds: [...(item.extraIds ?? [])].sort(),
      detail: item.detail ?? null,
      diySelections: item.diySelections
        ? {
            base: item.diySelections.base,
            protein: item.diySelections.protein,
            fibre: item.diySelections.fibre,
          }
        : null,
    })),
    couponCode: dto.couponCode?.trim().toUpperCase() ?? null,
    redeemPoints: dto.redeemPoints ?? null,
    paymentMethod: dto.paymentMethod,
    paymentIntentId: dto.paymentIntentId ?? null,
    deliveryAddress: dto.deliveryAddress,
    note: dto.note ?? '',
    outletId: dto.outletId ?? null,
    guestPhone: dto.guest?.phone ?? null,
  };

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function normalizeIdempotencyKey(raw?: string): string | null {
  const key = raw?.trim();
  if (!key) {
    return null;
  }
  return key.slice(0, 128);
}

export function clampPage(page?: number): number {
  const value = Number(page);
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

export function clampLimit(limit?: number, max = 50, fallback = 20): number {
  const value = Number(limit);
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.min(Math.floor(value), max);
}
