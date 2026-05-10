import { describe, it, expect, vi } from 'vitest';
import { getGeojsonFromOverpassData } from '.';
import type { OverpassData } from '../overpass';
import type { FeatureCollection, GeometryObject } from 'geojson';

vi.mock('osmtogeojson', () => ({
  default: vi.fn(),
}));

import osmtogeojson from 'osmtogeojson';

const mockOsmtogeojson = (value: ReturnType<typeof osmtogeojson>) =>
  vi.mocked(osmtogeojson).mockReturnValue(value);

const mockOverpassData: OverpassData = {
  version: 0.6,
  generator: 'Overpass API',
  osm3s: {
    timestamp_osm_base: '2026-02-24T00:00:00Z',
    copyright:
      'The data included in this document is from www.openstreetmap.org',
  },
  elements: [],
};

const mockFeatureCollection: FeatureCollection<GeometryObject> = {
  type: 'FeatureCollection',
  features: [],
};

describe('getGeojsonFromOverpassData', () => {
  it('passes overpass data to osmtogeojson and returns the result', () => {
    mockOsmtogeojson(mockFeatureCollection);

    const result = getGeojsonFromOverpassData(mockOverpassData);

    expect(osmtogeojson).toHaveBeenCalledWith(mockOverpassData);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(mockFeatureCollection);
  });

  it('returns whatever osmtogeojson returns', () => {
    const withFeatures: FeatureCollection<GeometryObject> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [13.4, 52.5] },
          properties: { name: 'Berlin' },
        },
      ],
    };
    mockOsmtogeojson(withFeatures);

    const result = getGeojsonFromOverpassData(mockOverpassData);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(withFeatures);
  });

  it('returns geojson_conversion_failed when osmtogeojson throws', () => {
    vi.mocked(osmtogeojson).mockImplementation(() => {
      throw new Error('conversion failed');
    });

    const result = getGeojsonFromOverpassData(mockOverpassData);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toEqual({
      type: 'geojson_conversion_failed',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      cause: expect.any(Error),
    });
  });
});
