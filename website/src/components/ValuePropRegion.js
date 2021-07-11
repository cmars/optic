import React from 'react';
import makeStyles from '@material-ui/styles/makeStyles';
import Grid from '@material-ui/core/Grid';
import { useFeatureStyles } from './featureStyles';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import { Paper } from '@material-ui/core';
import {
  OpticBlue,
  OpticBlueLightened,
  OpticBlueReadable,
} from '@useoptic/ui-v2/src/constants/theme';
import {
  SubtleBlueBackground,
  UpdatedBlue,
  UpdatedBlueBackground,
} from './theme';
import Button from '@material-ui/core/Button';
import Link from '@docusaurus/core/lib/client/exports/Link';

export const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: 70,
    marginBottom: 120,
  },
  detail: {
    marginTop: 30,
  },
  rightBullets: {
    // backgroundColor: SubtleBlueBackground,
    // borderRadius: 8,
    // border: '1px solid',
    // borderColor: UpdatedBlueBackground,
    [theme.breakpoints.up('md')]: {
      marginRight: 25,
      marginTop: 10,
    },
  },
}));

export function DocumentValueProp() {
  const props = {
    mini: 'Document',
    heading: 'Document your API, know when it changes',
    description: `Writing and maintaining accurate API documentation makes your team and all your API consumers more productive, but it’s really hard to maintain docs. Optic solves this problem for teams every day, it documents your API in minutes and helps you update your documentation whenever the API changes.
`,
    image: '/img/Optic_Graphic1.svg',
    bullets: [
      'Document endpoints in seconds',
      'Update docs when the API changes',
      'Share with API changelogs with consumers',
    ],
  };

  return <ValuePropRegion {...props} />;
}
export function ChangeValueProp() {
  const props = {
    mini: 'Change',
    heading: 'Add API Changelogs to Pull Requests & Code Review',
    description:
      ' Have a conversation whenever an API is about to change. Optic adds a\n' +
      '            list of “API Changes” to every Pull Request. API Changes are as\n' +
      '            important to discuss as Code Changes. Optic makes it easy to talk\n' +
      '            about them early, before they affect consumers.',
    image: '/img/Optic_Graphic3.svg',
    bullets: [
      'Document new endpoints in seconds',
      'Review every API Change',
      'Share changelogs with consumers',
    ],
  };

  return <ValuePropRegion {...props} />;
}

export function TestValueProp() {
  const props = {
    mini: 'Test',
    heading: 'Test your API with Optic',
    description:
      'Use traffic from Staging, Development and QA environments to test your API. The traffic from these environments is used to verify the contract when new versions get deployed. Get benefits of Contract Tests, without writing and maintaining them.',
    image: '/img/Optic_Graphic4-01.png',
    bullets: [
      'Detect API Changes Before they affect consumers ',
      'Understand your API Test Coverage',
      'Confidence your APIs work as designed',
    ],
  };

  return <ValuePropRegion {...props} />;
}

export function ValuePropRegion(props) {
  const { mini, heading, description, image, bullets } = props;

  const classes = useStyles();
  const featuredClasses = useFeatureStyles();

  return (
    <Container maxWidth="md" className={classes.container}>
      <Grid container xs={12}>
        <Grid item>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
          >
            <Typography
              variant="subtitle1"
              component="div"
              className={featuredClasses.mini}
            >
              {mini}
            </Typography>
          </div>
          <Typography variant="h1" className={featuredClasses.headline}>
            {heading}
          </Typography>
          <Typography variant="h1" className={featuredClasses.subtext}>
            {description} <br />
            <br /> <Link href="">Document your API in 10 minute ➜ </Link>
          </Typography>
        </Grid>

        <Grid item container xs={12} className={classes.detail}>
          <Grid item xs={12} md={5}></Grid>
          <Grid item xs={12} md={7}>
            <img src={image} />
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
