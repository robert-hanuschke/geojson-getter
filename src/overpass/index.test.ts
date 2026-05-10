import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOverpassFromOsmRelationId } from '.';
import type { OverpassData, OverpassAttempt } from '.';

const TEST_URL = 'https://test-overpass.example.com/api/interpreter';
const FALLBACK_URL = 'https://fallback.example.com/api/interpreter';
const MOCK_USER_AGENT = 'test-agent/1.0';
const MOCK_OSM_ID = '62484';

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

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('getOverpassFromOsmRelationId', () => {
  it('returns overpass data on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOverpassData),
      })
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      overpassApiUrls: [TEST_URL],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(mockOverpassData);
  });

  it('records http error and tries next url', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOverpassData),
        })
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      overpassApiUrls: [TEST_URL, FALLBACK_URL],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(mockOverpassData);
  });

  it('returns all failures when all urls fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      overpassApiUrls: [TEST_URL],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toHaveLength(1);
    expect(result.error[0]).toMatchObject<OverpassAttempt>({
      url: expect.stringContaining(TEST_URL) as string,
      error: { type: 'http_error', status: 503 },
    });
  });

  it('records network error on fetch throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      overpassApiUrls: [TEST_URL],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error[0]).toMatchObject<OverpassAttempt>({
      url: expect.stringContaining(TEST_URL) as string,
      error: { type: 'network_error', cause: expect.any(Error) },
    });
  });

  it('falls back to next url on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOverpassData),
        })
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      overpassApiUrls: [TEST_URL, FALLBACK_URL],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual(mockOverpassData);
  });

  it('records overpass_error when json parsing fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('invalid json')),
      })
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      overpassApiUrls: [TEST_URL],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error[0]).toMatchObject<OverpassAttempt>({
      url: expect.stringContaining(TEST_URL) as string,
      error: { type: 'overpass_error', cause: expect.any(Error) },
    });
  });

  it('uses default urls when none provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOverpassData),
      })
    );

    const result = await getOverpassFromOsmRelationId({
      osmId: MOCK_OSM_ID,
      userAgent: MOCK_USER_AGENT,
      // no overpassApiUrls
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('overpass.private.coffee'),
      expect.any(Object)
    );
  });
});
