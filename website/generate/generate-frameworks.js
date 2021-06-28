const { generate } = require('./helper');

const documentLinkTemplate = (slug) =>
  `reference/capture-methods/using-integration/${slug}`;
const documentTemplate = (name, slug, path, link) => `
---
title: Capture traffic from ${name}
sidebar_label: ${name}
slug: /${link}
---

import SpecificExample from '${path}';

<SpecificExample />

`;

module.exports = generate(
  'frameworks',
  ['../docs', 'frameworks'],
  documentTemplate,
  documentLinkTemplate,
  [
    __dirname,
    '../',
    'docs',
    'reference',
    'capture-methods',
    'using-integration',
  ]
);
