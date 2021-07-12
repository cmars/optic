import makeStyles from '@material-ui/styles/makeStyles';
import React, { useEffect, useState } from 'react';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { useFeatureStyles } from './featureStyles';
import Box from '@material-ui/core/Box';
import { GitHubStats } from './GitHubStatsSlim';
import useDocusaurusContext from '@docusaurus/core/lib/client/exports/useDocusaurusContext';
import { Paper } from '@material-ui/core';
import { Code } from './CodeBlock';
import Link from '@docusaurus/core/lib/client/exports/Link';
TimeAgo.addLocale(en);
import ForumIcon from '@material-ui/icons/Forum';
import { SubtleBlueBackground } from './theme';
const timeAgo = new TimeAgo('en-US');

const Headlines = {
  headline: 'Optic documents your APIs\n as you develop them',
  subtext:
    'Updating API specifications should be as easy as making a Git commit.',
  subtext1:
    'API changelogs should be a part of every PRs, with breaking changes caught in CI.',
  siteDescription:
    'Open Source Tool that make API specifications as easy to use as Git.',
  featuredSlug: '/blog/git-for-apis',
  featured2Slug: '/blog/optic-se-daily',
  siteHeadline: 'APIs that Document and Test Themselves',
};

const useStyles = makeStyles((theme) => ({
  root: {
    paddingTop: 90,
    marginBottom: 30,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    backgroundImage: `url('/img/svg-bg.svg')`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '95% 60%',
    backgroundAttachment: 'local',
    backgroundSize: '120px 120px',
    [theme.breakpoints.down('md')]: {
      backgroundImage: 'none',
    },
  },
  textWrap: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  card: {
    minHeight: 190,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
  },
  mini: {
    fontWeight: 100,
    color: '#6d757d',
    fontFamily: 'Ubuntu Mono',
    fontSize: 18,
    marginLeft: 2,
  },
  when: {
    fontWeight: 100,
    color: '#6d757d',
    fontFamily: 'Ubuntu Mono',
    fontSize: 14,
    marginLeft: 3,
  },
  button: {
    marginTop: 9,
  },
  download: {
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  oss: {
    fontSize: 14,
    color: '#6d757d',
    fontFamily: 'Ubuntu Mono',
    fontWeight: 800,
    textAlign: 'left',
  },
  copyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    marginBottom: 10,
  },
}));

function HomePageHero(props) {
  const classes = useStyles();
  const featuredClasses = useFeatureStyles();

  return (
    <div style={{ paddingBottom: 70 }}>
      <Container maxWidth="lg" fullWidth className={classes.root}>
        <Container maxWidth="md" className={classes.copyContainer}>
          <Typography variant="subtitle1" className={featuredClasses.mini}>
            Meet Optic
          </Typography>
          <Typography variant="h1" className={featuredClasses.headline}>
            Understand your APIs, know when they change
          </Typography>
          <Typography variant="h1" className={featuredClasses.subtext}>
            Optic watches real traffic to understand your API behavior and helps
            developers with API documentation and testing. With Optic every
            API change is documented, reviewed, and approved before getting
            deployed.
          </Typography>

          <GitHubStats style={{ marginTop: 20 }} />
        </Container>
      </Container>
      <Container maxWidth="lg" fullWidth>
        <Paper elevation={2} style={{ display: 'flex' }}>
          <img src={'/img/optic-image.png'} />
        </Paper>
      </Container>
    </div>
  );
}

function ReleaseInfoCard() {
  const [version, setVersion] = useState();
  useEffect(() => {
    const result = fetch(
      `https://api.github.com/repos/opticdev/optic/releases`
    );

    result.then((results) => {
      results.json().then((all) => {
        setVersion(all[0]);
      });
    });
  }, []);

  return (
    <InfoCard
      mini={'Latest Release'}
      subtext={`Optic CLI ${version ? version.tag_name : 'v9.x.x'}`}
      when={
        version ? timeAgo.format(new Date(version.created_at)) : '1 day ago'
      }
      link={'/docs'}
      linkText={'Get Started'}
    />
  );
}

function AnnouncementCard({ posts }) {
  const { featured1 } = require('../../latest.json');

  return (
    <InfoCard
      mini={'Announcement'}
      subtext={featured1.name}
      when={timeAgo.format(new Date(featured1.date))}
      link={featured1.to}
      linkText={'learn more'}
    />
  );
}

function BlogCard({ posts }) {
  const { featured2 } = require('../../latest.json');

  return (
    <InfoCard
      mini={'Recent Posts'}
      subtext={featured2.name}
      when={timeAgo.format(new Date(featured2.date))}
      link={featured2.to}
      linkText={'read more'}
    />
  );
}

function InfoCard(props) {
  const { mini, subtext, target, when, link, linkText } = props;
  const classes = useStyles();
  return (
    <Grid xs={12} sm={12} md={4} item>
      <Card className={classes.card} elevation={2}>
        <div className={classes.textWrap}>
          <Typography variant="caption" className={classes.mini}>
            {mini}
          </Typography>
          <Typography variant="h6" style={{ marginLeft: 1 }}>
            {subtext}
          </Typography>
          <Typography variant="subtitle1" className={classes.when}>
            {when}
          </Typography>
        </div>
        <Button
          endIcon={<ChevronRightIcon />}
          size="small"
          href={link}
          target={target}
          color="primary"
          className={classes.button}
        >
          {linkText}
        </Button>
      </Card>
    </Grid>
  );
}

export default HomePageHero;
