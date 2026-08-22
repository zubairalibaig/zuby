/**
 * Minimal base32 geohash encoder. Used to tag WhatsApp-click / profile-view
 * events with an approximate location (5 chars ≈ a few km cell) — never the
 * buyer's precise coordinates, and never the chef's.
 */
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function geohashEncode(lat: number, lng: number, precision = 5): string {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = "";

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit += 1;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

/** True for a well-formed 5-character geohash (matches the events.geohash5 check constraint). */
export function isValidGeohash5(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9b-hjkmnp-z]{5}$/.test(value);
}
