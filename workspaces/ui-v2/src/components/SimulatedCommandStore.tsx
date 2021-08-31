import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { LinearProgress } from '@material-ui/core';

import { CQRSCommand } from '@useoptic/optic-domain';
import { IForkableSpectacle } from '@useoptic/spectacle';
import { SpectacleStore } from '<src>/contexts/spectacle-provider';
import { createReduxStore, useAppSelector } from '<src>/store';
import { useLastBatchCommitId } from '<src>/hooks/useBatchCommits';

type SimulatedCommandStoreProps = {
  spectacle: IForkableSpectacle;
  previewCommands: CQRSCommand[];
  children: (batchId: string | undefined) => React.ReactElement;
};

type SimulatedCommandContextValue = {
  previewCommands: CQRSCommand[];
};

export const SimulatedCommandContext = React.createContext<SimulatedCommandContextValue>(
  { previewCommands: [] }
);

export function SimulatedCommandStore(props: SimulatedCommandStoreProps) {
  const batchId = useLastBatchCommitId();
  const value = { previewCommands: props.previewCommands };
  const [isProcessing, setIsProcessing] = useState(true);
  const store = useMemo(() => createReduxStore(), []);
  const [simulated, setSimulated] = useState<IForkableSpectacle | undefined>(
    undefined
  );
  const clientSessionId = useAppSelector(
    (state) => state.metadata.data?.sessionId! || 'simulated-client-session'
  );
  useEffect(() => {
    async function task() {
      const simulated = await props.spectacle.fork();
      await simulated.mutate({
        query: `
mutation X($commands: [JSON!]!, $batchCommitId: ID!, $commitMessage: String!, $clientId: ID!, $clientSessionId: ID!) {
  applyCommands(commands: $commands, batchCommitId: $batchCommitId, commitMessage: $commitMessage, clientId: $clientId, clientSessionId: $clientSessionId) {
    batchCommitId
  }
}
        `,
        variables: {
          commands: props.previewCommands,
          batchCommitId: uuidv4(),
          commitMessage: 'proposed changes',
          clientId: 'simulation-agent', //@TODO: in the future, for features based on the clientId to make sense in the simulated ui, we may need to provide a real id here
          clientSessionId,
        },
      });
      //@ts-ignore
      simulated.thiscontext = 'simulated';
      //@ts-ignore
      simulated.instanceId = uuidv4();
      setSimulated(simulated);
      setIsProcessing(false);
    }

    task();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props.previewCommands)]);

  if (isProcessing) {
    return <LinearProgress variant="indeterminate" />;
  }

  const spectacleToUse = simulated ? simulated : props.spectacle;

  return (
    <SimulatedCommandContext.Provider value={value}>
      <SpectacleStore spectacle={spectacleToUse}>
        <Provider store={store}>{props.children(batchId)}</Provider>
      </SpectacleStore>
    </SimulatedCommandContext.Provider>
  );
}

export function useSimulatedCommands() {
  const { previewCommands } = useContext(SimulatedCommandContext);
  return previewCommands;
}
