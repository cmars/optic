import React, { useMemo } from 'react';

import { createReduxStore } from '<src>/store';
import { EndpointPrototype } from './DebugCaptureEndpointProvider';
import { SimulatedCommandStore } from '<src>/components';
import { useSpectacleContext } from '<src>/contexts/spectacle-provider';
import { ChangelogRootPage } from '<src>/pages/changelog/ChangelogListPage';
import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';
import { CQRSCommand } from '@useoptic/optic-domain';

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
  useFetchEndpoints();

  return (
    <div>
      <h3>Reviewing {learnedEndpoints.length} endpoints</h3>

      {simulatedBatchId && (
        <ChangelogRootPage changelogBatchId={simulatedBatchId} />
      )}
    </div>
  );
}
