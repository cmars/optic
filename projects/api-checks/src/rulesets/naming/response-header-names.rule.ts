import { check } from '../../sdk/define-check-test-dsl/define-check';
import { scenario } from '../../sdk/define-check-test-dsl/scenarios';
import { NameMustBe, NameRule } from './helpers/config';
import { RuleApplies, ruleAppliesToLifeCycleKeyword } from '../shared-config';
import { isCase } from './helpers/is-case';
import { expect } from 'chai';

export default check<NameRule>('response header naming')
  .implementation(({ responses }, config) => {
    const applies = config?.applies || RuleApplies.always;
    const casing = config?.rule || NameMustBe.none;

    const { expect } = require('chai');
    responses.header[ruleAppliesToLifeCycleKeyword(applies)].must(
      `have ${casing.toString()} name`,
      (current) => {
        if (!isCase(current.name, casing))
          expect.fail(`${current.name} is not ${casing.toString()}`);
      }
    );
  })
  .failingExample(
    scenario(
      'adding a camelCase when pascalCase is required'
    ).responseHeader.added('exampleParam', {
      required: false,
    }),
    { rule: NameMustBe.pascalCase, applies: RuleApplies.always }
  )
  .passingExample(
    scenario(
      'adding a camelCase when camelCase is required'
    ).responseHeader.added('exampleParam', {
      required: false,
    }),
    { rule: NameMustBe.camelCase, applies: RuleApplies.always }
  )
  .passingExample(
    scenario('wrong case ok if it is already there').responseHeader.changed(
      'exampleParam',
      {
        required: false,
      },
      (same) => same
    ),
    { rule: NameMustBe.pascalCase, applies: RuleApplies.whenAdded }
  );
