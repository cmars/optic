import { Command, Option } from 'commander';
import { v4 as uuidv4 } from 'uuid';

import {
  defaultEmptySpec,
  IChange,
  validateOpenApiV3Document,
  ResultWithSourcemap,
} from '@useoptic/openapi-utilities';
import { wrapActionHandlerWithSentry, SentryClient } from '../../sentry';
import {
  loadFile,
  parseSpecVersion,
  specFromInputToResults,
  validateUploadRequirements,
  generateSpecResults,
} from '../utils';

import { UserError } from '../../errors';
import { trackEvent, flushEvents } from '../../segment';
import { CliConfig, BulkCompareJson, NormalizedCiContext } from '../../types';
import { createOpticClient } from '../../clients/optic-client';
import { bulkUploadCiRun } from './bulk-upload';
import { sendBulkGithubMessage } from './bulk-github-comment';
import { sendBulkGitlabMessage } from './bulk-gitlab-comment';
import { logComparison } from '../utils/comparison-renderer';
import { loadCiContext } from '../utils/load-context';
import { RuleRunner, SpectralInput } from '../../types';

export const registerBulkCompare = (
  cli: Command,
  projectName: string,
  ruleRunner: RuleRunner,
  cliConfig: CliConfig,
  generateContext: () => Object = () => ({}),
  spectralConfig?: SpectralInput
) => {
  cli
    .command('bulk-compare')
    .requiredOption(
      '--input <input>',
      'a csv with the from, to files, and context format: <from>,<to>,<jsonified context>'
    )
    .option('--verbose', 'show all checks, even passing', false)
    .addOption(
      new Option(
        '--output <output>',
        "show 'pretty' output for interactive usage or 'json' for JSON, defaults to 'pretty'"
      ).choices(['pretty', 'json', 'plain'])
    )
    .option(
      '--upload-results',
      'upload results of this run to optic cloud',
      false
    )
    .option(
      '--ci-context <ciContext>',
      'path to file with the context shape from the ci provider (e.g. github actions, circle ci)'
    )
    .action(
      wrapActionHandlerWithSentry(
        async ({
          input,
          verbose,
          output = 'pretty',
          uploadResults,
          ciContext,
        }: {
          input: string;
          verbose: boolean;
          output?: 'pretty' | 'json' | 'plain';
          uploadResults: boolean;
          ciContext?: string;
        }) => {
          validateUploadRequirements(uploadResults, cliConfig);

          await runBulkCompare({
            checkService: ruleRunner,
            input,
            verbose,
            output,
            uploadResults,
            ciContext,
            projectName,
            cliConfig,
            generateContext,
            spectralConfig,
          });
          process.exit(0);
        }
      )
    );
};

type ComparisonData = {
  changes: IChange[];
  results: ResultWithSourcemap[];
  version: string;
};

type Comparison = {
  id: string;
  fromFileName?: string;
  toFileName?: string;
  context: any;
} & (
  | { loading: true }
  | { loading: false; error: true; errorDetails: any }
  | {
      loading: false;
      error: false;
      data: ComparisonData;
    }
);

const loadSpecFile = async (
  fileName?: string
): Promise<ReturnType<typeof specFromInputToResults>> => {
  return specFromInputToResults(
    parseSpecVersion(fileName, defaultEmptySpec),
    process.cwd()
  );
};

// TODO extract out the parallel request promise logic into a generic fn and write tests around this
// TODO type of `Comparison` can be narrowed
const compareSpecs = async ({
  checkService,
  comparisons,
  onComparisonComplete,
  onComparisonError,
  spectralConfig,
}: {
  checkService: RuleRunner;
  comparisons: Map<string, Comparison>;
  onComparisonComplete: (id: string, data: ComparisonData) => void;
  onComparisonError: (id: string, error: any) => void;
  spectralConfig?: SpectralInput;
}) => {
  const PARALLEL_REQUESTS = 4;
  const inflightRequests = new Map<string, Promise<string>>();
  for (const [id, comparison] of comparisons.entries()) {
    if (inflightRequests.size >= PARALLEL_REQUESTS) {
      // await, then remove
      const resolvePromiseId = await Promise.race([
        ...inflightRequests.values(),
      ]);
      inflightRequests.delete(resolvePromiseId);
    }
    // Enqueue next
    inflightRequests.set(
      id,
      new Promise<{
        id: string;
        data: ComparisonData;
      }>(async (resolve, reject) => {
        try {
          const [from, to] = await Promise.all([
            loadSpecFile(comparison.fromFileName),
            loadSpecFile(comparison.toFileName),
          ]);

          validateOpenApiV3Document(from.jsonLike);
          validateOpenApiV3Document(to.jsonLike);

          const { results, changes, version } = await generateSpecResults(
            checkService,
            from,
            to,
            comparison.context,
            spectralConfig
          );
          resolve({
            id,
            data: {
              results,
              changes,
              version,
            },
          });
        } catch (e) {
          reject({
            id,
            error: e,
          });
        }
      })
        .then(({ id, data }) => {
          onComparisonComplete(id, data);
          return id;
        })
        .catch((e) => {
          const { id, error } = e as { id: string; error: any };
          onComparisonError(id, error);
          return id;
        })
    );
  }

  // Then wait for all the remaining requests to complete
  await Promise.all([...inflightRequests.values()]);
};

export const parseJsonComparisonInput = async (
  input: string,
  generateContext: () => Object
): Promise<{
  comparisons: Map<string, Comparison>;
  skippedParsing: boolean;
}> => {
  try {
    const fileOutput = await loadFile(input);
    let skippedParsing = false;
    const output = JSON.parse(fileOutput.toString());
    const initialComparisons: Map<string, Comparison> = new Map();
    for (const comparison of output.comparisons || []) {
      if (!comparison.from && !comparison.to) {
        throw new Error('Cannot specify a comparison with no from or to files');
      }
      const id = uuidv4();

      initialComparisons.set(id, {
        id,
        fromFileName: comparison.from,
        toFileName: comparison.to,
        context: comparison.context || generateContext(),
        loading: true,
      });
    }

    return { comparisons: initialComparisons, skippedParsing };
  } catch (e) {
    console.error(e);
    throw new UserError();
  }
};

const runBulkCompare = async ({
  checkService,
  input,
  verbose,
  projectName,
  output,
  uploadResults,
  ciContext,
  cliConfig,
  generateContext,
  spectralConfig,
}: {
  checkService: RuleRunner;
  input: string;
  verbose: boolean;
  projectName: string;
  output: 'pretty' | 'json' | 'plain';
  uploadResults: boolean;
  ciContext?: string;
  cliConfig: CliConfig;
  generateContext: () => Object;
  spectralConfig?: SpectralInput;
}) => {
  console.log('Reading input file...');
  let numberOfErrors = 0;
  let numberOfComparisonsWithErrors = 0;
  let numberOfComparisonsWithAChange = 0;
  let hasChecksFailing = false;
  let hasError = false;

  let normalizedCiContext: NormalizedCiContext | null = null;
  if (uploadResults && cliConfig.ciProvider) {
    normalizedCiContext = await loadCiContext(cliConfig.ciProvider, ciContext);
  }

  const { comparisons: initialComparisons, skippedParsing } =
    await parseJsonComparisonInput(input, generateContext);

  console.log(`Bulk comparing ${initialComparisons.size} comparisons`);
  const finalComparisons = new Map(initialComparisons);

  await compareSpecs({
    checkService,
    spectralConfig,
    comparisons: initialComparisons,
    onComparisonComplete: (id, comparison) => {
      const { results, changes } = comparison;
      if (results.some((result) => !result.passed && !result.exempted)) {
        hasChecksFailing = true;
        numberOfComparisonsWithErrors += 1;
        numberOfErrors += results.reduce(
          (count, result) =>
            result.passed || result.exempted ? count : count + 1,
          0
        );
      }
      if (changes.length > 0) {
        numberOfComparisonsWithAChange += 1;
      }
      finalComparisons.set(id, {
        ...initialComparisons.get(id)!,
        loading: false,
        error: false,
        data: comparison,
      });
    },
    onComparisonError: (id, error) => {
      hasError = true;
      finalComparisons.set(id, {
        ...initialComparisons.get(id)!,
        loading: false,
        error: true,
        errorDetails: error,
      });
    },
  });

  trackEvent(
    'optic_ci.bulk_compare',
    (normalizedCiContext && normalizedCiContext.user) ||
      `${projectName}-optic-ci`,
    {
      isInCi: process.env.CI === 'true',
      numberOfErrors,
      projectName,
      numberOfComparisons: initialComparisons.size,
      numberOfComparisonsWithErrors,
      numberOfComparisonsWithAChange,
      ...(normalizedCiContext
        ? {
            ...normalizedCiContext,
            org_repo_pr: `${normalizedCiContext.organization}/${normalizedCiContext.repo}/${normalizedCiContext.pull_request}`,
          }
        : {}),
    }
  );

  if (output === 'json') {
    console.log(JSON.stringify([...finalComparisons.values()], null, 2));
  } else {
    for (const comparison of [...finalComparisons.values()]) {
      const fromName = comparison.fromFileName || 'Empty Spec';
      const toName = comparison.toFileName || 'Empty Spec';
      console.log(`Comparing ${fromName} to ${toName}\n`);

      if (comparison.loading) {
        console.log('loading');
      } else if (comparison.error) {
        console.log(`Error running rules`);
        console.error(comparison.errorDetails);
      } else {
        logComparison(
          {
            results: comparison.data.results,
            changes: comparison.data.changes,
          },
          {
            output,
            verbose,
          }
        );
      }
    }
  }

  const maybeError = skippedParsing
    ? new UserError('Error: Could not read all of the comparison inputs')
    : hasError
    ? new UserError('Error: Could not run all of the comparisons')
    : undefined;

  if (maybeError) {
    throw maybeError;
  }

  const bulkCompareOutput: BulkCompareJson = {
    comparisons: [...finalComparisons].map(([, comparison]) => {
      if (comparison.loading || comparison.error) {
        throw new Error('Expected comparison to be loaded without errors');
      }
      return {
        results: comparison.data.results,
        changes: comparison.data.changes,
        version: comparison.data.version,
        inputs: {
          from: comparison.fromFileName,
          to: comparison.toFileName,
        },
      };
    }),
  };
  if (uploadResults && normalizedCiContext) {
    const numberOfUploads = bulkCompareOutput.comparisons.filter(
      (comparison) => comparison.changes.length > 0
    ).length;
    const numberOfComparisons = bulkCompareOutput.comparisons.length;
    console.log(
      `Uploading ${numberOfUploads} comparisons with at least 1 change to Optic... (${
        numberOfComparisons - numberOfUploads
      } did not have any changes)`
    );

    // We've validated the shape in validateUploadRequirements
    const opticToken = cliConfig.opticToken!;
    const { token } = cliConfig.gitProvider!;
    const opticClient = createOpticClient(opticToken);

    try {
      const { git_provider, git_api_url } =
        await opticClient.getMyOrganization();
      const bulkUploadOutput = await bulkUploadCiRun(
        opticClient,
        bulkCompareOutput,
        normalizedCiContext
      );
      if (bulkUploadOutput) {
        console.log(
          `Successfully uploaded ${bulkUploadOutput.comparisons.length} comparisons that had at least 1 change`
        );
        console.log('These files can be found at');
        for (const comparison of bulkUploadOutput.comparisons) {
          console.log(
            `from: ${comparison.inputs.from || 'Empty Spec'} to: ${
              comparison.inputs.to || 'Empty Spec'
            } - ${comparison.opticWebUrl}`
          );
        }

        if (git_provider === 'github') {
          console.log('Posting comment to github...');

          try {
            await sendBulkGithubMessage({
              githubToken: token,
              uploadOutput: bulkUploadOutput,
              baseUrl: git_api_url,
            });
          } catch (e) {
            console.log(
              'Failed to post comment to github - exiting with comparison rules run exit code.'
            );
            console.error(e);
            if (!(e instanceof UserError)) {
              SentryClient?.captureException(e);
            }
          }
        } else if (git_provider === 'gitlab') {
          console.log('Posting comment to gitlab...');

          try {
            await sendBulkGitlabMessage({
              gitlabToken: token,
              uploadOutput: bulkUploadOutput,
              baseUrl: git_api_url,
            });
          } catch (e) {
            console.log(
              'Failed to post comment to gitlab - exiting with comparison rules run exit code.'
            );
            console.error(e);
            if (!(e instanceof UserError)) {
              SentryClient?.captureException(e);
            }
          }
        }
      } else {
        console.log('No changes were detected, not uploading anything');
      }
    } catch (e) {
      console.log(
        'Error uploading the run to Optic - exiting with comparison rules run exit code.'
      );
      console.error(e);

      if (!(e instanceof UserError)) {
        SentryClient?.captureException(e);
      }
    }
  }
  await flushEvents();

  if (hasChecksFailing) {
    throw new UserError();
  }
};
