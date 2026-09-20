import { MenuItemEntity } from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import { SaveOrderDto } from '../dto/save-order.dto';

export type PetpoojaTaxConfig = {
  cgstTaxId: string;
  sgstTaxId: string;
  cgstRate: number;
  sgstRate: number;
};

export type SerenityOrderLineInput = {
  menuItem: MenuItemEntity;
  quantity: number;
  unitPrice: number;
  variantId?: string;
  extraIds?: string[];
  detail?: string;
};

export type OrderDiscountInput = {
  title: string;
  amountInr: number;
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
  /** Absolute INR discounts (coupon/loyalty). Prefer over recomputed total. */
  discounts?: OrderDiscountInput[];
  orderedAt: Date;
  callbackUrl?: string;
  taxConfig?: PetpoojaTaxConfig;
};

const DEFAULT_TAX_CONFIG: PetpoojaTaxConfig = {
  cgstTaxId: '3661',
  sgstTaxId: '3662',
  cgstRate: 0.025,
  sgstRate: 0.025,
};

const STATUS_RANK: Record<string, number> = {
  confirmed: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  dispatched: 4,
  delivered: 5,
};

/**
 * PetPooja callback code → Serenity status.
 * Vendor: -1 cancel; 1/2/3 accepted-ish; 4 dispatch; 5 food ready; 10 delivered.
 */
export function mapSerenityStatusFromPetpooja(status: string): string | null {
  switch (String(status)) {
    case '-1':
      return 'cancelled';
    case '1':
      return 'accepted';
    case '2':
      return 'preparing';
    case '3':
      return 'preparing';
    case '4':
      return 'dispatched';
    case '5':
      return 'ready';
    case '10':
      return 'delivered';
    default:
      return null;
  }
}

/** Cancel always applies; otherwise only forward (or same) progression. */
export function isStatusProgression(from: string, to: string): boolean {
  if (to === 'cancelled') {
    return true;
  }
  if (from === 'cancelled') {
    return false;
  }
  const fromRank = STATUS_RANK[from] ?? -1;
  const toRank = STATUS_RANK[to] ?? -1;
  return toRank >= fromRank;
}

export function buildPetpoojaSaveOrderPayload(
  input: BuildPetpoojaOrderInput,
): SaveOrderDto {
  const orderedAt = input.orderedAt;
  const date = formatDate(orderedAt);
  const time = formatTime(orderedAt);
  const createdOn = `${date} ${time}`;
  const taxConfig = input.taxConfig ?? DEFAULT_TAX_CONFIG;

  const lineItems = input.items.map((line) => mapOrderItem(line, taxConfig));
  const orderTax = buildOrderTax(lineItems, taxConfig);
  const computedTaxTotal = orderTax.reduce(
    (sum, tax) => sum + Number(tax.tax),
    0,
  );
  const computedSubtotal = lineItems.reduce(
    (sum, item) => sum + Number(item.final_price) * Number(item.quantity),
    0,
  );

  const discountLines = (input.discounts ?? []).filter(
    (entry) => entry.amountInr > 0,
  );
  const discountTotal = discountLines.reduce(
    (sum, entry) => sum + entry.amountInr,
    0,
  );

  const taxTotal =
    Number.isFinite(input.gst) && input.gst >= 0 ? input.gst : computedTaxTotal;
  const orderTotal =
    Number.isFinite(input.total) && input.total >= 0
      ? input.total
      : Math.max(0, computedSubtotal + taxTotal - discountTotal);

  const orderInfo: Record<string, unknown> = {
    Restaurant: {
      details: {
        restID: input.restId,
      },
    },
    Customer: {
      details: {
        name: input.customerName || 'Serenity Guest',
        phone: normalizePhone(input.customerPhone),
        address: input.deliveryAddress,
      },
    },
    OrderItem: {
      details: lineItems,
    },
    Order: {
      details: {
        orderID: input.orderId,
        preorder_date: date,
        preorder_time: time,
        advanced_order: 'N',
        order_type: 'H',
        payment_type: mapPaymentType(input.paymentMethod),
        total: formatAmount(orderTotal),
        tax_total: formatAmount(taxTotal),
        discount_total: formatAmount(discountTotal),
        discount_type: discountTotal > 0 ? 'F' : '',
        service_charge: '0',
        sc_tax_amount: '0',
        delivery_charges: '0',
        dc_tax_percentage: '0',
        dc_tax_amount: '0',
        pc_tax_percentage: '0',
        pc_tax_amount: '0',
        enable_delivery: 1,
        created_on: createdOn,
        callback_url: input.callbackUrl ?? '',
        device_type: 'Web',
        description: input.note ?? '',
      },
    },
    Tax: {
      details: orderTax,
    },
  };

  if (discountLines.length) {
    orderInfo.Discount = {
      details: discountLines.map((entry, index) => ({
        id: `serenity-disc-${index + 1}`,
        title: entry.title,
        type: 'F',
        price: formatAmount(entry.amountInr),
      })),
    };
  }

  return {
    restID: input.restId,
    orderinfo: {
      OrderInfo: orderInfo,
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

/** Build PetPooja discount lines from Serenity signed discount fields. */
export function buildOrderDiscounts(
  order: {
    couponDiscount?: number | null;
    loyaltyDiscount?: number | null;
  },
  couponCode?: string | null,
): OrderDiscountInput[] {
  const discounts: OrderDiscountInput[] = [];
  const couponAbs = Math.abs(order.couponDiscount ?? 0);
  if (couponAbs > 0) {
    const code = couponCode?.trim();
    discounts.push({
      title: code ? `Coupon ${code.toUpperCase()}` : 'Coupon discount',
      amountInr: couponAbs,
    });
  }
  const loyaltyAbs = Math.abs(order.loyaltyDiscount ?? 0);
  if (loyaltyAbs > 0) {
    discounts.push({
      title: 'Loyalty points',
      amountInr: loyaltyAbs,
    });
  }
  return discounts;
}

type MappedOrderItem = {
  id: string;
  name: string;
  tax_inclusive: boolean;
  gst_liability: string;
  item_tax: Array<{
    id: string;
    name: string;
    tax_percentage: string;
    amount: string;
  }>;
  item_discount: string;
  price: string;
  final_price: string;
  quantity: string;
  description: string;
  variation_name: string;
  variation_id: string;
  addon_items: Array<{
    id: string;
    name: string;
    price: string;
    quantity: string;
  }>;
};

function mapOrderItem(
  line: SerenityOrderLineInput,
  taxConfig: PetpoojaTaxConfig,
): MappedOrderItem {
  const petpoojaItemId = line.menuItem.petpoojaItemId as string;
  const variant = line.menuItem.variants?.find(
    (entry) => entry.id === line.variantId,
  );
  const extras =
    line.menuItem.extras?.filter((extra) =>
      line.extraIds?.includes(extra.id),
    ) ?? [];

  const lineBase = line.unitPrice * line.quantity;
  const cgstAmount = lineBase * taxConfig.cgstRate;
  const sgstAmount = lineBase * taxConfig.sgstRate;

  return {
    id: petpoojaItemId,
    name: line.menuItem.name,
    tax_inclusive: false,
    gst_liability: 'restaurant',
    item_tax: [
      {
        id: taxConfig.cgstTaxId,
        name: 'CGST',
        tax_percentage: formatRate(taxConfig.cgstRate),
        amount: formatAmount(cgstAmount),
      },
      {
        id: taxConfig.sgstTaxId,
        name: 'SGST',
        tax_percentage: formatRate(taxConfig.sgstRate),
        amount: formatAmount(sgstAmount),
      },
    ],
    item_discount: '',
    price: formatAmount(line.unitPrice),
    final_price: formatAmount(line.unitPrice),
    quantity: String(line.quantity),
    description: line.detail ?? '',
    variation_name: variant?.label ?? '',
    variation_id:
      variant && line.variantId ? stripPrefix(line.variantId, 'v-') : '',
    addon_items: extras.map((extra) => ({
      id: stripPrefix(extra.id, 'a-'),
      name: extra.label,
      price: formatAmount(extra.price),
      quantity: '1',
    })),
  };
}

function buildOrderTax(
  lineItems: MappedOrderItem[],
  taxConfig: PetpoojaTaxConfig,
) {
  const cgstTotal = lineItems.reduce(
    (sum, item) =>
      sum +
      Number(item.item_tax.find((tax) => tax.name === 'CGST')?.amount ?? 0),
    0,
  );
  const sgstTotal = lineItems.reduce(
    (sum, item) =>
      sum +
      Number(item.item_tax.find((tax) => tax.name === 'SGST')?.amount ?? 0),
    0,
  );

  return [
    {
      id: taxConfig.cgstTaxId,
      title: 'CGST',
      type: 'P',
      price: formatRate(taxConfig.cgstRate),
      tax: formatAmount(cgstTotal),
      restaurant_liable_amt: formatAmount(cgstTotal),
    },
    {
      id: taxConfig.sgstTaxId,
      title: 'SGST',
      type: 'P',
      price: formatRate(taxConfig.sgstRate),
      tax: formatAmount(sgstTotal),
      restaurant_liable_amt: formatAmount(sgstTotal),
    },
  ];
}

function mapPaymentType(paymentMethod: 'UPI' | 'CARD' | 'COD'): string {
  return paymentMethod === 'COD' ? 'COD' : 'ONLINE';
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return '0000000000';
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatRate(rate: number): string {
  return String(rate * 100);
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
