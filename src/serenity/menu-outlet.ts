export type OutletScopedMenuItem = {
  outletId?: string | null;
};

/** Outlet-specific rows win. A shared catalog is used only when that outlet has none. */
export function selectMenuForOutlet<T extends OutletScopedMenuItem>(
  items: T[],
  outletId?: string | null,
): T[] {
  const scoped = outletId?.trim();
  if (!scoped) {
    return items;
  }

  const specific = items.filter((item) => item.outletId === scoped);
  if (specific.length > 0) {
    return specific;
  }

  return items.filter((item) => !item.outletId);
}

export function itemBelongsToOutlet(
  item: OutletScopedMenuItem,
  outletId: string,
  outletHasExclusiveMenu: boolean,
): boolean {
  if (item.outletId) {
    return item.outletId === outletId;
  }

  return !outletHasExclusiveMenu;
}
