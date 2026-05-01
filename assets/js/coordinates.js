function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractNumericPair(text) {
  const matches = String(text || '').match(/[-+]?\d+(?:\.\d+)?/g) || [];

  if (matches.length < 2) {
    return null;
  }

  return {
    first: Number(matches[0]),
    second: Number(matches[1])
  };
}

function inLatRange(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function inLngRange(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function normalizeCoordinatePair(lat, lng) {
  const numericLat = toFiniteNumber(lat);
  const numericLng = toFiniteNumber(lng);

  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) {
    return null;
  }

  if (inLatRange(numericLat) && inLngRange(numericLng)) {
    return {
      lat: numericLat,
      lng: numericLng,
      swapped: false
    };
  }

  const couldBeSwapped = inLatRange(numericLng) && inLngRange(numericLat);

  if (couldBeSwapped) {
    return {
      lat: numericLng,
      lng: numericLat,
      swapped: true
    };
  }

  return null;
}

export function parseCoordinateText(text) {
  if (!String(text || '').trim()) {
    return null;
  }

  const pair = extractNumericPair(text);

  if (!pair) {
    return null;
  }

  return normalizeCoordinatePair(pair.first, pair.second);
}

export function resolveCoordinateInput({ text = '', lat = null, lng = null } = {}) {
  const fromText = parseCoordinateText(text);

  if (fromText) {
    return {
      ...fromText,
      source: 'text'
    };
  }

  const fromFields = normalizeCoordinatePair(lat, lng);

  if (fromFields) {
    return {
      ...fromFields,
      source: 'fields'
    };
  }

  return null;
}

export function formatCoordinate(value, digits = 6) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toFixed(digits);
}

export function buildCoordinateLabel({ lat, lng }, digits = 6) {
  return `${formatCoordinate(lat, digits)}, ${formatCoordinate(lng, digits)}`;
}
