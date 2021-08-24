import React, { useCallback, useEffect, useState } from 'react';
import {
  Redirect,
  Route,
  Switch,
  useParams,
  useRouteMatch,
} from 'react-router-dom';
import { LinearProgress } from '@material-ui/core';
import { Provider as ReduxProvider } from 'react-redux';

import {
  useInMemorySpectacle,
  InMemorySpectacleDependenciesLoader,
} from './public-examples';
import {
  AppConfigurationStore,
  OpticAppConfig,
} from '<src>/contexts/config/AppConfiguration';
import { SpectacleStore } from '<src>/contexts/spectacle-provider';
import { store as appStore } from '<src>/store';
import { SpecRepositoryStore } from '<src>/contexts/SpecRepositoryContext';

import DocumentationPage from '<src>/pages/intent-prototype/documentation';

const appConfig: OpticAppConfig = {
  config: {
    allowEditing: true,
    analytics: {
      enabled: false,
    },
    backendApi: {},
    sharing: { enabled: false },
  },
};

export default function IntentPrototype(props: { lookupDir: string }) {
  const match = useRouteMatch();
  const params = useParams<{ exampleId: string }>();

  const { exampleId } = params;

  const task: InMemorySpectacleDependenciesLoader = useCallback(async () => {
    const loadExample = async () => {
      const response = await fetch(`/${props.lookupDir}/${exampleId}.json`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`could not find example ${exampleId}`);
      }
      const responseJson = await response.json();
      return responseJson;
    };
    const [example] = await Promise.all([loadExample()]);

    return {
      events: example.events,
      samples: example.session.samples,
      apiName: exampleId,
    };
  }, [exampleId, props.lookupDir]);

  const { loading, error, data: spectacle } = useInMemorySpectacle(task);
  if (loading) {
    return <LinearProgress variant="indeterminate" />;
  }
  if (error) {
    return <div>error :(</div>;
  }
  if (!spectacle) {
    return <div>Could not find example data</div>;
  }

  return (
    <AppConfigurationStore config={appConfig}>
      <SpectacleStore spectacle={spectacle}>
        <ReduxProvider store={appStore}>
          <SpecRepositoryStore specRepo={spectacle.opticContext.specRepository}>
            <Switch>
              <Route
                path={`${match.path}/documentation`}
                component={DocumentationPage}
              />

              <Redirect to={`${match.path}/documentation`} />
            </Switch>
          </SpecRepositoryStore>
        </ReduxProvider>
      </SpectacleStore>
    </AppConfigurationStore>
  );
}
