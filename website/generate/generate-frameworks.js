const { generate } = require('./helper');

const documentLinkTemplate = (slug) => `document/using-integration/${slug}`;
const documentTemplate = (name, slug, path, link) => `
---
title: Document using ${name}
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
  [__dirname, '../', 'docs', 'document', 'using-integration']
);
