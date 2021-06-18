import React from 'react';

import makeStyles from '@material-ui/core/styles/makeStyles';
import { primary, SubtleBlueBackground, UpdatedBlueBackground } from './theme';
import { Paper, Typography } from '@material-ui/core';
import { FormatCopy } from './FormatCopy';
import {
  OpticBlue,
  OpticBlueLightened,
  OpticBlueReadable,
  UpdatedBlue,
} from '@useoptic/ui-v2/src/constants/theme';
import { useFeatureStyles } from './featureStyles';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: 15,
    backgroundColor: SubtleBlueBackground,
    border: '1px solid',
    borderColor: 'transparent',
    cursor: 'pointer',
    marginBottom: 12,
    pointerEvents: 1,
    '&:hover': {
      transition: 'all .2s ease-in-out',
      transform: 'scale(1.01)',
      borderColor: UpdatedBlue,
    },
  },

  root: {},
}));

export const UseCaseCard = ({ title, description }) => {
  const classes = useStyles();
  const featuredStyles = useFeatureStyles();
  return (
    <Paper elevation={2} className={classes.paper}>
      <Typography variant="h5">
        {' '}
        <FormatCopy value={title} />
      </Typography>

      <Typography variant="subtitle2" className={featuredStyles.descriptions}>
        {description}
      </Typography>
    </Paper>
  );
};

/// instances

export const DocumentUseCaseCard = (props) => {
  return (
    <UseCaseCard
      title={'**Document** your API in 10 minutes'}
      description={'Use real traffic to document your API in minutes. '}
    />
  );
};
