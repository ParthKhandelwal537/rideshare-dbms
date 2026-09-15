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

  // Pattern 1: single-char sequential (e.g. ccccccc4-cccc-... → #RIDE-04)
  const singleCharMatch = id.match(/^([a-f0-9])\1{6}([0-9a-f]+)/i);
  if (singleCharMatch) {
    const num = parseInt(singleCharMatch[2], 16);
    if (!isNaN(num)) {
      return `#${prefix}-${String(num).padStart(2, '0')}`;
    }
  }

  // Pattern 2: 2-digit decimal sequential (e.g. cccccc10-cccc-... → #RIDE-10)
  const twoDigitMatch = id.match(/^[a-f0-9]{6}(\d{2})-/i);
  if (twoDigitMatch) {
    const num = parseInt(twoDigitMatch[1], 10);
    if (!isNaN(num) && num >= 10) {
      return `#${prefix}-${String(num).padStart(2, '0')}`;
    }
  }

  // For dynamically generated UUIDs, extract clean 4-char suffix
  const clean = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `#${prefix}-${clean}`;
}

/**
 * Generates an easy-to-read, sequential UUID compatible with Postgres UUID type.
 * For indexes 1–9: uses single hex char (e.g., RIDE #4 → 'ccccccc4-cccc-...')
 * For indexes 10+: pads to 2 decimal digits in the suffix to avoid collisions
 *   e.g., RIDE #10 → 'cccccc10-cccc-cccc-cccc-cccccccccccc'
 *         USER #10 → '00000010-0000-0000-0000-000000000010'
 */
export function generateSimplifiedUuid(type: 'RIDE' | 'USER' | 'DRV' | 'VEH' | 'PAY', index: number): string {
  if (index >= 1 && index <= 9) {
    const c = String(index);
    switch (type) {
      case 'USER': return `${c.repeat(8)}-${c.repeat(4)}-${c.repeat(4)}-${c.repeat(4)}-${c.repeat(12)}`;
      case 'DRV':  return `aaaaaaa${c}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`;
      case 'VEH':  return `bbbbbbb${c}-bbbb-bbbb-bbbb-bbbbbbbbbbbb`;
      case 'RIDE': return `ccccccc${c}-cccc-cccc-cccc-cccccccccccc`;
      case 'PAY':  return `ddddddd${c}-dddd-dddd-dddd-dddddddddddd`;
    }
  }
  // For index >= 10, embed 2-digit decimal in the leading segment
  const suffix = String(index).padStart(2, '0');
  switch (type) {
    case 'USER': return `0000${suffix}00-0000-0000-0000-0000${suffix}000000`;
    case 'DRV':  return `aaaaaa${suffix}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`;
    case 'VEH':  return `bbbbbb${suffix}-bbbb-bbbb-bbbb-bbbbbbbbbbbb`;
    case 'RIDE': return `cccccc${suffix}-cccc-cccc-cccc-cccccccccccc`;
    case 'PAY':  return `dddddd${suffix}-dddd-dddd-dddd-dddddddddddd`;
    default:     return crypto.randomUUID();
  }
}
