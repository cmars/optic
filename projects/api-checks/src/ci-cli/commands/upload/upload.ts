import { Command, Option } from 'commander';
import {
  defaultEmptySpec,
  validateOpenApiV3Document,
} from '@useoptic/openapi-utilities';
import { OpticBackendClient, SessionType, UploadSlot } from './optic-client';
import {
  loadFile,
  uploadFileToS3,
  writeFile,
  parseSpecVersion,
  readAndValidateGithubContext,
  readAndValidateCircleCiContext,
  specFromInputToResults,
} from '../utils';
import { wrapActionHandlerWithSentry } from '../../sentry';
import { DEFAULT_UPLOAD_OUTPUT_FILENAME } from '../../constants';
import { UserError } from '../../errors';

type CiRunArgs = {
  from?: string;
  provider: 'github' | 'circleci';
  to?: string;
  ciContext: string;
  compare: string;
};

const loadSpecFile = async (fileName: string): Promise<Buffer> => {
  const parsedOpenApifile = await specFromInputToResults(
    parseSpecVersion(fileName, defaultEmptySpec),
    process.cwd()
  );
  return Buffer.from(JSON.stringify(parsedOpenApifile.jsonLike));
};

export const registerUpload = (
  cli: Command,
  { opticToken }: { opticToken?: string }
) => {
  // TODO also extend this to support gitlab / bitbucket
  cli
    .command('upload')
    .option('--from <from>', 'from file or rev:file')
    .requiredOption('--to <to>', 'to file or rev:file')
    .addOption(
      new Option(
        '--provider <provider>',
        'The name of the ci-provider, supported'
      )
        .choices(['github', 'circleci'])
        .makeOptionMandatory()
    )
    .requiredOption('--ci-context <ciContext>', 'file with github context')
    .requiredOption('--compare <compare>', 'path to compare output')
    .action(
      wrapActionHandlerWithSentry(async (runArgs: CiRunArgs) => {
        if (!opticToken) {
          console.error('Upload token was not included');
          return process.exit(1);
        }

        const backendWebBase =
          // TODO centralize this optic env configuration
          process.env.OPTIC_ENV === 'staging'
            ? 'https://api.o3c.info'
            : 'https://api.useoptic.com';

        const opticClient = new OpticBackendClient(backendWebBase, () =>
          Promise.resolve(opticToken)
        );
        await uploadCiRun(opticClient, runArgs);
      })
    );
};

const startSession = async (
  opticClient: OpticBackendClient,
  runArgs: CiRunArgs,
  contextBuffer: Buffer
): Promise<string> => {
  if (runArgs.provider === 'github') {
    const {
      organization,
      pull_request,
      run,
      commit_hash,
      repo,
    } = readAndValidateGithubContext(contextBuffer);

    const sessionId = await opticClient.startSession(
      SessionType.GithubActions,
      {
        run_args: {
          from: runArgs.from || '',
          to: runArgs.to || '',
          context: runArgs.ciContext,
          rules: runArgs.compare,
          provider: runArgs.provider,
        },
        github_data: {
          organization,
          repo,
          pull_request,
          run,
          commit_hash,
        },
      }
    );
    return sessionId;
  } else if (runArgs.provider === 'circleci') {
    const {
      organization,
      pull_request,
      run,
      commit_hash,
      repo,
    } = readAndValidateCircleCiContext(contextBuffer);

    const sessionId = await opticClient.startSession(SessionType.CircleCi, {
      run_args: {
        from: runArgs.from || '',
        to: runArgs.to || '',
        context: runArgs.ciContext,
        rules: runArgs.compare,
        provider: runArgs.provider,
      },
      circle_ci_data: {
        organization,
        repo,
        pull_request,
        run,
        commit_hash,
      },
    });
    return sessionId;
  }
  throw new Error(`Unrecognized provider ${runArgs.provider}`);
};

export const uploadCiRun = async (
  opticClient: OpticBackendClient,
  runArgs: CiRunArgs
) => {
  console.log('Loading files...');

  const [
    contextFileBuffer,
    fromFileS3Buffer,
    toFileS3Buffer,
    rulesFileS3Buffer,
  ] = await Promise.all([
    loadFile(runArgs.ciContext),
    runArgs.from
      ? loadSpecFile(runArgs.from)
      : Promise.resolve(Buffer.from(JSON.stringify(defaultEmptySpec))),
    runArgs.to
      ? loadSpecFile(runArgs.to)
      : Promise.resolve(Buffer.from(JSON.stringify(defaultEmptySpec))),
    loadFile(runArgs.compare),
  ]);

  const fileMap: Record<UploadSlot, Buffer> = {
    [UploadSlot.CheckResults]: rulesFileS3Buffer,
    [UploadSlot.FromFile]: fromFileS3Buffer,
    [UploadSlot.ToFile]: toFileS3Buffer,
    [UploadSlot.GithubActionsEvent]: contextFileBuffer,
    [UploadSlot.CircleCiEvent]: contextFileBuffer,
  };

  try {
    validateOpenApiV3Document(JSON.parse(fromFileS3Buffer.toString()));
    validateOpenApiV3Document(JSON.parse(toFileS3Buffer.toString()));
  } catch (e) {
    throw new UserError((e as Error).message);
  }

  const sessionId = await startSession(opticClient, runArgs, contextFileBuffer);

  console.log('Uploading OpenAPI files to Optic...');

  const uploadUrls = await opticClient.getUploadUrls(sessionId);

  const uploadedFilePaths: {
    id: string;
    slot: UploadSlot;
  }[] = await Promise.all(
    uploadUrls.map(async (uploadUrl) => {
      const file = fileMap[uploadUrl.slot];
      await uploadFileToS3(uploadUrl.url, file);

      return {
        id: uploadUrl.id,
        slot: uploadUrl.slot,
      };
    })
  );

  // TODO run this in parallel when optimistic concurrency is fixed
  // await Promise.all(
  //   uploadedFilePaths.map(async (uploadedFilePath) =>
  //     opticClient.markUploadAsComplete(
  //       sessionId,
  //       uploadedFilePath.id,
  //       uploadedFilePath.slot
  //     )
  //   )
  // );

  // Run this sequentially to work around optimistic concurrency bug
  await uploadedFilePaths.reduce(async (promiseChain, uploadedFilePath) => {
    await promiseChain;
    return opticClient.markUploadAsComplete(
      sessionId,
      uploadedFilePath.id,
      uploadedFilePath.slot
    );
  }, Promise.resolve());

  const { web_url: opticWebUrl } = await opticClient.getSession(sessionId);
  const uploadFileLocation = await writeFile(
    DEFAULT_UPLOAD_OUTPUT_FILENAME, // TODO maybe make this a cli argument?
    Buffer.from(
      JSON.stringify({
        opticWebUrl,
      })
    )
  );

  console.log('Successfully uploaded files to Optic');
  console.log(`You can view the results of this run at: ${opticWebUrl}`);
  console.log(`Results of this run can be found at ${uploadFileLocation}`);
};
