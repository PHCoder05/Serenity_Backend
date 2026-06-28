import { MenuItemEntity } from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import { SaveOrderDto } from '../dto/save-order.dto';

export type SerenityOrderLineInput = {
  menuItem: MenuItemEntity;
  quantity: number;
  unitPrice: number;
  variantId?: string;
  extraIds?: string[];
  detail?: string;
};

export type BuildPetpoojaOrderInput = {
  restId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  paymentMethod: 'UPI' | 'CARD' | 'COD';
  note?: string;
  items: SerenityOrderLineInput[];
  subtotal: number;
  gst: number;
  total: number;
  orderedAt: Date;
};

export function mapSerenityStatusFromPetpooja(status: string): string {
  switch (status) {
    case '-1':
      return 'cancelled';
    case '1':
      return 'accepted';
    case '2':
      return 'preparing';
    case '3':
      return 'dispatched';
    case '4':
    case '5':
      return 'delivered';
    default:
      return 'confirmed';
  }
}

export function buildPetpoojaSaveOrderPayload(
  input: BuildPetpoojaOrderInput,
): SaveOrderDto {
  const orderedAt = input.orderedAt;
  const date = formatDate(orderedAt);
  const time = formatTime(orderedAt);
  const createdOn = `${date} ${time}`;

  return {
    restID: input.restId,
    orderinfo: {
      Order: {
        details: {
          orderID: input.orderId,
          clientOrderID: input.orderId,
          preorder_date: date,
          preorder_time: time,
          service_charge: '0',
          sc_tax_amount: '0',
          delivery_charges: '0',
          order_type: 'H',
          payment_type: mapPaymentType(input.paymentMethod),
          created_on: createdOn,
          total: formatAmount(input.total),
          tax_total: formatAmount(input.gst),
          discount_total: '0',
          description: input.note ?? '',
        },
        Customer: {
          name: input.customerName || 'Serenity Guest',
          phone: input.customerPhone || '0000000000',
          address: input.deliveryAddress,
        },
        OrderItem: input.items.map((line) => mapOrderItem(line)),
      },
    },
  };
}

export function canPushOrderToPetpooja(
  items: SerenityOrderLineInput[],
): boolean {
  return (
    items.length > 0 &&
    items.every((line) => Boolean(line.menuItem.petpoojaItemId))
  );
}

function mapOrderItem(line: SerenityOrderLineInput) {
  const petpoojaItemId = line.menuItem.petpoojaItemId as string;
  const variant = line.menuItem.variants?.find(
    (entry) => entry.id === line.variantId,
  );
  const extras =
    line.menuItem.extras?.filter((extra) =>
      line.extraIds?.includes(extra.id),
    ) ?? [];

  return {
    id: petpoojaItemId,
    itemid: petpoojaItemId,
    name: line.menuItem.name,
    quantity: String(line.quantity),
    price: formatAmount(line.unitPrice),
    variation:
      variant && line.variantId
        ? [
            {
              variationid: stripPrefix(line.variantId, 'v-'),
              name: variant.label,
              price: formatAmount(variant.priceDelta),
            },
          ]
        : [],
    addon: extras.map((extra) => ({
      addonitemid: stripPrefix(extra.id, 'a-'),
      addonitem_name: extra.label,
      addonitem_price: formatAmount(extra.price),
    })),
    specialnotes: line.detail ?? '',
  };
}

function mapPaymentType(paymentMethod: 'UPI' | 'CARD' | 'COD'): string {
  return paymentMethod === 'COD' ? 'COD' : 'ONLINE';
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 19);
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
