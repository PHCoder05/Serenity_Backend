/** MIT ADT Rajbaug campus drop-off points (SOW §11.3). */
export const CAMPUS_DELIVERY_LOCATIONS = [
  { id: 'serenity-cafe', label: 'Serenity Café, Rajbaug' },
  { id: 'main-academic', label: 'Main Academic Block' },
  { id: 'school-of-design', label: 'School of Design' },
  { id: 'school-of-engineering', label: 'School of Engineering' },
  { id: 'school-of-management', label: 'MIT School of Management' },
  { id: 'hostel-a', label: 'Hostel Block A' },
  { id: 'hostel-b', label: 'Hostel Block B' },
  { id: 'central-library', label: 'Central Library' },
  { id: 'sports-complex', label: 'Sports Complex' },
  { id: 'admin-building', label: 'Admin Building' },
] as const;

export const TAKEAWAY_ADDRESS = 'Serenity Café, Rajbaug (Takeaway)';
export const TABLE_MIN = 1;
export const TABLE_MAX = 120;

export type CampusLocation = (typeof CAMPUS_DELIVERY_LOCATIONS)[number];

export function findCampusLocation(
  raw?: string | null,
): CampusLocation | null {
  const needle = raw?.trim().toLowerCase();
  if (!needle) return null;
  return (
    CAMPUS_DELIVERY_LOCATIONS.find(
      (location) =>
        location.id === needle || location.label.toLowerCase() === needle,
    ) ?? null
  );
}

export function dineInAddress(tableNumber: number): string {
  return `Dine In · Table ${tableNumber}`;
}
