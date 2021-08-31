import React, { useMemo } from 'react';
import { Switch, Redirect, Route, useRouteMatch } from 'react-router-dom';

import {
  useChangelogPages,
  useChangelogEndpointPageLink,
} from '<src>/components/navigation/Routes';

import { createReduxStore } from '<src>/store';
import { EndpointPrototype } from './DebugCaptureEndpointProvider';
import { SimulatedCommandStore } from '<src>/components';
import { useSpectacleContext } from '<src>/contexts/spectacle-provider';
import { ChangelogRootPage as ChangelogList } from '<src>/pages/changelog/ChangelogListPage';
import { ChangelogRootComponent as ChangelogEndpoint } from '<src>/pages/changelog/ChangelogEndpointRootPage';

import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';

export default function ReviewEndpointsChangesContainer({
  learnedEndpoints,
}: {
  learnedEndpoints: EndpointPrototype[];
}) {
  const spectacle = useSpectacleContext();

  const previewCommands = useMemo(
    () => learnedEndpoints.flatMap((endpoint) => endpoint.commands),
    [learnedEndpoints]
  );

  let simulatedStore = useMemo(createReduxStore, [learnedEndpoints]);

  return (
    <SimulatedCommandStore
      spectacle={spectacle}
      previewCommands={previewCommands}
    >
      {(simulatedBatchId) => (
        <ReviewEndpointsChanges
          learnedEndpoints={learnedEndpoints}
          simulatedBatchId={simulatedBatchId}
        />
      )}
    </SimulatedCommandStore>
  );
}

function ReviewEndpointsChanges({
  learnedEndpoints,
  simulatedBatchId,
}: {
  learnedEndpoints: EndpointPrototype[];
  simulatedBatchId?: string;
}) {
  const routeMatch = useRouteMatch();

  useFetchEndpoints();
  const changelogPages = useChangelogPages();
  const changelogEndpointPageLink = useChangelogEndpointPageLink();

  return (
    <div>
      <h3>Reviewing {learnedEndpoints.length} endpoints</h3>

      {simulatedBatchId && (
        <Switch>
          <Route
            exact
            path={`${routeMatch.url}/paths/:pathId/methods/:method`}
            component={ChangelogEndpoint}
          />
          <Route
            render={() => <ChangelogList changelogBatchId={simulatedBatchId} />}
          />
          <Redirect to={changelogPages.path} />
        </Switch>
      )}
    </div>
  );
}
