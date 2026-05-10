import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGeojsonFromOsmRelationId, getGeojsonFromWikidataId } from '.';
import type { GeojsonError } from '.';
import type { OverpassAttempt } from './overpass';
import type { FeatureCollection, GeometryObject } from 'geojson';
import { Ok, Err } from './result';

vi.mock('./wikidata');
vi.mock('./overpass');
vi.mock('./geojson');

import { getOsmRelationIdFromWikidataId } from './wikidata';
import { getOverpassFromOsmRelationId } from './overpass';
import { getGeojsonFromOverpassData } from './geojson';

const MOCK_USER_AGENT = 'test-agent/1.0';
const MOCK_OSM_ID = 62484;
const MOCK_WIKIDATA_ID = 'Q64';

const mockOverpassData = {
  version: 0.6,
  generator: 'Overpass API',
  osm3s: {
    timestamp_osm_base: '2026-02-24T00:00:00Z',
    copyright:
      'The data included in this document is from www.openstreetmap.org',
  },
  elements: [{ type: 'relation', id: 62484 }],
};

const mockFeatureCollection: FeatureCollection<GeometryObject> = {
  type: 'FeatureCollection',
  features: [],
};

const mockFailedAttempts: OverpassAttempt[] = [
  { url: 'https://example.com', error: { type: 'http_error', status: 503 } },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getGeojsonFromOsmRelationId', () => {
  it('returns geojson on success', async () => {
    vi.mocked(getOverpassFromOsmRelationId).mockResolvedValue(
      Ok(mockOverpassData)
    );
    vi.mocked(getGeojsonFromOverpassData).mockReturnValue(
      Ok(mockFeatureCollection)
    );

    const result = await getGeojsonFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(mockFeatureCollection);
  });

  it('returns no_elements when overpass returns empty elements', async () => {
    vi.mocked(getOverpassFromOsmRelationId).mockResolvedValue(
      Ok({ ...mockOverpassData, elements: [] })
    );

    const result = await getGeojsonFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<GeojsonError>({
      type: 'no_elements',
      osmId: MOCK_OSM_ID.toString(),
    });
  });

  it('returns overpass_failed when overpass fails', async () => {
    vi.mocked(getOverpassFromOsmRelationId).mockResolvedValue(
      Err(mockFailedAttempts)
    );

    const result = await getGeojsonFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<GeojsonError>({
      type: 'overpass_failed',
      attempts: mockFailedAttempts,
    });
  });

  it('returns geojson_conversion_failed when conversion fails', async () => {
    vi.mocked(getOverpassFromOsmRelationId).mockResolvedValue(
      Ok(mockOverpassData)
    );
    vi.mocked(getGeojsonFromOverpassData).mockReturnValue(
      Err({
        type: 'geojson_conversion_failed',
        cause: new Error('conversion failed'),
      })
    );

    const result = await getGeojsonFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<GeojsonError>({
      type: 'geojson_conversion_failed',
      cause: expect.any(Error),
    });
  });
});

describe('getGeojsonFromWikidataId', () => {
  it('returns geojson on success', async () => {
    vi.mocked(getOsmRelationIdFromWikidataId).mockResolvedValue(
      Ok(MOCK_OSM_ID.toString())
    );
    vi.mocked(getOverpassFromOsmRelationId).mockResolvedValue(
      Ok(mockOverpassData)
    );
    vi.mocked(getGeojsonFromOverpassData).mockReturnValue(
      Ok(mockFeatureCollection)
    );

    const result = await getGeojsonFromWikidataId({
      wikidataId: MOCK_WIKIDATA_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(mockFeatureCollection);
  });

  it('returns no_osm_id_for_wikidata when wikidata has no P402', async () => {
    vi.mocked(getOsmRelationIdFromWikidataId).mockResolvedValue(Ok(undefined));

    const result = await getGeojsonFromWikidataId({
      wikidataId: MOCK_WIKIDATA_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<GeojsonError>({
      type: 'no_osm_id_for_wikidata',
      wikidataId: MOCK_WIKIDATA_ID,
    });
  });

  it('returns wikidata_failed when wikidata request fails', async () => {
    vi.mocked(getOsmRelationIdFromWikidataId).mockResolvedValue(
      Err({ type: 'http_error', status: 429 })
    );

    const result = await getGeojsonFromWikidataId({
      wikidataId: MOCK_WIKIDATA_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<GeojsonError>({
      type: 'wikidata_failed',
      error: { type: 'http_error', status: 429 },
    });
  });

  it('returns overpass_failed when overpass fails after wikidata succeeds', async () => {
    vi.mocked(getOsmRelationIdFromWikidataId).mockResolvedValue(
      Ok(MOCK_OSM_ID.toString())
    );
    vi.mocked(getOverpassFromOsmRelationId).mockResolvedValue(
      Err(mockFailedAttempts)
    );

    const result = await getGeojsonFromWikidataId({
      wikidataId: MOCK_WIKIDATA_ID,
      userAgent: MOCK_USER_AGENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<GeojsonError>({
      type: 'overpass_failed',
      attempts: mockFailedAttempts,
    });
  });
});
