import {
  getPathsRelativeToCwd,
  IOpticTaskRunnerConfig,
  parseRule,
  readApiConfig,
} from '@useoptic/cli-config';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs-extra';
import Bottleneck from 'bottleneck';

import sortBy from 'lodash.sortby';
import { DefaultIdGenerator, developerDebugLogger } from '@useoptic/cli-shared';
import { makeRouter as makeCaptureRouter } from './capture-router';
import { LocalCaptureInteractionPointerConverter } from '@useoptic/cli-shared/build/captures/avro/file-system/interaction-iterator';
import { IgnoreFileHelper } from '@useoptic/cli-config/build/helpers/ignore-file-interface';
import { SessionsManager } from '../sessions';
import { patchInitialTaskOpticYaml } from '@useoptic/cli-config/build/helpers/patch-optic-config';
import { getSpecEventsFrom } from '@useoptic/cli-config/build/helpers/read-specification-json';

import { makeSpectacle } from '@useoptic/spectacle';
import { graphqlHTTP } from 'express-graphql';
import { LocalCliOpticContextBuilder } from '../spectacle';

type CaptureId = string;
type Iso8601Timestamp = string;
export type InvalidCaptureState = {
  captureId: CaptureId;
  status: 'unknown';
};

export function isValidCaptureState(x: CaptureState): x is ValidCaptureState {
  return x.status === 'started' || x.status === 'completed';
}

export type ValidCaptureState = {
  captureId: CaptureId;
  status: 'started' | 'completed';
  metadata: {
    taskConfig: IOpticTaskRunnerConfig;
    startedAt: Iso8601Timestamp;
    taskName?: string;
    lastInteraction: {
      count: number;
      observedAt: Iso8601Timestamp;
    } | null;
  };
};
export type CaptureState = InvalidCaptureState | ValidCaptureState;

const captureStateFileName = 'optic-capture-state.json';

export class CapturesHelpers {
  constructor(private basePath: string) {}

  async validateCaptureId(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const { captureId } = req.params;
    const captureDirectoryPath = this.captureDirectory(captureId);
    const exists = await fs.pathExists(captureDirectoryPath);
    if (exists) {
      return next();
    } else {
      return res.sendStatus(404);
    }
  }

  async listCaptureIds(): Promise<CaptureId[]> {
    const captureIds = await fs.readdir(this.basePath);
    return captureIds;
  }

  async loadCaptureState(captureId: CaptureId): Promise<CaptureState> {
    const stateFilePath = this.stateFile(captureId);
    const stateFileExists = await fs.pathExists(stateFilePath);
    if (!stateFileExists) {
      return {
        captureId,
        status: 'unknown',
      };
    }
    const state = await fs.readJson(stateFilePath);
    return state;
  }

  async updateCaptureState(state: CaptureState): Promise<void> {
    await fs.ensureDir(this.captureDirectory(state.captureId));
    const stateFilePath = this.stateFile(state.captureId);
    await fs.writeJson(stateFilePath, state);
  }

  async listCapturesState(): Promise<CaptureState[]> {
    const captureIds = await this.listCaptureIds();
    const promises = captureIds.map((captureId) => {
      return this.loadCaptureState(captureId);
    });
    const capturesState = await Promise.all(promises);
    return capturesState.filter((x) => x !== null);
  }

  async loadCaptureSummary(captureId: CaptureId) {
    const captureDirectory = this.captureDirectory(captureId);
    const files = await fs.readdir(captureDirectory);
    const interactions = files.filter((x) => x.startsWith('interactions-'));
    const promises = interactions.map((x) => {
      return fs.readJson(path.join(captureDirectory, x));
    });
    const summaries = await Promise.all(promises);
    const summary = summaries.reduce(
      (acc, value) => {
        acc.diffsCount = acc.diffsCount + value.diffsCount;
        acc.interactionsCount = acc.interactionsCount + value.interactionsCount;
        return acc;
      },
      { diffsCount: 0, interactionsCount: 0 }
    );
    return summary;
  }

  stateFile(captureId: CaptureId): string {
    return path.join(this.captureDirectory(captureId), captureStateFileName);
  }

  baseDirectory(): string {
    return this.basePath;
  }

  captureDirectory(captureId: CaptureId): string {
    return path.join(this.basePath, captureId);
  }
}

export class ExampleRequestsHelpers {
  constructor(private basePath: string) {}

  exampleFile(requestId: string) {
    return path.join(this.basePath, requestId, 'examples.json');
  }

  async getExampleRequests(requestId: string): Promise<any> {
    const exampleFilePath = this.exampleFile(requestId);
    const currentFileContents = await (async () => {
      const exists = await fs.pathExists(exampleFilePath);
      if (exists) {
        try {
          const contents = await fs.readJson(exampleFilePath);
          return contents;
        } catch (e) {
          return [];
        }
      }
      return [];
    })();
    return currentFileContents;
  }

  async saveExampleRequest(requestId: string, example: any) {
    const exampleFilePath = this.exampleFile(requestId);
    const currentFileContents = await this.getExampleRequests(requestId);
    currentFileContents.push(example);
    await fs.ensureFile(exampleFilePath);
    await fs.writeJson(exampleFilePath, currentFileContents, { spaces: 2 });
  }
}

export async function makeRouter(
  sessions: SessionsManager,
  fileReadBottleneck: Bottleneck
) {
  async function ensureValidSpecId(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const { specId } = req.params;
    developerDebugLogger({ specId, sessions });
    const session = sessions.findById(specId);
    if (!session) {
      res.sendStatus(404);
      return;
    }
    try {
      const paths = await getPathsRelativeToCwd(session.path);
      const {
        configPath,
        opticIgnorePath,
        capturesPath,
        exampleRequestsPath,
      } = paths;
      const config = await readApiConfig(configPath);
      const ignoreHelper = new IgnoreFileHelper(opticIgnorePath, configPath);
      const capturesHelpers = new CapturesHelpers(capturesPath);
      const exampleRequestsHelpers = new ExampleRequestsHelpers(
        exampleRequestsPath
      );

      async function specLoader(): Promise<any[]> {
        const events = await getSpecEventsFrom(paths.specStorePath);
        return events;
      }
      req.optic = {
        config,
        paths,
        ignoreHelper,
        capturesHelpers,
        exampleRequestsHelpers,
        session,
        specLoader,
      };
      next();
    } catch (e) {
      res.status(500).json({
        message: e.message,
      });
    }
  }

  const router = express.Router({ mergeParams: true });
  router.use(ensureValidSpecId);

  // events router
  router.get('/events', async (req, res) => {
    try {
      const events = await req.optic.specLoader();
      res.json(events);
    } catch (e) {
      res.json([]);
    }
  });

  const instances: Map<string, any> = new Map();
  router.use(bodyParser.json({ limit: '10mb' }));
  router.use('/spectacle', async (req, res) => {
    let handler = instances.get(req.optic.session.id);
    if (!handler) {
      console.count('LocalCliOpticContextBuilder.fromDirectory');
      const opticContext = await LocalCliOpticContextBuilder.fromDirectory(
        req.optic.paths,
        req.optic.capturesHelpers
      );
      const spectacle = await makeSpectacle(opticContext);
      const instance = graphqlHTTP({
        //@ts-ignore
        schema: spectacle.executableSchema,
        graphiql: true,
        context: {
          spectacleContext: spectacle.graphqlContext,
        },
      });
      //@GOTCHA see if someone sneaky updated it while we weren't looking
      handler = instances.get(req.optic.session.id);
      if (!handler) {
        instances.set(req.optic.session.id, instance);
        handler = instance;
      }
    }
    handler(req, res);
  });

  // captures router. cli picks captureId and writes to whatever persistence method and provides capture id to ui. api spec just shows spec?
  router.get('/captures', async (req, res) => {
    const captures = await req.optic.capturesHelpers.listCapturesState();
    const validCaptures: ValidCaptureState[] = captures.filter((x) =>
      isValidCaptureState(x)
    ) as ValidCaptureState[];
    res.json({
      captures: sortBy(validCaptures, (i) => i.metadata.startedAt)
        .reverse()
        .map((i) => ({
          captureId: i.captureId,
          startedAt: i.metadata.startedAt,
          status: i.status,
          lastUpdate: i.metadata.lastInteraction
            ? i.metadata.lastInteraction.observedAt
            : i.metadata.startedAt,
          links: [
            {
              rel: 'status',
              href: `${req.baseUrl}/captures/${i.captureId}/status`,
            },
          ],
        })),
    });
  });

  router.get('/config', async (req, res) => {
    const rules = await req.optic.ignoreHelper.getCurrentIgnoreRules();

    const configRaw = (
      await fs.readFile(req.optic.paths.configPath)
    ).toString();

    res.json({
      config: { ...req.optic.config, ignoreRequests: rules.allRules },
      configRaw,
    });
  });

  router.post(
    '/config/initial-task',
    bodyParser.json({ limit: '100kb' }),
    async (req, res) => {
      const { task } = req.body;

      const { name, definition } = task;

      const newContents = patchInitialTaskOpticYaml(
        req.optic.config,
        definition,
        name
      );

      await fs.writeFile(req.optic.paths.configPath, newContents);

      res.sendStatus(200);
    }
  );

  router.post(
    '/config/raw',
    bodyParser.json({ limit: '100kb' }),
    async (req, res) => {
      const { raw } = req.body;
      await fs.writeFile(req.optic.paths.configPath, raw);
      res.json({});
    }
  );

  router.get('/ignores', async (req, res) => {
    const rules = await req.optic.ignoreHelper.getCurrentIgnoreRules();
    res.json({
      rules,
    });
  });

  router.patch(
    '/ignores',
    bodyParser.json({ limit: '100kb' }),
    async (req, res) => {
      const { rule } = req.body;
      if (typeof rule === 'string' && Boolean(parseRule(rule))) {
        await req.optic.ignoreHelper.appendRule(rule);
        res.json({});
      } else {
        res.status(400).json({ message: 'Invalid ignore rule' });
      }
    }
  );

  const captureRouter = makeCaptureRouter({
    idGenerator: new DefaultIdGenerator(),
    interactionPointerConverterFactory: (config: {
      captureId: CaptureId;
      captureBaseDirectory: string;
    }) => new LocalCaptureInteractionPointerConverter(config),
    fileReadBottleneck: fileReadBottleneck,
  });

  router.use('/captures/:captureId', captureRouter);

  return router;
}
