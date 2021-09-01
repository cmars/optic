import React, { useContext, useMemo } from 'react';

import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core';
import { Stepper, Step, StepButton, StepLabel } from '@material-ui/core';

import { PathComponentAuthoring } from '<src>/utils';
import { IHttpInteraction, CQRSCommand } from '@useoptic/optic-domain';

const AddEndpointReactContext = React.createContext<AddEndpointContext | null>(
  null
);

export const { Provider } = AddEndpointReactContext;

type AddEndpointContext = {
  intentPath: string;
  stats: {
    captureSize: number | null;
    selectedEndpointsAmount: number | null;
  };
};

export type EndpointPrototype = {
  path: string;
  method: string;
  pathId: string;
  commands: CQRSCommand[];
};

export function createContext(
  intentPath: string,
  interactions: IHttpInteraction[] | null,
  learnedEndpoints: EndpointPrototype[] | null
): AddEndpointContext {
  return {
    intentPath,
    stats: {
      captureSize: interactions?.length || null,
      selectedEndpointsAmount: learnedEndpoints?.length || null,
    },
  };
}

function useIntentPath(): string {
  const context = useContext(AddEndpointReactContext);
  if (!context)
    throw Error('useIntentPath must be used inside a AddEndpointContext');

  return context.intentPath;
}

function useStats() {
  const context = useContext(AddEndpointReactContext);
  if (!context)
    throw Error('useStats must be used inside a AddEndpointContext');

  const clone = useMemo(() => {
    return { ...context.stats };
  }, [context.stats]);

  return clone; // no editing of read-only contexts pls
}

// AddEndpointControl
// ------------------
const STEPS = [
  {
    href: 'debug-capture/provide',
    label: 'Provide a capture',
    completed: (stats: AddEndpointContext['stats']) =>
      !!stats.captureSize && stats.captureSize > 0,
  },
  {
    href: 'debug-capture/select',
    label: 'Select endpoints',
    completed: (stats: AddEndpointContext['stats']) =>
      !!stats.selectedEndpointsAmount && stats.selectedEndpointsAmount > 0,
  },
  { href: 'review', label: 'Review and edit', completed: () => false },
];

export function AddEndpointControl({ activeStep }: { activeStep: number }) {
  const styles = useStyles();

  const stats = useStats();
  const intentPath = useIntentPath();

  return (
    <div className={styles.container}>
      <div className={styles.controlsHeader}>
        <h4 className={styles.controlsTitle}>Add endpoints</h4>

        <Stepper
          className={styles.controlsProgress}
          activeStep={activeStep}
          alternativeLabel
          nonLinear
        >
          {STEPS.map(({ href, label, completed }, index) => {
            let previousStep = (index > 0 && STEPS[index - 1]) || null;

            let selectable = previousStep
              ? previousStep.completed(stats)
              : true;

            return (
              <Step completed={completed(stats)} key={label}>
                {selectable ? (
                  <StepButton component={Link} to={`${intentPath}/${href}`}>
                    {label}
                  </StepButton>
                ) : (
                  <StepLabel>{label}</StepLabel>
                )}
              </Step>
            );
          })}
        </Stepper>
      </div>
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {},

  controlsHeader: {
    display: 'flex',
  },
  controlsTitle: {
    ...theme.typography.h6,
    margin: theme.spacing(1, 0),
    color: theme.palette.grey[400],
  },
  controlsProgress: {
    background: 'none',
    flexGrow: 1,
  },
  controlsProgressDetails: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize - 3,
  },
  controlsContent: {},
}));
