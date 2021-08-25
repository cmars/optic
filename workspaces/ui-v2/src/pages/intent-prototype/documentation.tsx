import React, { useCallback, useEffect, useState } from 'react';

import { Link, Switch, Route, useRouteMatch } from 'react-router-dom';
import { makeStyles } from '@material-ui/core';
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardActions,
} from '@material-ui/core';

import { EndpointName } from '<src>/components';

import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';
import { useSpectacleContext } from '<src>/contexts/spectacle-provider';
import {
  useAppSelector,
  useAppDispatch,
  selectors,
  documentationEditActions,
} from '<src>/store';
import { InMemorySpectacle } from '@useoptic/spectacle/build/in-memory';
import { IUnrecognizedUrl } from '@useoptic/spectacle';
import NewEndpointsCreator from './components/NewEndpointsCreator';
import { PathComponentAuthoring } from '<src>/utils';

export default function DocumentationPage() {
  const styles = useStyles();
  const routeMatch = useRouteMatch();

  useFetchEndpoints();
  const endpoints = useAppSelector((state) => state.endpoints.results).data
    ?.endpoints;

  return (
    <div className={styles.pageContainer}>
      <Switch>
        <Route
          strict
          path={`${routeMatch.url}/add/debug-capture`}
          component={DebugCaptureProvider}
        />

        <Route
          strict
          path={`${routeMatch.url}/add/other`}
          render={(props) => (
            <div>Interested in this capture method? Let us know</div>
          )}
        />

        <Route
          strict
          path={`${routeMatch.url}/add`}
          render={(props) => (
            <CaptureMethodSelector documentationPath={routeMatch.url} />
          )}
        />

        <Route
          render={(props) => (
            <Button
              color="primary"
              to={`${routeMatch.url}/add`}
              component={Link}
              variant="contained"
            >
              Add Endpoint
            </Button>
          )}
        />
      </Switch>

      {endpoints && endpoints.length > 0 ? (
        <ul className={styles.endpointsList}>
          {endpoints?.map((endpoint) => (
            <li key={endpoint.id}>
              <EndpointName
                fontSize={19}
                leftPad={0}
                method={endpoint.method}
                fullPath={endpoint.fullPath}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div>No documented endpoints yet</div>
      )}
    </div>
  );
}

function CaptureMethodSelector({
  documentationPath,
}: {
  documentationPath: string;
}) {
  const styles = useStyles();

  return (
    <div>
      <h2>Choose the source of data Optic can learn from</h2>

      <div className={styles.captureMethods}>
        <CaptureMethodCard
          href={`${documentationPath}/add/debug-capture`}
          title="Debug capture"
          description="Add a new endpoint through uploading a debug capture"
        />

        <CaptureMethodCard
          href={`${documentationPath}/add/other`}
          title="Observe traffic locally"
          description="Use the Optic Capture Toolkit to observe traffic from your local
                API environment"
        />

        <CaptureMethodCard
          href={`${documentationPath}/add/other`}
          title="Import OpenAPI"
          description="Allow Optic to learn by uploading your existing OpenAPI spec"
        />
      </div>
    </div>
  );
}

function CaptureMethodCard({
  title,
  description,
  href,
}: {
  title?: string;
  description?: string;
  href: string;
}) {
  const styles = useStyles();

  return (
    <Card className={styles.captureMethodCard}>
      <CardActionArea to={href} component={Link}>
        <CardContent>
          <h3>{title}</h3>

          <p>{description}</p>
        </CardContent>
      </CardActionArea>

      <CardActions>
        <Button size="small">Learn More</Button>
        <Button
          to={href}
          component={Link}
          size="small"
          color="primary"
          variant="contained"
        >
          Start
        </Button>
      </CardActions>
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  pageContainer: {
    padding: theme.spacing(3, 4),
  },

  endpointsList: {
    listStyleType: 'none',
    padding: 0,
  },

  captureMethods: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  captureMethodCard: {
    maxWidth: 400,
    marginRight: theme.spacing(2),

    '& h3': {
      marginTop: 0,
    },
  },
}));

// DebugCaptureProvider
// --------------------

function DebugCaptureProvider() {
  const styles = useDebugCaptureStyles();
  const spectacle = useSpectacleContext() as InMemorySpectacle;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<Error | null>(null);
  const [undocumentedUrls, setUndocumentedUrls] = useState<
    IUnrecognizedUrl[] | null
  >(null);

  const onChangeFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let files = e.target.files;
    if (!files) return;

    setSelectedFile(files[0]);
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/json') {
      setFileError(new Error('A valid Optic debug capture is required'));
    }

    extractUndocumentedUrls(selectedFile, spectacle).then(
      setUndocumentedUrls,
      setFileError
    );
  }, [selectedFile, spectacle]);

  const onSubmitEndpoint = useCallback(
    (
      endpoints: {
        path: string;
        method: string;
        pathComponents: PathComponentAuthoring[];
      }[]
    ) => {
      console.log('learning endpoints', endpoints);
    },
    []
  );

  return (
    <div className={styles.container}>
      <h3>Adding a new endpoint from a debug capture</h3>

      {!selectedFile ? (
        <input type="file" onChange={onChangeFile} accept="application/json" />
      ) : (
        <div>
          {!undocumentedUrls ? (
            <>
              <div>Filename: {selectedFile.name}</div>
              <div>Size: {selectedFile.size}</div>
            </>
          ) : (
            <NewEndpointsCreator
              undocumentedUrls={undocumentedUrls}
              onSubmit={onSubmitEndpoint}
            />
          )}
        </div>
      )}

      {fileError && <div>{fileError.message}</div>}
    </div>
  );
}

const useDebugCaptureStyles = makeStyles((theme) => ({
  container: {
    marginBottom: theme.spacing(4),
  },
  unrecognizedUrlsList: {},
}));

async function extractUndocumentedUrls(
  sourceFile: File,
  spectacle: InMemorySpectacle
): Promise<IUnrecognizedUrl[]> {
  let maybeJson = await sourceFile.text();
  let json = await new Promise<{ [key: string]: any }>((resolve, reject) => {
    try {
      let result = JSON.parse(maybeJson);
      setImmediate(() => resolve(result)); // give the event loop a tick in case we parsed something huge
    } catch (err) {
      setImmediate(() => reject(err));
    }
  });

  let interactions = json.session?.samples;
  if (!interactions && !Array.isArray(interactions)) {
    throw new Error('Could not find interactions in file');
  }

  let forkedSpectacle = (await spectacle.fork(
    interactions
  )) as InMemorySpectacle;

  let diffId = 'provided-debug-capture';

  let diff = await forkedSpectacle.opticContext.capturesService.startDiff(
    diffId,
    'example-session' // magic
  );

  let diffService = await diff.onComplete;

  // TODO: include cases where path is known but no requests / responses were documented?
  return (await diffService.listUnrecognizedUrls()).urls;
}
