import {
  ParseOpenAPIResult,
  sourcemapReader,
  inGit,
} from '@useoptic/openapi-io';
import {
  factsToChangelog,
  OpenApiFact,
  IChange,
  ResultWithSourcemap,
  ChangeType,
} from '@useoptic/openapi-utilities';
import { ApiCheckService } from '../../../sdk/api-check-service';

export const generateSpecResults = async <T extends {}>(
  checkService: ApiCheckService<T>,
  from: ParseOpenAPIResult,
  to: ParseOpenAPIResult,
  context: any
): Promise<{
  changes: IChange<OpenApiFact>[];
  results: ResultWithSourcemap[];
  projectRootDir: string | false;
}> => {
  const fromJsonLike = from.jsonLike!;
  const toJsonLike = to.jsonLike!;
  const { currentFacts, nextFacts } = checkService.generateFacts(
    fromJsonLike,
    toJsonLike
  );
  const { findFileAndLines: findFileAndLinesFromBefore } = sourcemapReader(
    from.sourcemap
  );
  const { findFileAndLines: findFileAndLinesFromAfter } = sourcemapReader(
    to.sourcemap
  );

  const changes = factsToChangelog(currentFacts, nextFacts);
  const changesWithSourcemap: IChange<OpenApiFact>[] = await Promise.all(
    changes.map(async (change) => {
      return {
        ...change,
        location: {
          ...change.location,
          sourcemap:
            change.changeType === ChangeType.Removed
              ? await findFileAndLinesFromBefore(change.location.jsonPath)
              : await findFileAndLinesFromAfter(change.location.jsonPath),
        },
      };
    })
  );

  const results = await checkService.runRulesWithFacts({
    currentJsonLike: fromJsonLike,
    nextJsonLike: toJsonLike,
    currentFacts,
    nextFacts,
    changelog: changes,
    context,
  });

  const resultsWithSourcemap = await Promise.all(
    results.map(async (result) => {
      return {
        ...result,
        // Ok this is stupid that we need to recalculate the change - but there's some code somewhere stripping out the change.sourcemap
        // and I can't figure out where - it's also really concerning that we're allowing user run code to strip our functional code here
        sourcemap: await findFileAndLinesFromAfter(
          result.change.location.jsonPath
        ),
      };
    })
  );
  return {
    changes: changesWithSourcemap,
    results: resultsWithSourcemap,
    projectRootDir: await inGit(process.cwd()),
  };
};
