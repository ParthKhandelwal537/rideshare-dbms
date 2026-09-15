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
  'aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-04',
  'aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-05',
  'aaaaaaa6-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-06',
  'aaaaaaa7-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-07',
  'aaaaaaa8-aaaa-aaaa-aaaa-aaaaaaaaaaaa': '#DRV-08',
  // Seed Vehicles
  'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-01',
  'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-02',
  'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-03',
  'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-04',
  'bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-05',
  'bbbbbbb6-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-06',
  'bbbbbbb7-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-07',
  'bbbbbbb8-bbbb-bbbb-bbbb-bbbbbbbbbbbb': '#VEH-08',
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

  // If ID already starts with '#', return as is
  if (id.startsWith('#')) return id;

  // If ID follows sequential pattern (e.g. ccccccc4-cccc-...), map to #RIDE-04
  const sequentialMatch = id.match(/^([a-f0-9])\1{6}([0-9a-f]+)/i);
  if (sequentialMatch) {
    const num = parseInt(sequentialMatch[2], 16);
    if (!isNaN(num)) {
      return `#${prefix}-${String(num).padStart(2, '0')}`;
    }
  }

  // For dynamically generated UUIDs, extract clean 4-char suffix
  const clean = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `#${prefix}-${clean}`;
}

/**
 * Generates an easy-to-read, sequential UUID compatible with Postgres UUID type.
 * e.g., for RIDE #4 -> 'ccccccc4-cccc-cccc-cccc-cccccccccccc'
 * e.g., for USER #4 -> '44444444-4444-4444-4444-444444444444'
 */
export function generateSimplifiedUuid(type: 'RIDE' | 'USER' | 'DRV' | 'VEH' | 'PAY', index: number): string {
  const hexChar = Number(index).toString(16).slice(-1);
  switch (type) {
    case 'USER':
      return `${hexChar.repeat(8)}-${hexChar.repeat(4)}-${hexChar.repeat(4)}-${hexChar.repeat(4)}-${hexChar.repeat(12)}`;
    case 'DRV':
      return `aaaaaaa${hexChar}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`;
    case 'VEH':
      return `bbbbbbb${hexChar}-bbbb-bbbb-bbbb-bbbbbbbbbbbb`;
    case 'RIDE':
      return `ccccccc${hexChar}-cccc-cccc-cccc-cccccccccccc`;
    case 'PAY':
      return `ddddddd${hexChar}-dddd-dddd-dddd-dddddddddddd`;
    default:
      return crypto.randomUUID();
  }
}
