import React from 'react';
import { Switch, Redirect, Route } from 'react-router-dom';
import {
  useChangelogPages,
  useChangelogEndpointPageLink,
} from '<src>/components/navigation/Routes';
import { useFetchEndpoints } from '<src>/hooks/useFetchEndpoints';

import { ChangelogListPage } from './ChangelogListPage';
import { ChangelogEndpointRootPage } from './ChangelogEndpointRootPage';

export function ChangelogPages() {
  const changelogPages = useChangelogPages();
  const changelogEndpointPageLink = useChangelogEndpointPageLink();
  useFetchEndpoints();

  return (
    <Switch>
      <Route
        exact
        path={changelogEndpointPageLink.path}
        component={ChangelogEndpointRootPage}
      />
      <Route exact path={changelogPages.path} component={ChangelogListPage} />
      <Redirect to={changelogPages.path} />
    </Switch>
  );
}
