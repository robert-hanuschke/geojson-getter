import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOsmRelationIdFromWikidataId } from '.';
import type { Wikidata, WikidataError } from '.';

const MOCK_WIKIDATA_ID = 'Q64';

const mockWikidataWithOsmId: Wikidata = {
  labels: {},
  statements: {
    P402: [{ value: { content: '62484' } }],
  },
};

const mockWikidataWithoutOsmId: Wikidata = {
  labels: {},
  statements: {},
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('getOsmRelationIdFromWikidataId', () => {
  it('returns the OSM relation ID when P402 statement is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWikidataWithOsmId),
      })
    );

    const result = await getOsmRelationIdFromWikidataId(MOCK_WIKIDATA_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toBe('62484');
  });

  it('returns undefined when P402 statement is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWikidataWithoutOsmId),
      })
    );

    const result = await getOsmRelationIdFromWikidataId(MOCK_WIKIDATA_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toBeUndefined();
  });

  it('returns network_error when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    );

    const result = await getOsmRelationIdFromWikidataId(MOCK_WIKIDATA_ID);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<WikidataError>({
      type: 'network_error',
      cause: expect.any(Error),
    });
  });

  it('returns http_error when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    const result = await getOsmRelationIdFromWikidataId(MOCK_WIKIDATA_ID);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error).toMatchObject<WikidataError>({
      type: 'http_error',
      status: 404,
    });
  });

  it('calls the correct wikidata url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWikidataWithOsmId),
      })
    );

    await getOsmRelationIdFromWikidataId(MOCK_WIKIDATA_ID);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/entities/items/${MOCK_WIKIDATA_ID}`)
    );
  });
});
