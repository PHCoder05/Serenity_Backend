import { NullableType } from '../../../utils/types/nullable.type';

export type PetpoojaRestaurantRecord = {
  restId: string;
  name?: string | null;
  active?: string | null;
  storeStatus: string;
  turnOnTime?: string | null;
  closedReason?: string | null;
};

export type PetpoojaOrderRecord = {
  restId: string;
  orderId: string;
  clientOrderId?: string | null;
  status: string;
  orderInfo?: Record<string, unknown> | null;
  cancelReason?: string | null;
  minimumPrepTime?: number | null;
  riderName?: string | null;
  riderPhone?: string | null;
  isModified?: string | null;
};

export type PetpoojaItemStockRecord = {
  restId: string;
  itemId: string;
  type: string;
  inStock: boolean;
  autoTurnOnTime?: string | null;
  customTurnOnTime?: string | null;
};

export abstract class PetpoojaRepository {
  abstract upsertRestaurant(
    data: PetpoojaRestaurantRecord,
  ): Promise<PetpoojaRestaurantRecord>;

  abstract getRestaurant(
    restId: string,
  ): Promise<NullableType<PetpoojaRestaurantRecord>>;

  abstract saveMenuSnapshot(
    restId: string,
    payload: Record<string, unknown>,
    source: 'push' | 'fetch',
  ): Promise<void>;

  abstract upsertItemStock(records: PetpoojaItemStockRecord[]): Promise<void>;

  abstract upsertOrder(data: PetpoojaOrderRecord): Promise<PetpoojaOrderRecord>;
}
