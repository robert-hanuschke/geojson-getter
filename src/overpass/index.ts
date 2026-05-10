import { Result, Ok, Err } from '../result';

const DEFAULT_OVERPASS_API_URLS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

export type OverpassError =
  | { type: 'network_error'; cause: unknown }
  | { type: 'http_error'; status: number }
  | { type: 'overpass_error'; cause: unknown };

export type OverpassAttempt = { url: string; error: OverpassError };

// does not detail the elements, not relevant for our use case
export interface OverpassData {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: object[];
}

export async function getOverpassFromOsmRelationId({
  osmId,
  userAgent,
  overpassApiUrls,
}: {
  osmId: string;
  userAgent: string;
  overpassApiUrls?: string[] | undefined;
}): Promise<Result<OverpassData, OverpassAttempt[]>> {
  const failures: OverpassAttempt[] = [];
  const query = encodeURIComponent(
    `[out:json];relation(${osmId});out geom qt;`
  );
  for (const overpassApiUrl of overpassApiUrls ?? DEFAULT_OVERPASS_API_URLS) {
    let response: Response;
    const url = `${overpassApiUrl}?data=${query}`;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'application/json',
        },
      });
    } catch (cause) {
      failures.push({ url, error: { type: 'network_error', cause } });
      continue;
    }

    if (!response.ok) {
      failures.push({
        url,
        error: { type: 'http_error', status: response.status },
      });
      continue;
    }

    try {
      const overpassData = (await response.json()) as OverpassData;
      return Ok(overpassData);
    } catch (cause) {
      failures.push({ url, error: { type: 'overpass_error', cause } });
      continue;
    }
  }

  return Err(failures);
}
