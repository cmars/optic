import { useSpectacleQuery } from '<src>/contexts/spectacle-provider';
import { IChanges } from '<src>/pages/changelog/IChanges';

const EndpointBodyQueryWithoutChanges = `
{
  requests {
    id
    pathId
    method
    requestContributions
    query {
      rootShapeId
      isRemoved
    }
    bodies {
      contentType
      rootShapeId
    }
    responses {
      id
      statusCode
      contributions
      bodies {
        contentType
        rootShapeId
      }
    }
  }
}`;

const EndpointBodyQueryWithChanges = `
query X($sinceBatchCommitId: String) {
  requests {
    id
    pathId
    method
    requestContributions
    changes(sinceBatchCommitId: $sinceBatchCommitId) {
      added
      changed
    }
    query {
      rootShapeId
      isRemoved
    }
    bodies {
      contentType
      rootShapeId
    }
    responses {
      id
      statusCode
      contributions
      changes(sinceBatchCommitId: $sinceBatchCommitId) {
        added
        changed
      }
      bodies {
        contentType
        rootShapeId
      }
    }
  }
}`;

type Body = {
  contentType: string;
  rootShapeId: string;
};

type EndpointBodyQueryResponse = {
  requests: {
    id: string;
    pathId: string;
    method: string;
    requestContributions: Record<string, string>;
    bodies: Body[];
    query?: {
      rootShapeId: string;
      isRemoved: boolean;
    };
    changes?: IChanges;
    responses: {
      id: string;
      statusCode: number;
      contributions: Record<string, string>;
      changes?: IChanges;
      bodies: Body[];
    }[];
  }[];
};

export function useEndpointBody(
  pathId: string,
  method: string,
  renderChangesSince?: string
): {
  query: IQueryParameters | null;
  requests: IRequestBody[];
  responses: IResponseBody[];
} {
  const spectacleInput =
    typeof renderChangesSince === 'undefined'
      ? {
          query: EndpointBodyQueryWithoutChanges,
          variables: {},
        }
      : {
          query: EndpointBodyQueryWithChanges,
          variables: {
            sinceBatchCommitId: renderChangesSince,
          },
        };

  const { data, error } = useSpectacleQuery<
    EndpointBodyQueryResponse,
    {
      sinceBatchCommitId?: string;
    }
  >(spectacleInput);
  if (error) {
    console.error(error);
    debugger;
  }
  if (!data) {
    return { query: null, requests: [], responses: [] };
  } else {
    const request = data.requests.find(
      (i) => i.pathId === pathId && i.method === method
    );
    if (!request) {
      return { query: null, requests: [], responses: [] };
    }
    const requests: IRequestBody[] = request.bodies.map((body: any) => {
      return {
        requestId: request.id,
        contentType: body.contentType,
        rootShapeId: body.rootShapeId,
        pathId: request.pathId,
        method: request.method,
        changes: request.changes,
        description: request.requestContributions.description || '',
      };
    });
    const responses: IResponseBody[] = request.responses.flatMap((response) => {
      return response.bodies.map(
        (body): IResponseBody => {
          return {
            statusCode: response.statusCode,
            responseId: response.id,
            contentType: body.contentType,
            rootShapeId: body.rootShapeId,
            pathId: request.pathId,
            method: request.method,
            changes: response.changes,
            description: response.contributions.description || '',
          };
        }
      );
    });
    const sortedResponses = [...responses].sort(
      (a, b) => a.statusCode - b.statusCode
    );

    return {
      query: request.query || null,
      requests,
      responses: sortedResponses,
    };
  }
}

export interface IQueryParameters {
  rootShapeId: string;
  isRemoved: boolean;
}

export interface IRequestBody {
  requestId: string;
  contentType: string;
  rootShapeId: string;
  pathId: string;
  method: string;
  description: string;
  changes?: IChanges;
}

export interface IResponseBody {
  responseId: string;
  statusCode: number;
  contentType: string;
  rootShapeId: string;
  pathId: string;
  method: string;
  description: string;
  changes?: IChanges;
}
