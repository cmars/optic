import React from 'react';
import { makeStyles } from '@material-ui/core';
import { Button } from '@material-ui/core';

import { EndpointName } from '<src>/components';

import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';
import {
  useAppSelector,
  useAppDispatch,
  selectors,
  documentationEditActions,
} from '<src>/store';

export default function DocumentationPage() {
  const styles = useStyles();

  useFetchEndpoints();
  const endpoints = useAppSelector((state) => state.endpoints.results).data
    ?.endpoints;

  return (
    <div className={styles.container}>
      <Button color="primary" variant="contained">
        Add Endpoint
      </Button>

      {endpoints && endpoints.length > 0 ? (
        <ul className={styles.endpointsList}>
          {endpoints?.map((endpoint) => (
            <li key={endpoint.id}>
              <EndpointName
                fontSize={19}
                leftPad={0}
                method={endpoint.method}
                fullPath={endpoint.fullPath}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div>No documented endpoints yet</div>
      )}
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(3, 4),
  },

  endpointsList: {
    listStyleType: 'none',
    padding: 0,
  },
}));
