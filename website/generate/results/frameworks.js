module.exports = {
  data: [
    {
      name: 'Express',
      slug: 'express',
      path: '/Users/lou/repos/optic/website/docs/frameworks/express.mdx',
      link: 'reference/capture-methods/using-integration/express',
      metadata: { title: 'Express' },
    },
    {
      name: 'Flask',
      slug: 'flask',
      path: '/Users/lou/repos/optic/website/docs/frameworks/flask.mdx',
      link: 'reference/capture-methods/using-integration/flask',
      metadata: { title: 'Flask' },
    },
    {
      name: 'Foo',
      slug: 'foo',
      path: '/Users/lou/repos/optic/website/docs/frameworks/foo.mdx',
      link: 'reference/capture-methods/using-integration/foo',
      metadata: {
        title: 'Foo',
        sdk_url: 'https://github.com/opticdev/optic-node',
        sdk_readme:
          'https://github.com/opticdev/optic-node/pull/15/files#diff-7e5ec5d0966e58b0a5ee5fb63ced6a1fcc81cee3c4a771400537c803ebdc2d76',
        start_command: './foo --bar',
      },
    },
  ],
  components: {
    express: require('../../docs/frameworks/express.mdx'),
    flask: require('../../docs/frameworks/flask.mdx'),
    foo: require('../../docs/frameworks/foo.mdx'),
  },
};
