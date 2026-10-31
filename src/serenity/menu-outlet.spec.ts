import { itemBelongsToOutlet, selectMenuForOutlet } from './menu-outlet';

describe('selectMenuForOutlet', () => {
  const shared = { id: 'shared', outletId: null };
  const rajbaug = { id: 'raj', outletId: 'outlet-raj' };
  const other = { id: 'other', outletId: 'outlet-other' };

  it('should return the full catalog when no outlet is selected', () => {
    expect(selectMenuForOutlet([shared, rajbaug], null)).toEqual([
      shared,
      rajbaug,
    ]);
  });

  it('should use an outlet catalog when that outlet has its own items', () => {
    expect(selectMenuForOutlet([shared, rajbaug, other], 'outlet-raj')).toEqual([
      rajbaug,
    ]);
  });

  it('should fall back to the shared catalog when the outlet has no items', () => {
    expect(selectMenuForOutlet([shared, other], 'outlet-raj')).toEqual([shared]);
  });

  it('should reject a shared item once the outlet has its own menu', () => {
    expect(itemBelongsToOutlet(shared, 'outlet-raj', true)).toBe(false);
    expect(itemBelongsToOutlet(rajbaug, 'outlet-raj', true)).toBe(true);
    expect(itemBelongsToOutlet(other, 'outlet-raj', true)).toBe(false);
  });
});
