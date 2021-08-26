import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Link,
  Redirect,
  Route,
  Switch,
  useRouteMatch,
  useHistory,
} from 'react-router-dom';
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
import { IUnrecognizedUrl, IOpticEngine } from '@useoptic/spectacle';
import NewEndpointsCreator from './components/NewEndpointsCreator';
import { PathComponentAuthoring, pathMatcher } from '<src>/utils';
import { generatePathCommands } from '<src>/lib/stable-path-batch-generator';
import { IEndpoint, IPath } from '<src>/types';
import {
  CQRSCommand,
  IHttpInteraction,
  LearningResults,
} from '@useoptic/optic-domain';
import { newRandomIdGenerator } from '<src>/lib/domain-id-generator';
import { CurrentSpecContext } from '<src>/lib/Interfaces';
import { recomputePendingEndpointCommands } from '<src>/pages/diffs/contexts/LearnInitialBodiesMachine';

export default function DocumentationPage() {
  const styles = useStyles();
  const routeMatch = useRouteMatch();
  const history = useHistory();

  useFetchEndpoints();
  const endpoints: IEndpoint[] =
    useAppSelector((state) => state.endpoints.results).data?.endpoints || [];
  const paths: IPath[] =
    useAppSelector((state) => state.paths.results).data || [];

  const [learnedEndpoints, setLearnedEndpoints] = useState<EndpointPrototype[]>(
    []
  );

  const onSubmitEndpointPrototypes = useCallback(
    (endpoints: EndpointPrototype[]) => {
      setLearnedEndpoints(endpoints);
      history.push(`${routeMatch.url}/add/review`);
    },
    [history, routeMatch.url]
  );

  return (
    <div className={styles.pageContainer}>
      <Switch>
        <Route
          strict
          path={`${routeMatch.url}/add/debug-capture`}
          render={() => (
            <DebugCaptureEndpointProvider
              currentEndpoints={endpoints}
              currentPaths={paths}
              onSubmit={onSubmitEndpointPrototypes}
            />
          )}
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
          path={`${routeMatch.url}/add/review`}
          render={(props) =>
            learnedEndpoints.length < 1 ? (
              <Redirect to={`${routeMatch.url}/add`} />
            ) : (
              <div>Reviewing {learnedEndpoints.length} learned endpoints</div>
            )
          }
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
          href={`${documentationPath}/add/debug-capture/provide`}
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

// DebugCaptureEndpointProvider
// ----------------------------
type EndpointPrototype = {
  path: string;
  method: string;
  pathId: string;
  commands: CQRSCommand[];
};

type EndpointPrototypeLocation = {
  path: string;
  method: string;
  pathComponents: PathComponentAuthoring[];
};

function DebugCaptureEndpointProvider({
  currentEndpoints,
  currentPaths,

  onSubmit,
}: {
  currentEndpoints: IEndpoint[];
  currentPaths: IPath[];
  onSubmit: (endpoints: EndpointPrototype[]) => void;
}) {
  const routeMatch = useRouteMatch();
  const history = useHistory();

  const [interactions, setInteractions] = useState<IHttpInteraction[] | null>(
    null
  );

  const [learnableEndpoints, setLearnableEndpoints] = useState<
    EndpointPrototypeLocation[]
  >([]);

  const onChangeInteractions = useCallback(
    (interactions: IHttpInteraction[]) => {
      setInteractions(interactions);
    },
    [setInteractions]
  );

  const onSubmitEndpointLocations = useCallback(
    (endpoints: EndpointPrototypeLocation[]) => {
      setLearnableEndpoints(endpoints);
      history.push(`${routeMatch.url}/learn`);
    },
    [history, routeMatch.url, setLearnableEndpoints]
  );

  return (
    <Switch>
      <Route
        strict
        path={`${routeMatch.url}/provide`}
        render={() => (
          <DebugCaptureProvider
            onChangeInteractions={onChangeInteractions}
            onSubmit={onSubmitEndpointLocations}
          />
        )}
      />

      <Route
        strict
        path={`${routeMatch.url}/learn`}
        render={(props) =>
          learnableEndpoints.length < 1 ? (
            <Redirect to={`${routeMatch.url}/provide`} />
          ) : (
            <EndpointsLearner
              endpointLocations={learnableEndpoints}
              currentEndpoints={currentEndpoints}
              currentPaths={currentPaths}
              interactions={interactions || []}
              onLearned={onSubmit}
            />
          )
        }
      />
    </Switch>
  );
}

// DebugCaptureProvider
// --------------------

function DebugCaptureProvider({
  onChangeInteractions,
  onSubmit,
}: {
  onChangeInteractions: (interactions: IHttpInteraction[]) => void;
  onSubmit: (endpoints: EndpointPrototypeLocation[]) => void;
}) {
  const styles = useDebugCaptureStyles();
  const spectacle = useSpectacleContext() as InMemorySpectacle;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<Error | null>(null);
  const [diffError, setDiffError] = useState<Error | null>(null);
  const [interactions, setInteractions] = useState<IHttpInteraction[] | null>(
    null
  );
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

    extractInteractions(selectedFile).then(setInteractions, setFileError);
  }, [selectedFile, setInteractions, setFileError]);

  useEffect(() => {
    if (!interactions) return;
    onChangeInteractions(interactions);
  }, [interactions]);

  useEffect(() => {
    if (!interactions) return;

    extractUndocumentedUrls(interactions, spectacle).then(
      setUndocumentedUrls,
      setDiffError
    );
  }, [interactions, spectacle, setUndocumentedUrls, setDiffError]);

  const onSubmitEndpoint = useCallback(
    (endpoints: EndpointPrototypeLocation[]) => {
      if (onSubmit) onSubmit(endpoints);
    },
    [onSubmit]
  );

  return (
    <div className={styles.container}>
      <h3>Adding a new endpoint from a debug capture</h3>

      {!selectedFile ? (
        <input type="file" onChange={onChangeFile} accept="application/json" />
      ) : (
        <div>
          {!interactions && (
            <>
              <div>Filename: {selectedFile.name}</div>
              <div>Size: {selectedFile.size}</div>
            </>
          )}

          {undocumentedUrls && (
            <NewEndpointsCreator
              undocumentedUrls={undocumentedUrls}
              onSubmit={onSubmitEndpoint}
            />
          )}
        </div>
      )}

      {fileError && <div>{fileError.message}</div>}
      {diffError && <div>{diffError.message}</div>}
    </div>
  );
}

const useDebugCaptureStyles = makeStyles((theme) => ({
  container: {
    marginBottom: theme.spacing(4),
  },
  unrecognizedUrlsList: {},
}));

async function extractInteractions(
  sourceFile: File
): Promise<IHttpInteraction[]> {
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

  return interactions as IHttpInteraction[];
}

async function extractUndocumentedUrls(
  interactions: IHttpInteraction[],
  spectacle: InMemorySpectacle
): Promise<IUnrecognizedUrl[]> {
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

// EndpointsLearner
// ----------------

function EndpointsLearner({
  endpointLocations,
  currentEndpoints,
  currentPaths,
  interactions,
  onLearned,
}: {
  endpointLocations: EndpointPrototypeLocation[];
  currentEndpoints: IEndpoint[];
  currentPaths: IPath[];
  interactions: IHttpInteraction[];
  onLearned: (endpoints: EndpointPrototype[]) => void;
}) {
  const spectacle = useSpectacleContext() as InMemorySpectacle;
  const [generatedEndpoints, setGeneneratedEndpoints] = useState<any[] | null>(
    null
  );
  const [learningError, setLearningError] = useState<Error | null>(null);

  useEffect(() => {
    if (!spectacle || !endpointLocations) return; // wait for dependencies
    if (generatedEndpoints) return; // already started learning

    setGeneneratedEndpoints([]);

    const learning = (async () => {
      const generatingEndpoints = learnEndpointsCommands(
        endpointLocations,
        currentEndpoints,
        currentPaths,
        interactions,
        spectacle
      );
      for await (const generatedEndpoint of generatingEndpoints) {
        setGeneneratedEndpoints((prev) => [...(prev || []), generatedEndpoint]);
      }
    })();

    learning.catch(setLearningError);
  }, [
    endpointLocations,
    currentEndpoints,
    currentPaths,
    spectacle,
    generatedEndpoints,
  ]);

  useEffect(() => {
    if (
      generatedEndpoints &&
      endpointLocations.length === generatedEndpoints.length
    ) {
      onLearned(generatedEndpoints);
    }
  }, [generatedEndpoints, endpointLocations]);

  return (
    <div>
      <div>
        Learned {generatedEndpoints?.length || 0} / {endpointLocations.length}{' '}
        endpoints...
      </div>

      {learningError && <div>{learningError.message}</div>}
    </div>
  );
}

async function* learnEndpointsCommands(
  newEndpoints: {
    path: string;
    method: string;
    pathComponents: PathComponentAuthoring[];
  }[],
  currentSpecEndpoints: IEndpoint[],
  currentSpecPaths: IPath[],
  interactions: IHttpInteraction[],
  spectacle: InMemorySpectacle
): AsyncGenerator<{
  commands: CQRSCommand[];
  pathId: string;
  method: string;
  path: string;
}> {
  const opticEngine = spectacle.opticContext.opticEngine;
  const baseEvents = await spectacle.opticContext.specRepository.listEvents();
  const baseEventsString = JSON.stringify(baseEvents);

  const currentSpecContext: CurrentSpecContext = {
    currentSpecPaths,
    currentSpecEndpoints,
    domainIds: newRandomIdGenerator(),
    idGeneratorStrategy: 'random',
    opticEngine,
  };

  for (const { path, method, pathComponents } of newEndpoints) {
    let id = 'generated_endpoint';

    // path commands
    const { commands: pathCommands, endpointPathIdMap } = generatePathCommands(
      [
        {
          pathPattern: path,
          id,
          matchesPattern: (a, b) => true,
          method,
          ref: undefined,
        },
      ],
      currentSpecContext
    );

    let pathId = endpointPathIdMap[id]!;
    const pathEvents = opticEngine.try_apply_commands(
      JSON.stringify(pathCommands),
      baseEventsString,
      'simulated-batch',
      'simulated changes',
      'simulated-client',
      'simulated-session'
    );

    const engineSpec = opticEngine.spec_from_events(
      JSON.stringify([...baseEvents, ...JSON.parse(pathEvents)])
    );
    // body commands
    let isEndpointPath = pathMatcher(pathComponents);
    let endpointInteractions = interactions.filter(
      (interaction) =>
        isEndpointPath(interaction.request.path) &&
        interaction.request.method === method
    );

    const interactionsJsonl = endpointInteractions
      .map((x: IHttpInteraction) => {
        return JSON.stringify(x);
      })
      .join('\n');

    const learnedBodies = JSON.parse(
      opticEngine.learn_undocumented_bodies(
        engineSpec,
        interactionsJsonl,
        'random'
      )
    )[0] as LearningResults.UndocumentedEndpointBodies.LearnedBodies;

    let queryParameterCommands: CQRSCommand[] =
      learnedBodies?.queryParameters?.commands || [];
    let requestsCommands: CQRSCommand[] =
      learnedBodies?.requests.flatMap((request) => request.commands) || [];
    let responsesCommands: CQRSCommand[] =
      learnedBodies?.responses.flatMap((response) => response.commands) || [];

    let commands = [
      ...pathCommands,
      ...queryParameterCommands,
      ...requestsCommands,
      ...responsesCommands,
    ];

    yield { commands, pathId, method, path };
  }
}
