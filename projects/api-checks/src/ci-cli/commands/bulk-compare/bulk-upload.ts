import path from 'path';
import { CompareFileJson } from '@useoptic/openapi-utilities';
import { OpticBackendClient, UploadSlot } from '../../clients/optic-client';
import { loadAndValidateSpecFiles, uploadRun } from '../utils/shared-upload';
import {
  BulkCompareJson,
  BulkUploadJson,
  NormalizedCiContext,
} from '../../types';

export const bulkUploadCiRun = async (
  opticClient: OpticBackendClient,
  bulkCompareOutput: BulkCompareJson,
  normalizedCiContext: NormalizedCiContext
): Promise<BulkUploadJson | null> => {
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
      projectRootDir: comparison.projectRootDir,
      version: comparison.version,
    };
    const fileMap: Record<UploadSlot, Buffer> = {
      [UploadSlot.CheckResults]: Buffer.from(JSON.stringify(checkResults)),
      [UploadSlot.FromFile]: fromFileS3Buffer,
      [UploadSlot.ToFile]: toFileS3Buffer,
    };
    const { web_url: opticWebUrl } = await uploadRun(
      opticClient,
      fileMap,
      {
        from: comparison.inputs.from
          ? path.join(process.cwd(), comparison.inputs.from)
          : comparison.inputs.from,
        to: comparison.inputs.to
          ? path.join(process.cwd(), comparison.inputs.to)
          : comparison.inputs.to,
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
