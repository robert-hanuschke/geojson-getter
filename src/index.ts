import { getOsmRelationIdFromWikidataId, WikidataError } from './wikidata';
import { getOverpassFromOsmRelationId, OverpassAttempt } from './overpass';
import { getGeojsonFromOverpassData } from './geojson';
import { FeatureCollection, GeometryObject } from 'geojson';
import { Err, Result } from './result';
export type { getGeojsonFromOverpassData } from './geojson';
export type {
  getOverpassFromOsmRelationId,
  OverpassAttempt,
  OverpassError,
  OverpassData,
} from './overpass';
export type { Result, Ok, Err } from './result';
export type { getOsmRelationIdFromWikidataId, WikidataError } from './wikidata';

export type GeojsonError =
  | { type: 'invalid_osm_id'; osmId: string }
  | { type: 'no_osm_id_for_wikidata'; wikidataId: string }
  | { type: 'wikidata_failed'; error: WikidataError }
  | { type: 'overpass_failed'; attempts: OverpassAttempt[] }
  | { type: 'geojson_conversion_failed'; cause: unknown }
  | { type: 'no_elements'; osmId: string };

export async function getGeojsonFromOsmRelationId({
  osmId,
  userAgent,
  overpassApiUrls,
}: {
  osmId: number;
  userAgent: string;
  overpassApiUrls?: string[] | undefined;
}): Promise<Result<FeatureCollection<GeometryObject>, GeojsonError>> {
  const overpassResult = await getOverpassFromOsmRelationId({
    osmId: osmId.toString(),
    userAgent,
    overpassApiUrls,
  });

  if (!overpassResult.ok) {
    return Err({ type: 'overpass_failed', attempts: overpassResult.error });
  }

  if (!overpassResult.value.elements.length) {
    return Err({ type: 'no_elements', osmId: osmId.toString() });
  }

  return getGeojsonFromOverpassData(overpassResult.value);
}

export async function getGeojsonFromWikidataId({
  wikidataId,
  userAgent,
  overpassApiUrls,
}: {
  wikidataId: string;
  userAgent: string;
  overpassApiUrls?: string[];
}): Promise<Result<FeatureCollection<GeometryObject>, GeojsonError>> {
  const wikidataResult = await getOsmRelationIdFromWikidataId(wikidataId);

  if (!wikidataResult.ok) {
    return Err({ type: 'wikidata_failed', error: wikidataResult.error });
  }

  if (!wikidataResult.value) {
    return Err({ type: 'no_osm_id_for_wikidata', wikidataId });
  }

  return getGeojsonFromOsmRelationId({
    osmId: Number(wikidataResult.value),
    userAgent,
    overpassApiUrls,
  });
}
