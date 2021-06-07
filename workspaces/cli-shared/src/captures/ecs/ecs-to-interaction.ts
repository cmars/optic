import uuid from 'uuid';
import { IHttpInteraction } from '@useoptic/optic-domain';
import niceTry from 'nice-try';
//@todo MIKE 'ecs' needs types
//@todo write tests
export function ecsToHttpInteraction(ecs: any): IHttpInteraction {
  const { request, response } = ecs.http;
  const { path, domain } = ecs.url;

  function extractBody(message: any) {
    const content = message.body.content;
    if (typeof content === 'string') {
      return {
        asJsonString: niceTry(() => JSON.parse(content)) || null,
        asText: content,
        shapeHashV1Base64: null,
      };
    } else {
      return {
        asJsonString: null,
        asText: null,
        shapeHashV1Base64: null,
      };
    }
  }

  return {
    uuid: uuid.v4(),
    request: {
      host: domain,
      method: request.method,
      path,
      query: {
        asJsonString: null,
        asText: null,
        shapeHashV1Base64: null,
      },
      headers: {
        asJsonString: null,
        asText: null,
        shapeHashV1Base64: null,
      },
      body: {
        contentType: request.headers['content-type'] || null,
        value: extractBody(request),
      },
    },
    response: {
      statusCode: response.status_code,
      headers: {
        asJsonString: null,
        asText: null,
        shapeHashV1Base64: null,
      },
      body: {
        contentType: response.headers['content-type'] || null,
        value: extractBody(response),
      },
    },
    tags: [],
  };
}
