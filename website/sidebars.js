const allIntegrationDocs = require('./generate/generate-frameworks.js');
const allBrowserIntegrationDocs = require('./generate/generate-browsers.js');

const allUseCases = require('./use-cases');

module.exports = {
  useCasesSidebar: {
    [allUseCases.Document.label]: [
      'document/document',
      {
        type: 'category',
        label: '🔎   Capture Traffic',
        items: [
          {
            type: 'category',
            label: 'API Framework Integrations',
            items: allIntegrationDocs,
          },
          {
            type: 'category',
            label: 'Web Browsers',
            items: allBrowserIntegrationDocs,
          },
          {
            type: 'category',
            label: 'Deployed Environments',
            items: [],
          },
        ],
      },
    ],
    [allUseCases.Test.label]: ['document/document'],
    [allUseCases.Change.label]: ['document/document'],
    [allUseCases.Share.label]: ['document/document'],
  },
  referenceSideBar: [
    'reference/key-concepts',
    {
      ['Optic CLI']: [
        'reference/optic-cli/install',
        {
          type: 'category',
          label: 'CLI Commands',
          items: [
            'reference/optic-cli/commands/init',
            'reference/optic-cli/commands/run',
          ],
        },
      ],
      ['Config in optic.yml']: [
        'reference/optic-yaml/explained',
        'reference/optic-yaml/tasks',
        'reference/optic-yaml/enviroments',
        'reference/optic-yaml/scripts',
      ],
      ["Spectacle: Optic's API"]: ['reference/spectacle/spectacle'],
    },
  ],
};
