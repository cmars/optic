module.exports = {
  data: [
    {
      name: 'Express',
      slug: 'express',
      path:
        '/Users/aidancunniffe/Developer/optic2021/optic/website/docs/frameworks/express.mdx',
      link: 'document/using-integration/express',
      metadata: { title: 'Express' },
    },
    {
      name: 'Flask',
      slug: 'flask',
      path:
        '/Users/aidancunniffe/Developer/optic2021/optic/website/docs/frameworks/flask.mdx',
      link: 'document/using-integration/flask',
      metadata: { title: 'Flask' },
    },
  ],
  components: {
    express: require('../../docs/frameworks/express.mdx'),
    flask: require('../../docs/frameworks/flask.mdx'),
  },
};
