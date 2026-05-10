import osmtogeojson from 'osmtogeojson';
import { OverpassData } from '../overpass';
import { FeatureCollection, GeometryObject } from 'geojson';
import { Result, Ok, Err } from '../result';
import { GeojsonError } from '..';

export function getGeojsonFromOverpassData(
  overpassData: OverpassData
): Result<FeatureCollection<GeometryObject>, GeojsonError> {
  try {
    return Ok(osmtogeojson(overpassData));
  } catch (cause) {
    return Err({ type: 'geojson_conversion_failed', cause });
  }
}
