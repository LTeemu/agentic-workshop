const GRAMS_PER_BYTE = 0.00000039;
const VIEWER_FACTOR = 0.75;

export function estimateCarbon(totalBytes) {
  if (!totalBytes || totalBytes <= 0) {
    return { gramsPerVisit: 0, rating: 'A', equivalent: 'No data' };
  }

  const gramsPerVisit = Math.round(totalBytes * GRAMS_PER_BYTE * VIEWER_FACTOR * 100) / 100;

  let rating;
  if (gramsPerVisit < 0.1) rating = 'A';
  else if (gramsPerVisit < 0.3) rating = 'B';
  else if (gramsPerVisit < 0.5) rating = 'C';
  else if (gramsPerVisit < 0.7) rating = 'D';
  else if (gramsPerVisit < 1.0) rating = 'E';
  else rating = 'F';

  let equivalent;
  if (gramsPerVisit < 0.01) equivalent = 'Negligible';
  else if (gramsPerVisit < 0.1)
    equivalent = `~${Math.round(gramsPerVisit * 1000)}mg CO₂ (like 1 page of a newspaper)`;
  else if (gramsPerVisit < 0.5)
    equivalent = `~${gramsPerVisit}g CO₂ (like watching 1 YouTube video for 1 min)`;
  else if (gramsPerVisit < 1.5) equivalent = `~${gramsPerVisit}g CO₂ (like boiling 1 cup of tea)`;
  else equivalent = `~${gramsPerVisit}g CO₂ (significant — consider optimization)`;

  return {
    gramsPerVisit,
    totalBytes,
    rating,
    equivalent,
  };
}
