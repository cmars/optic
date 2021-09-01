import React from 'react';

import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core';
import { Stepper, Step, StepButton, StepLabel } from '@material-ui/core';

const steps = [
  { href: '/capture-method', label: 'Provide a capture' },
  { href: '/capture-method', label: 'Provide a capture' },
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
          <Step completed={true}>
            <StepButton component={Link} to={`${intentPath}/capture-method`}>
              Provide a capture
            </StepButton>
          </Step>
          <Step completed={false}>
            <StepLabel>Select endpoints</StepLabel>
          </Step>
          <Step completed={false}>
            <StepLabel>Review and edit</StepLabel>
          </Step>
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
