const allUseCases = require('./use-cases');
const allWorkflows = require('./workflows');

module.exports = {
  title: 'Optic',
  tagline: 'Optic documents your APIs as you build them',
  url: 'https://useoptic.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'opticdev', // Usually your GitHub org/user name.
  projectName: 'optic', // Usually your repo name.
  themeConfig: {
    googleAnalytics: {
      trackingID: 'UA-137236875-1',
    },
    algolia: {
      apiKey: 'b2709a62d582be097dd8841886113119',
      indexName: 'optic-oss',

      // Optional: see doc section below
      contextualSearch: true,

      // Optional: see doc section below
      appId: 'BJWK3RB6C3',

      // Optional: Algolia search parameters
      searchParameters: {},

      //... other Algolia params
    },
    hideableSidebar: false,
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
    },
    navbar: {
      title: 'Optic',
      logo: {
        alt: 'Optic logo',
        src: 'img/optic-logo.png',
        srcDark: 'img/optic-logo-dark.png',
      },
      items: [
        {
          label: 'Use Cases',
          items: [
            allUseCases.Document,
            allUseCases.Test,
            allUseCases.Change,
            allUseCases.Share,
          ],
          position: 'left',
        },
        {
          label: 'Workflows',
          items: [
            allWorkflows.CIGitBot,
            allWorkflows.TeamDesignFirst,
            allWorkflows.DevelopWithOpticLocally,
          ],
          position: 'left',
        },
        {
          to: '/reference',
          activeBasePath: '/reference',
          label: 'Docs',
          position: 'left',
        },
        {
          to: '/community',
          activeBasePath: '/community',
          label: 'Community',
          position: 'right',
        },
        {
          to: '/roadmap',
          activeBasePath: '/roadmap',
          label: 'Roadmap',
          position: 'right',
        },
        {
          href: 'https://github.com/opticdev/optic',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'Join Community',
              href: '/docs/community',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/t9hADkuYjP',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/@useoptic',
            },
            {
              label: 'GitHub Discussion',
              href: 'https://github.com/opticdev/optic/discussions',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Careers',
              href: '/careers',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/opticdev/optic',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Optic Labs`,
    },
    prism: {
      additionalLanguages: ['csharp'],
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/opticdev/optic/edit/develop/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  stylesheets: [
    'https://fonts.googleapis.com/css?family=Inter:200,400,600,700',
    'https://fonts.googleapis.com/css?family=Ubuntu+Mono:200,400,600,700',
  ],
};
