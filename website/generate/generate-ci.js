const { generate } = require('./helper');

const documentLinkTemplate = (slug) => `reference/ci-providers/${slug}`;
const documentTemplate = (name, slug, path, link) => `
---
title: Run Optic in ${name}
sidebar_label: ${name}
slug: /${link}
---

import SpecificExample from '${path}';

<SpecificExample />

`;

module.exports = generate(
  'ci-providers',
  ['../docs', 'ci-providers'],
  documentTemplate,
  documentLinkTemplate,
  [__dirname, '../', 'docs', 'reference', 'ci-providers']
);
