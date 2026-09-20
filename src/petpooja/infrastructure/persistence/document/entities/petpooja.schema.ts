import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, now } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type PetpoojaRestaurantDocument =
  HydratedDocument<PetpoojaRestaurantSchemaClass>;

@Schema({
  timestamps: true,
  collection: 'petpooja_restaurants',
})
export class PetpoojaRestaurantSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, required: true, unique: true })
  restId: string;

  @Prop({ type: String, default: null })
  name?: string | null;

  @Prop({ type: String, default: null })
  active?: string | null;

  @Prop({ type: String, default: '1' })
  storeStatus: string;

  @Prop({ type: String, default: null })
  turnOnTime?: string | null;

  @Prop({ type: String, default: null })
  closedReason?: string | null;
}

export const PetpoojaRestaurantSchema = SchemaFactory.createForClass(
  PetpoojaRestaurantSchemaClass,
);

export type PetpoojaMenuSnapshotDocument =
  HydratedDocument<PetpoojaMenuSnapshotSchemaClass>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'petpooja_menu_snapshots',
})
export class PetpoojaMenuSnapshotSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, required: true })
  restId: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ type: String, required: true })
  source: 'push' | 'fetch';

  @Prop({ default: now })
  createdAt: Date;
}

export const PetpoojaMenuSnapshotSchema = SchemaFactory.createForClass(
  PetpoojaMenuSnapshotSchemaClass,
);

export type PetpoojaMenuItemStockDocument =
  HydratedDocument<PetpoojaMenuItemStockSchemaClass>;

@Schema({
  timestamps: true,
  collection: 'petpooja_menu_item_stock',
})
export class PetpoojaMenuItemStockSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, required: true })
  restId: string;

  @Prop({ type: String, required: true })
  itemId: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Boolean, required: true })
  inStock: boolean;

  @Prop({ type: String, default: null })
  autoTurnOnTime?: string | null;

  @Prop({ type: String, default: null })
  customTurnOnTime?: string | null;
}

export const PetpoojaMenuItemStockSchema = SchemaFactory.createForClass(
  PetpoojaMenuItemStockSchemaClass,
);
PetpoojaMenuItemStockSchema.index(
  { restId: 1, itemId: 1, type: 1 },
  { unique: true },
);

export type PetpoojaOrderDocument = HydratedDocument<PetpoojaOrderSchemaClass>;

@Schema({
  timestamps: true,
  collection: 'petpooja_orders',
})
export class PetpoojaOrderSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, required: true })
  restId: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, default: null })
  clientOrderId?: string | null;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, default: null })
  orderInfo?: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  cancelReason?: string | null;

  @Prop({ type: Number, default: null })
  minimumPrepTime?: number | null;

  @Prop({ type: String, default: null })
  riderName?: string | null;

  @Prop({ type: String, default: null })
  riderPhone?: string | null;

  @Prop({ type: String, default: null })
  isModified?: string | null;
}

export const PetpoojaOrderSchema = SchemaFactory.createForClass(
  PetpoojaOrderSchemaClass,
);
PetpoojaOrderSchema.index({ restId: 1, orderId: 1 }, { unique: true });
