import React, { ReactNode, useContext } from 'react';
import { InvariantViolationError } from '<src>/errors';

interface IAppConfigurations {
  allowEditing: boolean;
  analytics:
    | { enabled: false }
    | {
        enabled: true;
        segmentToken?: string;
        sentryUrl?: string;
        intercomAppId?: string;
        fullStoryOrgId?: string;
      };
  backendApi: {
    domain?: string;
  };
  sharing:
    | { enabled: false }
    | {
        enabled: true;
        specViewerDomain: string;
      };
}

export type OpticAppConfig = {
  config: IAppConfigurations;
};

const AppConfigurationContext = React.createContext<OpticAppConfig | null>(
  null
);

export const AppConfigurationStore = (props: {
  config: OpticAppConfig;
  children: ReactNode;
}) => {
  return (
    <AppConfigurationContext.Provider value={props.config}>
      {props.children}
    </AppConfigurationContext.Provider>
  );
};

export function useAppConfig() {
  const value = useContext(AppConfigurationContext);
  if (!value) {
    throw new InvariantViolationError(
      'useAppConfig could not find AppConfigurationContext'
    );
  }
  return value.config;
}
