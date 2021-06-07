import Tap from 'tap';
import { ecsToHttpInteraction } from '../../build/captures/ecs/ecs-to-interaction';

Tap.test('diff-worker-rust', async (test) => {
  await test.test('can diff a capture against a spec', async (t) => {
    ecsToHttpInteraction({
      http: {
        response: {
          body: {
            content:
              '{\n  "args": {}, \n  "data": "", \n  "files": {}, \n  "form": {}, \n  "headers": {\n    "Accept": "*/*", \n    "Accept-Encoding": "gzip, deflate, br", \n    "Host": "localhost", \n    "Postman-Token": "d65619bb-eb24-47f3-81b2-b06d38700564", \n    "User-Agent": "PostmanRuntime/7.28.0", \n    "X-Amzn-Trace-Id": "Root=1-60b910c7-7f9e635f34f56f1d7eed7b25"\n  }, \n  "json": null, \n  "origin": "2.216.83.131", \n  "url": "http://localhost/delete"\n}\n',
          },
          status_code: 200,
          headers: { 'x-powered-by': 'Express' },
        },
      },
    });
  });
});

//
// /*

//  */
