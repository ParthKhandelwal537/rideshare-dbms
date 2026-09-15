// Bangalore locations reference data (matches locations table)
export const LOCATIONS_DATA: Record<string, { lat: number; lon: number }> = {
  'MG Road': { lat: 12.9757, lon: 77.6079 },
  'Whitefield': { lat: 12.9698, lon: 77.7500 },
  'Koramangala': { lat: 12.9352, lon: 77.6245 },
  'Airport': { lat: 13.1986, lon: 77.7066 },
  'Electronic City': { lat: 12.8452, lon: 77.6602 },
  'Indiranagar': { lat: 12.9719, lon: 77.6412 },
};

export const BASE_FARE = 50; // Base fare in ₹
export const RATE_PER_KM = 12; // Rate per km in ₹

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 * Mirrors haversine_km() in PostgreSQL schema.
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Computes fare given pickup and dropoff location names.
 * Mirrors calculate_fare() trigger in PostgreSQL schema.
 */
export function calculateFareForLocations(
  pickupName: string,
  dropoffName: string
): { distanceKm: number; fare: number } {
  const pickup = LOCATIONS_DATA[pickupName];
  const dropoff = LOCATIONS_DATA[dropoffName];

  if (!pickup || !dropoff) {
    return { distanceKm: 0, fare: BASE_FARE };
  }

  const distanceKm = calculateHaversineKm(
    pickup.lat,
    pickup.lon,
    dropoff.lat,
    dropoff.lon
  );
  const fare = Math.round(BASE_FARE + RATE_PER_KM * distanceKm);
  return { distanceKm, fare };
}

/**
 * Calculates dynamic pooling fare based on number of co-riders sharing the vehicle.
 */
export function calculateDynamicFare(baseFare: number, rideType: 'solo' | 'shared', totalRiders: number): {
  finalFare: number;
  discountPercent: number;
  savings: number;
} {
  if (rideType === 'solo' || totalRiders <= 1) {
    return { finalFare: baseFare, discountPercent: 0, savings: 0 };
  }

  // Multi-rider pooling discount:
  // 2 riders sharing: 30% discount
  // 3 riders sharing: 45% discount
  // 4+ riders sharing: 55% discount
  let discount = 0.30;
  if (totalRiders === 3) discount = 0.45;
  if (totalRiders >= 4) discount = 0.55;

  const finalFare = Math.round(baseFare * (1 - discount));
  const savings = baseFare - finalFare;

  return { finalFare, discountPercent: Math.round(discount * 100), savings };
}

export interface RouteMatchResult {
  isMatch: boolean;
  matchType: 'midway_dropoff' | 'midway_pickup' | 'same_route' | 'corridor_detour';
  detourKm: number;
  detourRatio: number;
  description: string;
}

/**
 * Checks if a candidate ride route falls along or in-between the primary ride's source and destination.
 * Enforces corridor geometry with maximum 25% detour ratio.
 */
export function isLocationOnRoute(
  source: string,
  destination: string,
  candidatePickup: string,
  candidateDropoff: string
): RouteMatchResult {
  const pSource = LOCATIONS_DATA[source];
  const pDest = LOCATIONS_DATA[destination];
  const pCandPick = LOCATIONS_DATA[candidatePickup];
  const pCandDrop = LOCATIONS_DATA[candidateDropoff];

  if (!pSource || !pDest || !pCandPick || !pCandDrop) {
    return {
      isMatch: false,
      matchType: 'corridor_detour',
      detourKm: 0,
      detourRatio: 1,
      description: 'Unknown location'
    };
  }

  // Exact same route
  if (source === candidatePickup && destination === candidateDropoff) {
    return {
      isMatch: true,
      matchType: 'same_route',
      detourKm: 0,
      detourRatio: 1.0,
      description: `Exact matching route (${source} → ${destination})`
    };
  }

  const directDist = calculateHaversineKm(pSource.lat, pSource.lon, pDest.lat, pDest.lon);
  if (directDist === 0) {
    return {
      isMatch: false,
      matchType: 'corridor_detour',
      detourKm: 0,
      detourRatio: 1,
      description: 'Zero distance'
    };
  }

  // 1. Midway Dropoff along the route (Source matches, candidate gets down midway before destination)
  if (candidatePickup === source && candidateDropoff !== destination) {
    const leg1 = calculateHaversineKm(pSource.lat, pSource.lon, pCandDrop.lat, pCandDrop.lon);
    const leg2 = calculateHaversineKm(pCandDrop.lat, pCandDrop.lon, pDest.lat, pDest.lon);
    const totalDist = leg1 + leg2;
    const detourRatio = totalDist / directDist;
    const detourKm = Number((totalDist - directDist).toFixed(1));

    if (detourRatio <= 1.25 && leg1 < directDist) {
      return {
        isMatch: true,
        matchType: 'midway_dropoff',
        detourKm,
        detourRatio: Number(detourRatio.toFixed(2)),
        description: `Midway dropoff at ${candidateDropoff} (on the way to ${destination}, +${detourKm}km corridor)`
      };
    }
  }

  // 2. Midway Pickup along the route (Candidate boards midway along the path to destination)
  if (candidateDropoff === destination && candidatePickup !== source) {
    const leg1 = calculateHaversineKm(pSource.lat, pSource.lon, pCandPick.lat, pCandPick.lon);
    const leg2 = calculateHaversineKm(pCandPick.lat, pCandPick.lon, pDest.lat, pDest.lon);
    const totalDist = leg1 + leg2;
    const detourRatio = totalDist / directDist;
    const detourKm = Number((totalDist - directDist).toFixed(1));

    if (detourRatio <= 1.25 && leg2 < directDist) {
      return {
        isMatch: true,
        matchType: 'midway_pickup',
        detourKm,
        detourRatio: Number(detourRatio.toFixed(2)),
        description: `Midway pickup at ${candidatePickup} (on the way from ${source}, +${detourKm}km corridor)`
      };
    }
  }

  // 3. Corridor route overlap (Candidate travels between two points on the corridor)
  const distS1toS2 = calculateHaversineKm(pSource.lat, pSource.lon, pCandPick.lat, pCandPick.lon);
  const distS2toD2 = calculateHaversineKm(pCandPick.lat, pCandPick.lon, pCandDrop.lat, pCandDrop.lon);
  const distD2toD1 = calculateHaversineKm(pCandDrop.lat, pCandDrop.lon, pDest.lat, pDest.lon);
  const totalPooledDist = distS1toS2 + distS2toD2 + distD2toD1;
  const detourRatio = totalPooledDist / directDist;
  const detourKm = Number((totalPooledDist - directDist).toFixed(1));

  if (detourRatio <= 1.25) {
    return {
      isMatch: true,
      matchType: 'corridor_detour',
      detourKm,
      detourRatio: Number(detourRatio.toFixed(2)),
      description: `Falls along corridor via ${candidatePickup} & ${candidateDropoff} (+${detourKm}km slight detour)`
    };
  }

  return {
    isMatch: false,
    matchType: 'corridor_detour',
    detourKm,
    detourRatio: Number(detourRatio.toFixed(2)),
    description: `Route outside corridor (${candidatePickup} → ${candidateDropoff})`
  };
}

/**
 * Evaluates whether two departure times and dates match within an acceptable deviation window.
 * "time can be here and there... slight deviation but not so much that it increases the time significantly"
 * Default allowable deviation is 45 minutes.
 */
export function isDateTimeCompatible(
  dateA?: string,
  timeA?: string,
  dateB?: string,
  timeB?: string,
  maxDiffMinutes: number = 45
): { isMatch: boolean; reason?: string } {
  // 1. Date check: if both have a date, they must match
  if (dateA && dateB && dateA !== dateB) {
    return { isMatch: false, reason: `Dates differ (${dateA} vs ${dateB})` };
  }

  // 2. If either time is missing, treat as match
  if (!timeA || !timeB) {
    return { isMatch: true };
  }

  const cleanA = timeA.trim().toLowerCase();
  const cleanB = timeB.trim().toLowerCase();

  const isImmA = cleanA.includes('immediate') || cleanA.includes('now');
  const isImmB = cleanB.includes('immediate') || cleanB.includes('now');

  if (isImmA && isImmB) {
    return { isMatch: true };
  }

  // Parse HH:MM (24h or with AM/PM) into minutes from midnight
  const parseMinutes = (t: string): number | null => {
    const match = t.match(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3]?.toLowerCase();

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const minA = parseMinutes(cleanA);
  const minB = parseMinutes(cleanB);

  // If one is immediate and the other is scheduled, allow if within 45 mins of current time
  if (isImmA && minB !== null) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let diff = Math.abs(nowMinutes - minB);
    if (diff > 12 * 60) diff = 24 * 60 - diff;
    return {
      isMatch: diff <= maxDiffMinutes,
      reason: diff <= maxDiffMinutes ? undefined : `Time difference (${diff}m) exceeds ${maxDiffMinutes}m threshold`
    };
  }

  if (isImmB && minA !== null) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let diff = Math.abs(nowMinutes - minA);
    if (diff > 12 * 60) diff = 24 * 60 - diff;
    return {
      isMatch: diff <= maxDiffMinutes,
      reason: diff <= maxDiffMinutes ? undefined : `Time difference (${diff}m) exceeds ${maxDiffMinutes}m threshold`
    };
  }

  if (minA !== null && minB !== null) {
    let diff = Math.abs(minA - minB);
    if (diff > 12 * 60) diff = 24 * 60 - diff;
    if (diff <= maxDiffMinutes) {
      return { isMatch: true };
    }
    return { isMatch: false, reason: `Departure time difference (${diff} mins) exceeds ${maxDiffMinutes} mins allowed` };
  }

  return { isMatch: true };
}
