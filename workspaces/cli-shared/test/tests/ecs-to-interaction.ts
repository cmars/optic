import Tap from 'tap';
import { ecsToHttpInteraction } from '../../build/captures/ecs/ecs-to-interaction';

Tap.test('diff-worker-rust', async (test) => {
  await test.test('can diff a capture against a spec', async (t) => {
    ecsToHttpInteraction({
      http: {
        response: {
          body: {
            content: '',
          },
          status_code: 302,
          headers: {
            'x-powered-by': 'Express',
          },
        },
        request: {
          body: {
            content: {},
            bytes: 0,
          },
          method: 'PUT',
          headers: {
            'user-agent': 'PostmanRuntime/7.28.0',
            accept: '*/*',
            'postman-token': 'fd42c9ce-27ca-407b-950d-b37b959e70a0',
            host: 'localhost:3000',
            'accept-encoding': 'gzip, deflate, br',
            connection: 'keep-alive',
            'content-length': '0',
          },
        },
        version: '1.1',
      },
      url: {
        full: 'http://localhost:3000/status/302',
        path: '/status/302',
        domain: 'localhost',
      },
      client: {
        address: '::1',
        ip: '::1',
        port: 60876,
      },
      user_agent: {
        original: 'PostmanRuntime/7.28.0',
      },
    });
  });
});

//
// /*

//  */
