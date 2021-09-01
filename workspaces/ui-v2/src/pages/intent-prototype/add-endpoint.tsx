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

import DebugCaptureEndpointProvider, {
  EndpointPrototype,
} from './components/DebugCaptureEndpointProvider';
import ReviewEndpointChanges from './components/ReviewEndpointsChanges';
import { useAppSelector } from '<src>/store';
import AddEndpointControl from './components/AddEndpointControl';
import { IEndpoint, IPath } from '<src>/types';

export default function AddEndpointIntent() {
  const styles = useStyles();
  const routeMatch = useRouteMatch();
  const history = useHistory();

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
      history.push(`${routeMatch.url}/review`);
    },
    [history, routeMatch.url]
  );

  return (
    <div className={styles.container}>
      <Switch>
        <Route
          strict
          path={`${routeMatch.url}/debug-capture`}
          render={() => (
            <>
              <AddEndpointControl intentPath={routeMatch.url} activeStep={1} />
              <DebugCaptureEndpointProvider
                currentEndpoints={endpoints}
                currentPaths={paths}
                onSubmit={onSubmitEndpointPrototypes}
              />
            </>
          )}
        />

        <Route
          strict
          path={`${routeMatch.url}/other`}
          render={(props) => (
            <>
              <AddEndpointControl intentPath={routeMatch.url} activeStep={0} />
              <div>Interested in this capture method? Let us know</div>
            </>
          )}
        />

        <Route
          strict
          path={`${routeMatch.url}/review`}
          render={(props) =>
            learnedEndpoints.length < 1 ? (
              <Redirect to={`${routeMatch.url}/add`} />
            ) : (
              <>
                <AddEndpointControl
                  intentPath={routeMatch.url}
                  activeStep={2}
                />
                <ReviewEndpointChanges
                  learnedEndpoints={learnedEndpoints}
                  rootPath={routeMatch.url}
                />
              </>
            )
          }
        />

        <Route
          strict
          path={`${routeMatch.url}/capture-method`}
          render={(props) => (
            <>
              <AddEndpointControl intentPath={routeMatch.url} activeStep={0} />
              <CaptureMethodSelector intentPath={routeMatch.url} />
            </>
          )}
        />

        <Redirect to={`${routeMatch.url}/capture-method`} />
      </Switch>
    </div>
  );
}

function CaptureMethodSelector({ intentPath }: { intentPath: string }) {
  const styles = useStyles();

  return (
    <div>
      <h2>Choose the source of data Optic can learn from</h2>

      <div className={styles.captureMethods}>
        <CaptureMethodCard
          href={`${intentPath}/debug-capture/provide`}
          title="Debug capture"
          description="Add a new endpoint through uploading a debug capture"
        />

        <CaptureMethodCard
          href={`${intentPath}/other`}
          title="Observe traffic locally"
          description="Use the Optic Capture Toolkit to observe traffic from your local
                API environment"
        />

        <CaptureMethodCard
          href={`${intentPath}/other`}
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
  container: {},

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
