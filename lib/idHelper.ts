/**
 * Generates human-friendly, evaluation-ready short IDs from UUIDs or indexes.
 * e.g., 'ccccccc1-cccc-...' -> '#RIDE-01' or '#RIDE-3F8A'
 */
const ID_MAP: Record<string, string> = {
  // Seed Users
  '11111111-1111-1111-1111-111111111111': '#USER-01',
  '22222222-2222-2222-2222-222222222222': '#USER-02',
  '33333333-3333-3333-3333-333333333333': '#USER-03',
  // Seed Drivers
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-01',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-02',
  'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-03',
  // Seed Vehicles
  'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-01',
  'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-02',
  'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-03',
  // Seed Rides
  'ccccccc1-cccc-cccc-cccc-cccccccccccc': '#RIDE-01',
  'ccccccc2-cccc-cccc-cccc-cccccccccccc': '#RIDE-02',
  'ccccccc3-cccc-cccc-cccc-cccccccccccc': '#RIDE-03',
  // Seed Payments
  'ddddddd1-dddd-dddd-dddd-dddddddddddd': '#PAY-01',
  'ddddddd2-dddd-dddd-dddd-dddddddddddd': '#PAY-02',
  'ddddddd3-dddd-dddd-dddd-dddddddddddd': '#PAY-03',
  // Seed Reviews
  'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeeee': '#REV-01',
  'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeeee': '#REV-02'
};

export function formatFriendlyId(id: string | null | undefined, prefix: 'RIDE' | 'USER' | 'DRV' | 'VEH' | 'PAY' | 'REV'): string {
  if (!id) return '—';
  if (ID_MAP[id]) return ID_MAP[id];

  // For dynamically generated UUIDs, extract clean 4-char suffix
  const clean = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `#${prefix}-${clean}`;
}
