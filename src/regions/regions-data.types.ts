export type RemoteCity = {
  id: number;
  name: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type RemoteState = {
  id: number;
  name: string;
  iso2?: string | null;
  type?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  cities?: RemoteCity[];
};

export type RemoteCountry = {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  phonecode?: string | null;
  currency?: string | null;
  capital?: string | null;
  region?: string | null;
  subregion?: string | null;
  emoji?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  states?: RemoteState[];
};

export const DEFAULT_REGIONS_DATA_URL =
  'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json';

export function parseCoordinate(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
