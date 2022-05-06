import { RuleError } from '../../errors';
import { AssertionTypeToHelpers } from '../../types';
import { CallableAssertion } from '../rule-runner-types';
import { valuesMatcher } from './utils';

export const createRequestBodyHelpers = (
  addAssertion: (
    condition: string,
    assertion: CallableAssertion<'request-body'>
  ) => void
): AssertionTypeToHelpers['request-body'] => {
  return {
    matches: (
      reference: any,
      options: {
        strict?: boolean;
      } = {}
    ) => {
      addAssertion('match expected shape', (value) => {
        const { strict = false } = options;
        if (!valuesMatcher(reference, value.raw, strict)) {
          throw new RuleError({
            message: strict
              ? 'Expected an exact match'
              : 'Expected a partial match',
            received: value.raw,
            expected: reference,
          });
        }
      });
    },
  };
};
