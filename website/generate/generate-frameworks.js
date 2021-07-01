const { generate } = require('./helper');

const documentLinkTemplate = (slug) =>
  `reference/capture-methods/using-integration/${slug}`;
const documentTemplate = (name, slug, path, link, metadata) => {
  const tabValuesAsString = metadata.sdk_url
    ? [
        { label: 'SDK', value: 'sdk' },
        { label: 'Manual integration', value: 'manual' },
      ]
    : [
        { label: 'Manual integration', value: 'manual' },
        { label: 'SDK (coming soon)', value: 'sdk' },
      ];

  return `
---
title: Capture traffic from ${name}
sidebar_label: ${name}
slug: /${link}
---

import SpecificExample from '${path}';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs
  defaultValue="sdk"
  values={${JSON.stringify(tabValuesAsString)}}>

<TabItem value="sdk">
<SpecificExample sdk={true} />
</TabItem>

<TabItem value="manual">
<SpecificExample proxy={true} />
</TabItem>



</Tabs>


`;
};

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
