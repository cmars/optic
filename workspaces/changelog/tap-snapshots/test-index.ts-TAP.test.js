/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict';
exports[
  `test/index.ts TAP Check add-method scenario > must match snapshot 1`
] = `
Object {
  "data": Null Object {
    "endpointChanges": Null Object {
      "endpoints": Array [
        Null Object {
          "change": Null Object {
            "category": "added",
          },
          "contributions": Object {},
          "method": "POST",
          "path": "/user",
          "pathId": "path_VyuFAjdBCO",
        },
      ],
    },
  },
}
`;

exports[
  `test/index.ts TAP Check add-status-code scenario > must match snapshot 1`
] = `
Object {
  "data": Null Object {
    "endpointChanges": Null Object {
      "endpoints": Array [
        Null Object {
          "change": Null Object {
            "category": "updated",
          },
          "contributions": Object {},
          "method": "GET",
          "path": "/user",
          "pathId": "path_VyuFAjdBCO",
        },
      ],
    },
  },
}
`;

exports[
  `test/index.ts TAP Check empty-initial scenario > must match snapshot 1`
] = `
Object {
  "data": Null Object {
    "endpointChanges": Null Object {
      "endpoints": Array [
        Null Object {
          "change": Null Object {
            "category": "added",
          },
          "contributions": Object {},
          "method": "POST",
          "path": "/user",
          "pathId": "path_VyuFAjdBCO",
        },
        Null Object {
          "change": Null Object {
            "category": "added",
          },
          "contributions": Object {},
          "method": "GET",
          "path": "/user",
          "pathId": "path_VyuFAjdBCO",
        },
      ],
    },
  },
}
`;
