import React, { useCallback, useState } from 'react';

import {
  Link,
  Redirect,
  Route,
  Switch,
  useRouteMatch,
  useHistory,
} from 'react-router-dom';
import { makeStyles } from '@material-ui/core';
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardActions,
} from '@material-ui/core';

import { EndpointName } from '<src>/components';

import DebugCaptureEndpointProvider, {
  EndpointPrototype,
} from './components/DebugCaptureEndpointProvider';
import ReviewEndpointChanges from './components/ReviewEndpointsChanges';
import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';
import { useAppSelector } from '<src>/store';
import { IEndpoint, IPath } from '<src>/types';

export default function DocumentationPage() {
  const styles = useStyles();
  const routeMatch = useRouteMatch();
  const history = useHistory();

  useFetchEndpoints();
  const endpoints: IEndpoint[] =
    useAppSelector((state) => state.endpoints.results).data?.endpoints || [];
  const paths: IPath[] =
    useAppSelector((state) => state.paths.results).data || [];

  const [learnedEndpoints, setLearnedEndpoints] = useState<EndpointPrototype[]>(
    []
  );

  const onSubmitEndpointPrototypes = useCallback(
    (endpoints: EndpointPrototype[]) => {
      setLearnedEndpoints(endpoints);
      history.push(`${routeMatch.url}/add/review`);
    },
    [history, routeMatch.url]
  );

  return (
    <div className={styles.pageContainer}>
      <Switch>
        <Route
          strict
          path={`${routeMatch.url}/add/debug-capture`}
          render={() => (
            <DebugCaptureEndpointProvider
              currentEndpoints={endpoints}
              currentPaths={paths}
              onSubmit={onSubmitEndpointPrototypes}
            />
          )}
        />

        <Route
          strict
          path={`${routeMatch.url}/add/other`}
          render={(props) => (
            <div>Interested in this capture method? Let us know</div>
          )}
        />

        <Route
          strict
          path={`${routeMatch.url}/add/review`}
          render={(props) =>
            learnedEndpoints.length < 1 ? (
              <Redirect to={`${routeMatch.url}/add`} />
            ) : (
              <ReviewEndpointChanges learnedEndpoints={learnedEndpoints} />
            )
          }
        />

        <Route
          strict
          path={`${routeMatch.url}/add`}
          render={(props) => (
            <CaptureMethodSelector documentationPath={routeMatch.url} />
          )}
        />

        <Route
          render={(props) => (
            <>
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

              <Button
                color="primary"
                to={`${routeMatch.url}/add`}
                component={Link}
                variant="contained"
              >
                Add Endpoint
              </Button>
            </>
          )}
        />
      </Switch>
    </div>
  );
}

function CaptureMethodSelector({
  documentationPath,
}: {
  documentationPath: string;
}) {
  const styles = useStyles();

  return (
    <div>
      <h2>Choose the source of data Optic can learn from</h2>

      <div className={styles.captureMethods}>
        <CaptureMethodCard
          href={`${documentationPath}/add/debug-capture/provide`}
          title="Debug capture"
          description="Add a new endpoint through uploading a debug capture"
        />

        <CaptureMethodCard
          href={`${documentationPath}/add/other`}
          title="Observe traffic locally"
          description="Use the Optic Capture Toolkit to observe traffic from your local
                API environment"
        />

        <CaptureMethodCard
          href={`${documentationPath}/add/other`}
          title="Import OpenAPI"
          description="Allow Optic to learn by uploading your existing OpenAPI spec"
        />
      </div>
    </div>
  );
}

function CaptureMethodCard({
  title,
  description,
  href,
}: {
  title?: string;
  description?: string;
  href: string;
}) {
  const styles = useStyles();

  return (
    <Card className={styles.captureMethodCard}>
      <CardActionArea to={href} component={Link}>
        <CardContent>
          <h3>{title}</h3>

          <p>{description}</p>
        </CardContent>
      </CardActionArea>

      <CardActions>
        <Button size="small">Learn More</Button>
        <Button
          to={href}
          component={Link}
          size="small"
          color="primary"
          variant="contained"
        >
          Start
        </Button>
      </CardActions>
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  pageContainer: {
    padding: theme.spacing(3, 4),
  },

  endpointsList: {
    listStyleType: 'none',
    padding: 0,
  },

  captureMethods: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  captureMethodCard: {
    maxWidth: 400,
    marginRight: theme.spacing(2),

    '& h3': {
      marginTop: 0,
    },
  },
}));
