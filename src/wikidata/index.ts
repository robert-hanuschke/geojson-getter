import { Result, Ok, Err } from '../result';

export type WikidataError =
  | { type: 'network_error'; cause: unknown }
  | { type: 'http_error'; status: number };

// incomplete, only showing properties relevant for our use case
export interface Wikidata {
  labels: { [key: string]: string };
  statements: {
    P402?: [
      {
        value: { content: string };
      },
    ];
  };
}

export async function getOsmRelationIdFromWikidataId(
  wikidataId: string
): Promise<Result<string | undefined, WikidataError>> {
  let response: Response;
  try {
    response = await fetch(
      `https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items/${wikidataId}?_fields=statements`
    );
  } catch (cause) {
    return Err({ type: 'network_error', cause });
  }

  if (!response.ok) {
    return Err({ type: 'http_error', status: response.status });
  }

  const jsonResponse = (await response.json()) as Wikidata;
  return Ok(jsonResponse.statements['P402']?.[0]?.value.content);
}
