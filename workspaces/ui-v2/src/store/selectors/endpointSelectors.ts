import { IEndpoint, IEndpointWithChanges } from '<src>/types';
import {
  EndpointChangelog,
  ChangelogCategory,
} from '<src>/hooks/useEndpointsChangelog';
import { getEndpointId } from '<src>/utils';

export const filterRemovedEndpoints = (endpoints: IEndpoint[]): IEndpoint[] =>
  endpoints.filter((endpoint) => !endpoint.isRemoved);

/**
 * Filters removed endpoints not removed in changes and joins changelog information
 */
export const filterRemovedEndpointsForChangelogAndMapChanges = (
  endpoints: IEndpoint[],
  endpointChanges: EndpointChangelog[]
): IEndpointWithChanges[] => {
  // key by endpointId
  const endpointChangesByEndpointId = endpointChanges.reduce(
    (acc: Record<string, ChangelogCategory>, endpointChange) => {
      const endpointId = getEndpointId({
        pathId: endpointChange.pathId,
        method: endpointChange.method,
      });
      acc[endpointId] = endpointChange.change.category;
      return acc;
    },
    {}
  );

  // Filter removed endpoints that have no changes to display
  const filteredEndpoints = endpoints.filter((endpoint) => {
    const endpointId = getEndpointId(endpoint);

    // Assumption - if an endpoint is removed, but this batch of changes contains _any_ change for this endpoint
    // we should show this endpoint - the last change you could make is a removal
    // Two assumptions:
    // - You cannot un-remove a specific endpoint (with history, you can undo batches)
    // - You must always view changes compared to the latest version
    return !(endpoint.isRemoved && !endpointChangesByEndpointId[endpointId]);
  });

  const endpointsWithChanges = filteredEndpoints.map((endpoint) => ({
    ...endpoint,
    changes: endpointChangesByEndpointId[getEndpointId(endpoint)] || null,
  }));

  return endpointsWithChanges;
};
