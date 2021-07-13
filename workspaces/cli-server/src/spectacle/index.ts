import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import stream from 'stream';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';

import {
  ICapture,
  IListDiffsResponse,
  IListUnrecognizedUrlsResponse,
  IOpticCapturesService,
  GetCaptureStatusResponse,
  IOpticConfigRepository,
  IOpticContext,
  IOpticDiffRepository,
  IOpticDiffService,
  IOpticEngine,
  IOpticSpecReadWriteRepository,
  IOpticSpecRepository,
  StartDiffResult,
} from '@useoptic/spectacle';
import {
  AsyncTools,
  AsyncTools as AT,
  Streams,
  IHttpInteraction,
} from '@useoptic/optic-domain';
import * as OpticEngineNative from '@useoptic/optic-engine-native';
import * as OpticEngineWasm from '@useoptic/optic-engine-wasm';
import { isEnvTrue } from '@useoptic/cli-shared';
import {
  InMemoryDiffRepository,
  IOpticCommandContext,
} from '@useoptic/spectacle/build/in-memory';
import { getSpecEventsFrom } from '@useoptic/cli-config/build/helpers/read-specification-json';
import {
  ILearnedBodies,
  IAffordanceTrailsDiffHashMap,
} from '@useoptic/cli-shared/build/diffs/initial-types';
import { InteractionDiffWorkerRust } from '@useoptic/cli-shared/build/diffs/interaction-diff-worker-rust';
import { IPathMapping, readApiConfig } from '@useoptic/cli-config';
import { IgnoreFileHelper } from '@useoptic/cli-config/build/helpers/ignore-file-interface';
import Chokidar from 'chokidar';

import { CapturesHelpers } from '../routers/spec-router';

////////////////////////////////////////////////////////////////////////////////
export interface LocalCliSpecState {}

////////////////////////////////////////////////////////////////////////////////
export interface LocalCliSpecRepositoryDependencies {
  specDirPath: string;
  specStorePath: string;
  notifications: EventEmitter;
}

export class LocalCliSpecRepository implements IOpticSpecReadWriteRepository {
  changes: AsyncGenerator<number>;
  notifications: EventEmitter;

  constructor(private dependencies: LocalCliSpecRepositoryDependencies) {
    this.notifications = dependencies.notifications;

    this.changes = this.watchSpec();
  }

  private async *watchSpec(): AsyncGenerator<number> {
    const watcher = Chokidar.watch(this.dependencies.specStorePath, {
      persistent: true,
      awaitWriteFinish: true,
    });

    const changes = new AT.Subject<number>();

    let generation = 0;
    watcher.on('change', () => {
      changes.onNext(generation);
      generation += 1;
    });

    watcher.on('error', (err) => {
      changes.onError(err);
    });

    for await (let generation of changes.iterator) {
      yield generation;
    }
  }

  async applyCommands(
    commands: any[],
    batchCommitId: string,
    commitMessage: string,
    commandContext: IOpticCommandContext
  ): Promise<void> {
    const commandsStream = AT.from<Streams.Commands.Command>(commands);
    const output = OpticEngineNative.commit(commandsStream, {
      specDirPath: this.dependencies.specDirPath,
      commitMessage: commitMessage,
      clientSessionId: commandContext.clientSessionId || 'unknown-session',
      clientId: commandContext.clientId,
      appendToRoot: !isEnvTrue(process.env.OPTIC_SPLIT_SPEC_EVENTS),
    });
    for await (const chunk of output) {
    }
  }

  async listEvents(): Promise<any[]> {
    if (isEnvTrue(process.env.OPTIC_ASSEMBLED_SPEC_EVENTS)) {
      const events = OpticEngineNative.readSpec({
        specDirPath: this.dependencies.specDirPath,
      });
      debugger;
      throw new Error(
        'unimplemented. need to streaming parse the events Readable stream'
      );
    } else {
      const events = await getSpecEventsFrom(this.dependencies.specStorePath);
      return events;
    }
  }

  async resetToCommit(batchCommitId: string): Promise<void> {
    const tempOutputFile = path.join(
      this.dependencies.specDirPath,
      `optic-temp-spec-file-${uuidv4()}.json`
    );
    const tempFileDeletion = path.join(
      this.dependencies.specDirPath,
      `optic-temp-spec-to-delete-${uuidv4()}.json`
    );
    const specJsFile = path.join(
      this.dependencies.specDirPath,
      'specification.json'
    );
    const pipeline = util.promisify(stream.pipeline);

    const rawEventStream = OpticEngineNative.readSpec({
      specDirPath: this.dependencies.specDirPath,
    });

    const specEvents = Streams.SpecEvents.fromJSONStream()(rawEventStream);
    const filteredEvents = Streams.SpecEvents.takeBatchesUntil(batchCommitId)(
      specEvents
    );

    await pipeline(
      AT.intoJSONArray(filteredEvents),
      fs.createWriteStream(tempOutputFile)
    );

    await fs.rename(specJsFile, tempFileDeletion);
    await fs.rename(tempOutputFile, specJsFile);
    await fs.remove(tempFileDeletion);
  }
}

////////////////////////////////////////////////////////////////////////////////

interface LocalCliCapturesServiceDependencies {
  diffRepository: IOpticDiffRepository;
  opticEngine: IOpticEngine;
  specRepository: IOpticSpecRepository;
  configRepository: IOpticConfigRepository;
  capturesHelpers: CapturesHelpers;
}

////////////////////////////////////////////////////////////////////////////////

export class LocalCliCapturesService implements IOpticCapturesService {
  constructor(private dependencies: LocalCliCapturesServiceDependencies) {}

  async startDiff(diffId: string, captureId: string): Promise<StartDiffResult> {
    const notifications = new EventEmitter();
    const diff = new LocalCliDiff({
      notifications,
    });
    const captureBaseDirectory = this.dependencies.capturesHelpers.baseDirectory();
    const events = await this.dependencies.specRepository.listEvents();
    const ignoreRules = await this.dependencies.configRepository.listIgnoreRules();
    await diff.start({
      diffId,
      captureId,
      captureBaseDirectory,
      events,
      ignoreRules: ignoreRules,
    });
    const diffService = new LocalCliDiffService({ diff });
    await this.dependencies.diffRepository.add(diffId, diffService);

    const onComplete = new Promise<IOpticDiffService>((resolve, reject) => {
      notifications.once('complete', () => resolve(diffService));
    });

    return {
      onComplete,
    };
  }

  async getCaptureStatus(captureId: string): Promise<GetCaptureStatusResponse> {
    // use capturesHelper -- it's the same as in the endpoint
    const captureInfo = await this.dependencies.capturesHelpers.loadCaptureState(
      captureId
    );
    const captureSummary = await this.dependencies.capturesHelpers.loadCaptureSummary(
      captureId
    );
    return {
      status: captureInfo.status,
      metadata: captureInfo.status !== 'unknown' ? captureInfo.metadata : null,
      diffsCount: captureSummary.diffsCount,
      interactionsCount: captureSummary.interactionsCount,
    };
  }

  loadInteraction(captureId: string, pointer: string): Promise<any> {
    return Promise.reject(new Error('I should never be called'));
  }

  async listCaptures(): Promise<ICapture[]> {
    return Promise.reject(new Error('I should never be called'));
  }
}

interface LocalCliDiffDependencies {
  notifications: EventEmitter;
}

class LocalCliDiff {
  private diffing?: Promise<any[]>;

  constructor(private dependencies: LocalCliDiffDependencies) {}

  async start(config: {
    diffId: string;
    captureBaseDirectory: string;
    captureId: string;
    events: any[];
    ignoreRules: any[];
  }) {
    const worker = await new InteractionDiffWorkerRust(config).run();

    //@TODO: should this be writing output to the file system?
    // Consume stream instantly for now, resulting in a Promise that resolves once exhausted
    this.diffing = AsyncTools.toArray(worker.results);
    this.diffing.then(() => {
      this.dependencies.notifications.emit('complete');
    });
  }

  async getNormalizedDiffs() {
    // Q: Why not consume diff stream straight up? A: we don't have a way to fork streams yet
    // allowing only a single consumer, and we need multiple (results themselves + urls)!
    const diffResults = AsyncTools.from(await this.diffing!);

    const normalizedDiffs = Streams.DiffResults.normalize(diffResults);
    const lastUniqueResults = Streams.DiffResults.lastUnique(normalizedDiffs);

    return AsyncTools.toArray(lastUniqueResults);
  }

  async getUnrecognizedUrls() {
    // Q: Why not consume diff stream straight up? A: we don't have a way to fork streams yet
    // allowing only a single consumer, and we need multiple (results themselves + urls)!
    const diffResults = AsyncTools.from(await this.diffing!);

    const undocumentedUrls = Streams.UndocumentedUrls.fromDiffResults(
      diffResults
    );
    const lastUnique = Streams.UndocumentedUrls.lastUnique(undocumentedUrls);

    return AsyncTools.toArray(lastUnique);
  }
}

interface LocalCLiDiffServiceDependencies {
  diff: LocalCliDiff;
}

export class LocalCliDiffService implements IOpticDiffService {
  constructor(private dependencies: LocalCLiDiffServiceDependencies) {}

  learnShapeDiffAffordances(): Promise<IAffordanceTrailsDiffHashMap> {
    return Promise.reject('implement me');
  }

  learnUndocumentedBodies(
    pathId: string,
    method: string
  ): Promise<ILearnedBodies> {
    return Promise.reject('implement me');
  }

  async listDiffs(): Promise<IListDiffsResponse> {
    const diffs = (await this.dependencies.diff.getNormalizedDiffs()).map(
      ([diff, tags, fingerprint]) => {
        return [diff, tags, fingerprint];
      }
    );

    return { diffs };
  }

  async listUnrecognizedUrls(): Promise<IListUnrecognizedUrlsResponse> {
    const urls = (await this.dependencies.diff.getUnrecognizedUrls()).map(
      ({ fingerprint, ...rest }) => {
        return rest;
      }
    );
    return { urls };
  }
}

////////////////////////////////////////////////////////////////////////////////

interface ILocalCliConfigRepositoryDependencies {
  opticYmlPath: string;
  ignoreFilePath: string;
}

export class LocalCliConfigRepository implements IOpticConfigRepository {
  ignoreFileHelper: IgnoreFileHelper;

  constructor(private dependencies: ILocalCliConfigRepositoryDependencies) {
    this.ignoreFileHelper = new IgnoreFileHelper(
      dependencies.ignoreFilePath,
      dependencies.opticYmlPath
    );
  }

  async addIgnoreRule(rule: string): Promise<void> {
    return await this.ignoreFileHelper.appendRule(rule);
  }
  async listIgnoreRules(): Promise<string[]> {
    const rules = await this.ignoreFileHelper.getCurrentIgnoreRules();
    return rules.allRules;
  }

  async getApiName(): Promise<string> {
    const apiConfig = await readApiConfig(this.dependencies.opticYmlPath);
    return Promise.resolve(apiConfig.name);
  }
}

////////////////////////////////////////////////////////////////////////////////

export class LocalCliOpticContextBuilder {
  static async fromDirectory(
    paths: IPathMapping,
    capturesHelpers: CapturesHelpers
  ): Promise<IOpticContext> {
    const notifications = new EventEmitter();
    const specRepository = new LocalCliSpecRepository({
      specStorePath: paths.specStorePath,
      specDirPath: paths.specDirPath,
      notifications,
    });
    const configRepository = new LocalCliConfigRepository({
      opticYmlPath: paths.configPath,
      ignoreFilePath: paths.opticIgnorePath,
    });
    const diffRepository = new InMemoryDiffRepository();

    const capturesService = new LocalCliCapturesService({
      opticEngine: OpticEngineWasm,
      configRepository,
      specRepository,
      diffRepository,
      capturesHelpers,
    });

    return {
      opticEngine: OpticEngineWasm,
      capturesService,
      specRepository,
      configRepository,
      diffRepository,
    };
  }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
