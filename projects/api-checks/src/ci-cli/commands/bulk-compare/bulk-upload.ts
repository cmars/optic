import { CompareFileJson } from '@useoptic/openapi-utilities';
import { OpticBackendClient, UploadSlot } from '../utils/optic-client';
import { loadFile, writeFile } from '../utils';
import {
  loadAndValidateSpecFiles,
  normalizeCiContext,
  uploadRun,
} from '../utils/shared-upload';
import { BulkCompareJson, BulkUploadJson } from '../../types';

export const bulkUploadCiRun = async (
  opticClient: OpticBackendClient,
  bulkCompareOutput: BulkCompareJson,
  ciContext: string,
  ciProvider: 'github' | 'circleci'
): Promise<BulkUploadJson | null> => {
  console.log('Loading comparison files');

  const contextFileBuffer = await loadFile(ciContext);
  const normalizedCiContext = normalizeCiContext(ciProvider, contextFileBuffer);

  const { comparisons } = bulkCompareOutput;

  const filteredComparisons = comparisons.filter(
    (comparison) => comparison.changes.length > 0
  );
  if (filteredComparisons.length === 0) {
    return null;
  }

  const uploadedComparisons = [];

  // TODO make this run in parallel w/ bottleneck
  for (const comparison of filteredComparisons) {
    const { fromFileS3Buffer, toFileS3Buffer } = await loadAndValidateSpecFiles(
      comparison.inputs.from,
      comparison.inputs.to
    );
    const checkResults: CompareFileJson = {
      changes: comparison.changes,
      results: comparison.results,
    };
    const fileMap: Record<UploadSlot, Buffer> = {
      [UploadSlot.CheckResults]: Buffer.from(JSON.stringify(checkResults)),
      [UploadSlot.FromFile]: fromFileS3Buffer,
      [UploadSlot.ToFile]: toFileS3Buffer,
      [UploadSlot.GithubActionsEvent]: contextFileBuffer,
      [UploadSlot.CircleCiEvent]: contextFileBuffer,
    };
    const { web_url: opticWebUrl } = await uploadRun(
      opticClient,
      fileMap,
      {
        provider: ciProvider,
        ciContext: ciContext,
        compare: 'from bulk upload',
        from: comparison.inputs.from,
        to: comparison.inputs.to,
      },
      normalizedCiContext
    );
    uploadedComparisons.push({
      ...comparison,
      opticWebUrl,
    });
  }

  return {
    comparisons: uploadedComparisons,
    ciContext: normalizedCiContext,
  };
};
