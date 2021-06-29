const allIntegrationDocs = require('./generate/generate-frameworks.js');
const allBrowserIntegrationDocs = require('./generate/generate-browsers.js');
const allToolsIntegrations = require('./generate/generate-tools.js');

const allUseCases = require('./use-cases');

module.exports = {
  useCasesSidebar: {
    [allUseCases.Document.label]: [
      'document/document',
      'document/baseline',
      'document/parameters',
      'document/ignoring',
      'document/bulk-learn',
      'document/what-next',
    ],
    [allUseCases.Test.label]: ['document/document'],
    [allUseCases.Change.label]: ['document/document'],
    [allUseCases.Share.label]: ['document/document'],
  },
  referenceSideBar: [
    'reference/key-concepts',
    {
      type: 'category',
      label: 'Capturing Traffic',
      collapsed: false,
      items: [
        'reference/capture',
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
          label: 'API Tools',
          items: allToolsIntegrations,
        },
        {
          type: 'category',
          label: 'Deployed Environments',
          items: [],
        },
      ],
    },
    {
      type: 'category',
      label: 'Optic CLI',
      collapsed: false,
      items: [
        'reference/optic-cli/commands/init',
        'reference/optic-cli/commands/run',
      ],
    },
    {
      type: 'category',
      label: 'Config in optic.yml',
      collapsed: false,
      items: [
        'reference/optic-yaml/explained',
        'reference/optic-yaml/tasks',
        'reference/optic-yaml/enviroments',
        'reference/optic-yaml/scripts',
      ],
    },
    {
      type: 'category',
      label: 'Using Spectacle',
      collapsed: false,
      items: ['reference/spectacle/spectacle'],
    },
  ],
};
