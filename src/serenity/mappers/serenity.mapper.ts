import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { OrderLineItemEntity } from '../infrastructure/persistence/relational/entities/order-line-item.entity';
import { SavedBowlEntity } from '../infrastructure/persistence/relational/entities/saved-bowl.entity';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import {
  CATEGORIES,
  HOME_MOODS_SEED,
  MOOD_COPY,
  MOODS,
} from '../../database/seeds/relational/serenity/serenity-seed.data';

export function toMenuItemDto(item: MenuItemEntity) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    shortLabel: item.shortLabel,
    image: item.image,
    moods: item.moods,
    category: item.category,
    basePrice: item.basePrice,
    variants: item.variants ?? undefined,
    extras: item.extras ?? undefined,
    isCustomizable: item.isCustomizable,
    inStock: item.inStock,
  };
}

export function formatOrderDate(date: Date) {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';
  const month = date.toLocaleString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  const time = date.toLocaleString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}${suffix} ${month} ${year} | ${time}`;
}

export function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export function toOrderListItemDto(order: SerenityOrderEntity) {
  const lifecycle = projectOrderLifecycle(order);
  return {
    id: order.id,
    orderedAt: formatOrderDate(order.orderedAt),
    item: order.itemSummary,
    note: order.note,
    total: order.total,
    quantity: order.quantity,
    status: order.status,
    statusLabel: lifecycle.label,
    lifecycle,
  };
}

export function toOrderDetailDto(order: SerenityOrderEntity) {
  const lifecycle = projectOrderLifecycle(order);
  return {
    id: order.id,
    orderedAt: formatOrderDate(order.orderedAt),
    item: order.itemSummary,
    note: order.note,
    total: order.total,
    quantity: order.quantity,
    itemDetails: (order.lineItems ?? []).map((line: OrderLineItemEntity) => ({
      title: line.title,
      quantity: line.quantity,
      ingredients: line.ingredients,
      linePrice: line.linePrice,
    })),
    subtotal: order.subtotal,
    couponDiscount: order.couponDiscount,
    gst: order.gst,
    amountPaid: order.amountPaid,
    paidVia: order.paidVia,
    status: order.status,
    statusLabel: lifecycle.label,
    lifecycle,
    kitchenSyncStatus: order.kitchenSyncStatus,
    cancelReason: order.cancelReason,
    feedback: order.foodRating
      ? {
          foodRating: order.foodRating,
          serviceRating: order.serviceRating,
          note: order.feedbackNote,
          submittedAt: order.feedbackAt?.toISOString() ?? null,
        }
      : null,
  };
}

function projectOrderLifecycle(order: SerenityOrderEntity) {
  const baseTimeline = [
    { key: 'confirmed', label: 'Order Confirmed' },
    { key: 'accepted', label: 'Accepted by Kitchen' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const code = order.status;
  const currentIndex = baseTimeline.findIndex((step) => step.key === code);

  return {
    code,
    label:
      code === 'cancelled'
        ? `Cancelled${order.cancelReason ? `: ${order.cancelReason}` : ''}`
        : (baseTimeline[currentIndex]?.label ?? 'Order Processing'),
    kitchenSyncStatus: order.kitchenSyncStatus,
    timeline: baseTimeline.map((step, index) => ({
      ...step,
      done: currentIndex >= index,
      current: currentIndex === index,
    })),
  };
}

export function toSavedBowlDto(bowl: SavedBowlEntity) {
  return {
    id: bowl.id,
    title: bowl.title,
    note: bowl.note,
    description: bowl.description,
    price: bowl.price,
    image: bowl.image,
    ingredients: bowl.ingredients,
    addons: bowl.addons,
    savedNote: bowl.savedNote,
    subtitle: bowl.subtitle ?? undefined,
  };
}

export function toSavedBowlListItemDto(bowl: SavedBowlEntity) {
  return {
    id: bowl.id,
    title: bowl.title,
    subtitle: bowl.subtitle ?? bowl.note,
  };
}

export function toLoyaltyActivityDto(tx: LoyaltyTransactionEntity) {
  return {
    id: String(tx.id),
    label: tx.label,
    date: formatRelativeDate(tx.createdAt),
    pointsLabel: `+${tx.points} pts`,
  };
}

export function getMenuMeta() {
  return {
    categories: [...CATEGORIES],
    moods: [...MOODS],
    moodCopy: MOOD_COPY,
    homeMoods: [...HOME_MOODS_SEED],
  };
}
