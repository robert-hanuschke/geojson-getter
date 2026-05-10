# geojson-getter

A TypeScript library that resolves GeoJSON for OpenStreetMap relations, either directly by OSM relation ID or via a Wikidata ID lookup.

## How it works

1. **Wikidata lookup** — given a Wikidata ID, fetches the entity and extracts the OSM relation ID from the P402 statement
2. **Overpass query** — fetches the relation geometry from the Overpass API using `[out:json];relation(id);out geom qt;`
3. **GeoJSON conversion** — converts the Overpass response to GeoJSON using [osmtogeojson](https://github.com/tyrasd/osmtogeojson)

Multiple Overpass mirrors are tried in sequence; the first successful response is used. All functions return a `Result` type — errors never throw, and every failure mode is typed.

## Fair use

This library queries the [Wikidata REST API](https://www.wikidata.org/wiki/Wikidata:REST_API) and public [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) mirrors. Both are free, community-funded services — please use them responsibly:

- **Cache results** wherever possible. Relation geometry rarely changes; re-fetching on every request is unnecessary load on shared infrastructure.
- **Set a meaningful `userAgent`** that identifies your application and includes a contact URL. Instance operators use this to reach you if your usage causes issues.
- **Do not use this library for bulk or batch processing** without running your own Overpass instance. Public mirrors are not intended for high-volume automated queries.
- **Respect rate limits.** A 429 response means you are sending too many requests. Back off and retry with delays rather than switching mirrors aggressively.

Each Overpass mirror operates independently and may have its own usage policy — check the terms of the specific mirror you are using. For large-scale usage, consider hosting your own Overpass instance using [overpass-api.de's Docker image](https://github.com/drolbr/docker-overpass) and passing it via `overpassApiUrls`.

Wikidata API usage policy: https://www.wikidata.org/wiki/Wikidata:Data_access  
Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API

## Usage

### By OSM relation ID

```ts
import { getGeojsonFromOsmRelationId } from 'geojson-getter';

const result = await getGeojsonFromOsmRelationId({
  osmId: 62484,
  userAgent: 'myapp/1.0 (https://github.com/myorg/myrepo)',
});

if (!result.ok) {
  switch (result.error.type) {
    case 'invalid_osm_id': // bad input
    case 'no_elements': // relation exists but has no geometry
    case 'overpass_failed': // all mirrors exhausted; result.error.attempts has per-URL details
    case 'geojson_conversion_failed':
  }
  return;
}

console.log(result.value); // GeoJSON FeatureCollection
```

### Custom Overpass mirrors

```ts
const result = await getGeojsonFromOsmRelationId({
  osmId: 62484,
  userAgent: 'myapp/1.0 (https://github.com/myorg/myrepo)',
  overpassApiUrls: [
    'https://overpass-api.de/api/interpreter',
    'https://my-own-mirror.example.com/api/interpreter',
  ],
});
```

### By Wikidata ID

```ts
import { getGeojsonFromWikidataId } from 'geojson-getter';

const result = await getGeojsonFromWikidataId({
  wikidataId: 'Q3974',
  userAgent: 'myapp/1.0 (https://github.com/myorg/myrepo)',
});

if (!result.ok) {
  switch (result.error.type) {
    case 'no_osm_id_for_wikidata': // entity exists but has no P402 statement
    case 'wikidata_failed': // Wikidata request failed
    case 'no_elements':
    case 'overpass_failed':
    case 'geojson_conversion_failed':
  }
  return;
}

console.log(result.value); // GeoJSON FeatureCollection
```

## Error types

All functions return a `Result` discriminated union — check `result.ok` before
accessing `result.value` (success) or `result.error` (failure).

```ts
type GeojsonError =
  | { type: 'invalid_osm_id'; osmId: string }
  | { type: 'no_osm_id_for_wikidata'; wikidataId: string }
  | { type: 'wikidata_failed'; error: WikidataError }
  | { type: 'overpass_failed'; attempts: OverpassAttempt[] }
  | { type: 'geojson_conversion_failed'; cause: unknown }
  | { type: 'no_elements'; osmId: string };

type WikidataError =
  | { type: 'network_error'; cause: unknown }
  | { type: 'http_error'; status: number };

type OverpassAttempt = {
  url: string;
  error:
    | { type: 'network_error'; cause: unknown }
    | { type: 'http_error'; status: number }
    | { type: 'overpass_error'; cause: unknown };
};
```

`OverpassAttempt` contains the URL that was tried and the specific error (`network_error`, `http_error`, or `overpass_error`) so callers have full visibility into which mirrors failed and why.

## User agent

Overpass mirrors require a descriptive `User-Agent` to identify your application. The conventional format is:

```
appname/version (contact-or-url)
```

Omitting it or using a generic value will result in 403 or 429 responses from most mirrors.

## Default Overpass mirrors

Requests are tried in order against:

- https://overpass.private.coffee/api/interpreter
- https://maps.mail.ru/osm/tools/overpass/api/interpreter
- https://overpass-api.de/api/interpreter

## Development

### Setup

```bash
npm install
```

### Testing

```bash
# run once
npm test

# watch mode
npm run test:watch

# with coverage
npx vitest run --coverage
```

No tests make real HTTP requests. Fetch and module dependencies are fully mocked.
