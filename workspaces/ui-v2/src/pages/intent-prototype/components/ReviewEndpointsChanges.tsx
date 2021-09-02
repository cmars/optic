import React, { FC, useMemo, useState, useCallback } from 'react';
import {
  Link,
  Switch,
  Redirect,
  Route,
  useRouteMatch,
  useHistory,
  RouteComponentProps,
  match,
} from 'react-router-dom';
import { makeStyles, Button, Breadcrumbs, Paper } from '@material-ui/core';
import { v4 as uuidv4 } from 'uuid';

import {
  useChangelogPages,
  useChangelogEndpointPageLink,
} from '<src>/components/navigation/Routes';

import { createReduxStore } from '<src>/store';
import { EndpointPrototype } from './DebugCaptureEndpointProvider';
import {
  CommitMessageModal,
  EndpointName,
  SimulatedCommandStore,
} from '<src>/components';
import { useSpectacleContext } from '<src>/contexts/spectacle-provider';
import { ChangelogRootPage as ChangelogList } from '<src>/pages/changelog/ChangelogListPage';
import { ChangelogRootComponent as ChangelogEndpoint } from '<src>/pages/changelog/ChangelogEndpointRootPage';

import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';
import { CQRSCommand } from '@useoptic/optic-domain';
import { IForkableSpectacle } from '@useoptic/spectacle';

export default function ReviewEndpointsChangesContainer({
  learnedEndpoints,
  documentationPath,
}: {
  learnedEndpoints: EndpointPrototype[];
  documentationPath: string;
}) {
  const spectacle = useSpectacleContext();
  const history = useHistory();

  const previewCommands = useMemo(
    () => learnedEndpoints.flatMap((endpoint) => endpoint.commands),
    [learnedEndpoints]
  );

  let onCommit = useCallback(
    async (commands, commitMessage) => {
      await commitCommands(commands, commitMessage, spectacle);
      history.push(documentationPath);
    },
    [spectacle, history, documentationPath]
  );

  return (
    <SimulatedCommandStore
      spectacle={spectacle}
      previewCommands={previewCommands}
    >
      {(simulatedBatchId) => (
        <ReviewEndpointsChanges
          learnedEndpoints={learnedEndpoints}
          simulatedBatchId={simulatedBatchId}
          onCommit={onCommit}
        />
      )}
    </SimulatedCommandStore>
  );
}

function ReviewEndpointsChanges({
  learnedEndpoints,
  simulatedBatchId,

  onCommit,
}: {
  learnedEndpoints: EndpointPrototype[];
  simulatedBatchId?: string;
  onCommit: (commands: CQRSCommand[], commitMessage: string) => Promise<void>;
}) {
  const routeMatch = useRouteMatch();

  useFetchEndpoints();
  const changelogPages = useChangelogPages();
  const changelogEndpointPageLink = useChangelogEndpointPageLink();

  const [isCommitting, setIsCommitting] = useState(false);

  const onStartCommit = useCallback(() => {
    setIsCommitting(true);
  }, [setIsCommitting]);

  const onCancelCommit = useCallback(() => {
    setIsCommitting(false);
  }, [setIsCommitting]);

  const onSubmitCommit = useCallback(
    async (commitMessage: string) => {
      await onCommit(
        learnedEndpoints.flatMap(({ commands }) => commands),
        commitMessage
      );
    },
    [onCommit, learnedEndpoints]
  );

  const styles = useStyles();

  return (
    <div className={styles.container}>
      {simulatedBatchId && (
        <Switch>
          <Route
            exact
            path={`${routeMatch.url}/paths/:pathId/methods/:method`}
            render={(props) => (
              <ReviewEndpoint
                {...props}
                batchId={simulatedBatchId}
                rootPath={routeMatch.url}
                learnedEndpoints={learnedEndpoints}
                onStartCommit={onStartCommit}
              />
            )}
          />
          <Route
            render={() => (
              <>
                <ReviewContext
                  learnedEndpoints={learnedEndpoints}
                  rootPath={routeMatch.url}
                  onClickSave={onStartCommit}
                />
                <ChangelogList changelogBatchId={simulatedBatchId} />
              </>
            )}
          />

          <Redirect to={changelogPages.path} />
        </Switch>
      )}

      {isCommitting && (
        <CommitMessageModal
          onClose={onCancelCommit}
          onSave={onSubmitCommit}
          dialogText={`You have added ${learnedEndpoints.length} new ${
            learnedEndpoints.length === 1 ? 'endpoint' : 'endpoints'
          }`}
        />
      )}
    </div>
  );
}

async function commitCommands(
  commands: CQRSCommand[],
  commitMessage: string,
  spectacle: IForkableSpectacle
) {
  try {
    await spectacle.mutate<any, any>({
      query: `
        mutation X($commands: [JSON!]!, $batchCommitId: ID!, $commitMessage: String!, $clientId: ID!, $clientSessionId: ID!) {
    applyCommands(commands: $commands, batchCommitId: $batchCommitId, commitMessage: $commitMessage, clientId: $clientId, clientSessionId: $clientSessionId) {
      batchCommitId
    }
  }`,
      variables: {
        commands,
        batchCommitId: uuidv4(),
        commitMessage: commitMessage,
        clientId: 'intention ui prototype client',
        clientSessionId: 'intention ui prototype session',
      },
    });
  } catch (e) {
    console.error(e);
    debugger;
  }
}

const ReviewEndpoint: FC<
  RouteComponentProps<{
    pathId: string;
    method: string;
  }> & {
    batchId: string;
    rootPath: string;
    learnedEndpoints: EndpointPrototype[];

    onStartCommit: () => void;
  }
> = (props) => {
  let { pathId, method } = props.match.params;
  let currentEndpoint = props.learnedEndpoints.find(
    (endpoint) => endpoint.pathId === pathId && endpoint.method == method
  );

  let changelogProps = {
    history: props.history,
    location: props.location,
    statisContext: props.staticContext,
    match: {
      ...props.match,
      params: { pathId, method, batchId: props.batchId },
    },
  };

  if (!currentEndpoint) {
    return <Redirect to={props.rootPath} />;
  }

  return (
    <>
      <ReviewContext
        learnedEndpoints={props.learnedEndpoints}
        currentEndpoint={currentEndpoint}
        rootPath={props.rootPath}
        onClickSave={props.onStartCommit}
      />
      <ChangelogEndpoint {...changelogProps} />
    </>
  );
};

function ReviewContext({
  currentEndpoint,
  learnedEndpoints,
  rootPath,
  onClickSave,
}: {
  currentEndpoint?: EndpointPrototype;
  learnedEndpoints: EndpointPrototype[];
  rootPath: string;

  onClickSave: () => void;
}) {
  const styles = useStyles();

  const onClickSaveHandler = useCallback(
    (e) => {
      e.preventDefault();
      onClickSave();
    },
    [onClickSave]
  );

  return (
    <Paper className={styles.reviewContext}>
      <Breadcrumbs className={styles.reviewBreadcrumbs}>
        <div>Review and edit</div>
        <Link className={styles.reviewEndpointCount} to={rootPath}>
          {learnedEndpoints.length} new endpoints
        </Link>
        {currentEndpoint && (
          <EndpointName
            method={currentEndpoint.method}
            fullPath={currentEndpoint.path}
            leftPad={0}
            fontSize={15}
          />
        )}
      </Breadcrumbs>
      <div className={styles.reviewControls}>
        <Button
          variant="contained"
          color="primary"
          onClick={onClickSaveHandler}
        >
          Save changes
        </Button>
      </div>
    </Paper>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    height: '100vh',
    position: 'relative',
    // overflowY: 'scroll',
  },

  reviewContext: {
    position: 'sticky',
    padding: theme.spacing(3, 4),
    top: theme.spacing(3),
    zIndex: 1000,

    display: 'flex',
    justifyContent: 'space-between',
  },
  reviewBreadcrumbs: {},
  reviewControls: {},
  reviewEndpointCount: {},
}));
