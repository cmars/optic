import React from 'react';
import makeStyles from '@material-ui/styles/makeStyles';
import { Container, Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';

import { useFeatureStyles } from './featureStyles';
import { FormatCopy } from './FormatCopy';
import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import ForumIcon from '@material-ui/icons/Forum';
import Link from '@docusaurus/core/lib/client/exports/Link';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import { GitHubStats } from './GitHubStatsSlim';
import {
  SubtleBlueBackground,
  UpdatedBlue,
  UpdatedBlueBackground,
  UpdatedBlueBackgroundLighter,
} from './theme';
import Grid from '@material-ui/core/Grid';
export const useStyles = makeStyles({
  section: {
    paddingTop: 100,
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  subtext: {
    fontSize: 25,
    fontWeight: 300,
    marginTop: 14,
    textAlign: 'center',
  },
  headline: {
    marginTop: 25,
    fontWeight: 800,
    textAlign: 'center',
  },
  link: {
    fontSize: 24,
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
});

export function CTATryOptic() {
  const classes = useStyles();
  const featuredStyles = useFeatureStyles();
  return (
    <div className={classes.section}>
      <Container maxWidth="lg">
        <Grid container xs={12}>
          <Grid item xs={12} sm={5}>
            <img
              src="/img/Optic_Graphic2.svg"
              width="400"
              style={{ marginRight: 30 }}
            />
          </Grid>
          <Grid item xs={12} sm={7}>
            <Typography variant="h1" className={featuredStyles.headline}>
              We're here to help your team build a great API
            </Typography>
            <Typography variant="h1" className={featuredStyles.subtext}>
              Explore our docs, our live demos and read about the workflows
              Optic enables. When you are ready, set Optic up (it takes 10 mins)
              or have a conversation with the Optic maintainers for help.
            </Typography>
            <Box style={{ marginTop: 5, marginBottom: 120 }}>
              <Box
                alignItems="center"
                display="flex"
                flexDirection="row"
                justifyContent="flex-start"
              >
                <Button
                  endIcon={<ChevronRightIcon />}
                  to="/docs"
                  variant="contained"
                  color="primary"
                >
                  Get Started
                </Button>

                <div style={{ marginLeft: 10 }}>
                  <Link>Schedule a Demo</Link>
                </div>
              </Box>
              <Typography
                variant="body1"
                style={{ color: '#6d757d', marginTop: 20 }}
              >
                When the CLI is installing, be sure to{' '}
                <Link>join the community.</Link>
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}
