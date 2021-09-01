import React, { useCallback, useEffect, useState } from 'react';

import {
  Redirect,
  Route,
  Switch,
  useRouteMatch,
  useHistory,
} from 'react-router-dom';
import { makeStyles } from '@material-ui/core';

import { useSpectacleContext } from '<src>/contexts/spectacle-provider';
import { InMemorySpectacle } from '@useoptic/spectacle/build/in-memory';
import { IUnrecognizedUrl } from '@useoptic/spectacle';
import NewEndpointsCreator from './NewEndpointsCreator';
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
import { AddEndpointControl } from './AddEndpointContext';

// DebugCaptureEndpointProvider
// ----------------------------
export type EndpointPrototype = {
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

export default function DebugCaptureEndpointProvider({
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
      history.push(`${routeMatch.url}/select`);
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
          <>
            <AddEndpointControl activeStep={0} />
            <DebugCaptureProvider onChangeInteractions={onChangeInteractions} />
          </>
        )}
      />

      <Route
        strict
        path={`${routeMatch.url}/select`}
        render={() =>
          !interactions ? (
            <Redirect to={`${routeMatch.url}/provide`} />
          ) : (
            <>
              <AddEndpointControl activeStep={1} />
              <EndpointsSelector
                interactions={interactions}
                onSubmit={onSubmitEndpointLocations}
              />
            </>
          )
        }
      />

      <Route
        strict
        path={`${routeMatch.url}/learn`}
        render={(props) =>
          learnableEndpoints.length < 1 ? (
            <Redirect to={`${routeMatch.url}/select`} />
          ) : (
            <>
              <AddEndpointControl activeStep={1} />
              <EndpointsLearner
                endpointLocations={learnableEndpoints}
                currentEndpoints={currentEndpoints}
                currentPaths={currentPaths}
                interactions={interactions || []}
                onLearned={onSubmit}
              />
            </>
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
}: {
  onChangeInteractions: (interactions: IHttpInteraction[]) => void;
}) {
  const styles = useDebugCaptureStyles();
  const spectacle = useSpectacleContext() as InMemorySpectacle;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<Error | null>(null);

  const [interactions, setInteractions] = useState<IHttpInteraction[] | null>(
    null
  );

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

// EndpointSelector
// ----------------
function EndpointsSelector({
  interactions,
  onSubmit,
}: {
  interactions: IHttpInteraction[];
  onSubmit: (endpoints: EndpointPrototypeLocation[]) => void;
}) {
  const spectacle = useSpectacleContext() as InMemorySpectacle;
  const [diffError, setDiffError] = useState<Error | null>(null);
  const [undocumentedUrls, setUndocumentedUrls] = useState<
    IUnrecognizedUrl[] | null
  >(null);

  useEffect(() => {
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
    <div>
      {undocumentedUrls && (
        <NewEndpointsCreator
          undocumentedUrls={undocumentedUrls}
          onSubmit={onSubmitEndpoint}
        />
      )}
      {diffError && <div>{diffError.message}</div>}
    </div>
  );
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
