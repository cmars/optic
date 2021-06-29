module.exports = {
  data: [
    {
      name: 'Chrome',
      slug: 'chrome',
      path: '/Users/lou/repos/optic/website/docs/browsers/chrome.mdx',
      link: 'reference/capture-methods/browsers/chrome',
      metadata: { title: 'Chrome' },
    },
    {
      name: 'Foobarser',
      slug: 'foobarser',
      path: '/Users/lou/repos/optic/website/docs/browsers/foobarser.mdx',
      link: 'reference/capture-methods/browsers/foobarser',
      metadata: { title: 'Foobarser' },
    },
  ],
  components: {
    chrome: require('../../docs/browsers/chrome.mdx'),
    foobarser: require('../../docs/browsers/foobarser.mdx'),
  },
};
