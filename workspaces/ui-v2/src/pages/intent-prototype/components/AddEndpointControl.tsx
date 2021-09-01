import React from 'react';

import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core';
import { Stepper, Step, StepButton, StepLabel } from '@material-ui/core';

const STEPS = [
  { href: '/debug-capture/provide', label: 'Provide a capture' },
  { href: '/debug-capture/select', label: 'Select endpoints' },
  { href: '/review', label: 'Review and edit' },
];

export default function AddEndpointControl({
  intentPath,
  activeStep,
}: {
  intentPath: string;
  activeStep: number;
}) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <div className={styles.controlsHeader}>
        <h4 className={styles.controlsTitle}>Add endpoints</h4>

        <Stepper
          className={styles.controlsProgress}
          activeStep={activeStep}
          alternativeLabel
        >
          {STEPS.map(({ href, label }, index) => (
            <Step completed={activeStep > index} key={label}>
              {activeStep >= index ? (
                <StepButton component={Link} to={`${intentPath}/${href}`}>
                  {label}
                </StepButton>
              ) : (
                <StepLabel>{label}</StepLabel>
              )}
            </Step>
          ))}
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
