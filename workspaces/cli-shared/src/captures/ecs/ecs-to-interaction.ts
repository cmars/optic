import uuid from 'uuid';
import { IHttpInteraction } from '../../optic-types';
//@todo MIKE 'ecs' needs types
//@todo write tests
export function ecsToHttpInteraction(ecs: any): IHttpInteraction {
  const { request, response } = ecs.host;
  const { query, path, domain } = ecs.url;
  return {
    uuid: uuid.v4(),
    request: {
      host: domain,
      method: request.method,
      path,
      query,
      headers: request.headers,
      body: {
        contentType: request.headers['Content-Type'] || null,
        value: {
          asJsonString: null,
          asText: null,
          shapeHashV1Base64: null,
        },
      },
    },
    response: {
      statusCode: response.status_code,
      headers: response.headers,
      body: {
        contentType: response.headers['Content-Type'] || null,
        value: {
          asJsonString: null,
          asText: null,
          shapeHashV1Base64: null,
        },
      },
    },
    tags: [],
  };
}
