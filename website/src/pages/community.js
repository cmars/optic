import React from 'react';
import { MuiThemeProvider } from './Roadmap';
import Layout from '@theme/Layout';
import {
  Container,
  Typography,
  Divider,
  Link,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { SubtleBlueBackground } from '../components/theme';
import { UseCaseCard } from '../components/UseCaseCard';

// Logos
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import {
  faCode,
  faFileAlt,
  faPen,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
library.add(fab, faCode, faFileAlt, faPen, faClock);

const useStyles = makeStyles((theme) => ({
  root: {
    height: 400,
    backgroundColor: SubtleBlueBackground,
    borderBottom: '1px solid #e2e2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  section: {
    marginTop: 50,
    marginBottom: 100,
  },
  heading: {
    fontFamily: 'Ubuntu Mono',
    fontWeight: 700,
    fontSize: 25,
  },
}));

// Links outside of Optic
const externalLinks = {
  discord: {
    href: 'https://discord.gg/t9hADkuYjP',
    logo: <FontAwesomeIcon icon={['fab', 'discord']} />,
  },
  githubDiscussions: {
    href: 'https://github.com/opticdev/optic/discussions',
    logo: <FontAwesomeIcon icon={['fab', 'github']} />,
  },
  officeHoursCalendly: {
    href: 'https://calendly.com/opticlabs/maintainer-office-hours',
    logo: <FontAwesomeIcon icon="clock" />,
  },
  onboardingCalendly: {
    href: 'https://calendly.com/optic-onboarding/demo',
    logo: <FontAwesomeIcon icon="clock" />,
  },
};

export default function () {
  const classes = useStyles();
  const signpostGridSize = 4;
  const emailFounders = (
    <Link href="mailto:founders@useoptic.com">founders@useoptic.com</Link>
  );
  return (
    <Layout title="Community">
      <MuiThemeProvider>
        <Container maxWidth={false} className={classes.root}>
          <Grid container className={classes.root} spacing={0}>
            <Grid item xs={6}>
              <Typography variant="h1" className={classes.heading}>
                Welcome to the Optic Community
              </Typography>
              <Typography
                variant="subtitle1"
                align="left"
                style={{ lineHeight: 1.6, marginTop: 10 }}
              >
                <strong>
                  Let's build better APIs with API tools, together!
                </strong>
              </Typography>
              <Typography
                variant="subtitle1"
                style={{ lineHeight: 1.6, marginTop: 10 }}
              >
                Find resources, ask questions, and share your knowledge!
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <img src="https://placekitten.com/400/400" />
            </Grid>
          </Grid>
        </Container>

        {/*
          SIGNPOSTS
        */}

        <Container maxWidth={'md'} className={classes.section}>
          <Divider style={{ marginTop: 20, marginBottom: 30 }} />

          <Grid container spacing={4}>
            <Grid item xs={12} sm={signpostGridSize}>
              <UseCaseCard
                link={externalLinks.discord.href}
                title={'**Discord**'}
                description={
                  'Come talk to our community, the contributors, and the maintainers to get help or that little extra information.'
                }
                logo={externalLinks.discord.logo}
              />
            </Grid>
            <Grid item xs={12} sm={signpostGridSize}>
              <UseCaseCard
                link={'/capture'}
                title={'**Integrations**'}
                description={
                  'Want to use optic with your language or framework, we have a whole selection of integrations and plugins for you to use.'
                }
                logo={<FontAwesomeIcon icon={'code'} />}
              />
            </Grid>
            <Grid item xs={12} sm={signpostGridSize}>
              <UseCaseCard
                link={'/reference'}
                title={'**Docs**'}
                description={
                  'Get stuck in with Optic, use our reference docs to find out all the features available to you.'
                }
                logo={<FontAwesomeIcon icon={'file-alt'} />}
              />
            </Grid>
            <Grid item xs={12} sm={signpostGridSize}>
              <UseCaseCard
                link={externalLinks.githubDiscussions.href}
                title={'**Discussions**'}
                description={
                  'Want to start a conversation about a topic or concept around APIs, Optic Concepts, or Optic in general, check GitHub Discussions.'
                }
                logo={externalLinks.githubDiscussions.logo}
              />
            </Grid>
            <Grid item xs={12} sm={signpostGridSize}>
              <UseCaseCard
                link={'/roadmap'}
                title={'**Feature Request**'}
                description={
                  'Got a feature you think would be great within Optic, submit it and see if it ends up part of the roadmap.'
                }
                logo={<FontAwesomeIcon icon={'pen'} />}
              />
            </Grid>
            <Grid item xs={12} sm={signpostGridSize}>
              <UseCaseCard
                link={externalLinks.officeHoursCalendly.href}
                title={'**Office Hours**'}
                description={
                  'Like to speak directly to the maintainers? Arrange a time to speak with them about your Optic quandaries'
                }
                logo={externalLinks.officeHoursCalendly.logo}
              />
            </Grid>
          </Grid>
        </Container>

        {/* 
       CONTRIBUTIONS
       */}

        <Container maxWidth={'md'} className={classes.section}>
          <Typography
            variant="h2"
            className={classes.heading}
            style={{ textAlign: 'center', fontSize: 30 }}
          >
            Get involved
          </Typography>

          <Divider style={{ marginTop: 20, marginBottom: 30 }} />

          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <img src="https://placekitten.com/400/400" />
            </Grid>
            <Grid item xs={12} sm={8}>
              <Typography variant="subtitle1">
                We really appreciate you being interested in Optic and what it
                can do to help make better APIs.
              </Typography>
              <Typography variant="subtitle1">
                No matter what you do, or where in the world you are, there are
                many ways you can help out with various levels of commitment!
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="level1-content"
                  id="level1-header"
                >
                  <Typography>👍 &nbsp; Send some Encouragement</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div styles={'display: block'}>
                    <div>
                      <p>
                        This is a big project and it's only getting larger, and
                        we've been working a long time to make it great for
                        developers. You have no idea how much it means to
                        receive{' '}
                        <Link href="https://twitter.com/intent/tweet?via=useoptic">
                          a short Tweet
                        </Link>{' '}
                        or email ({emailFounders}).
                      </p>
                    </div>
                    <div>
                      <ul>
                        <li>
                          <Link href="https://github.com/opticdev/optic/stargazers">
                            GitHub Stars feel great
                          </Link>
                        </li>
                        <li>
                          <Link href="https://twitter.com/useoptic">
                            Twitter follows are fun
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p>
                        It's amazing to know more and more people are using and
                        appreciating the work being put in.
                      </p>
                    </div>
                  </div>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="level2-content"
                  id="level2-header"
                >
                  <Typography>✍️ &nbsp; Have any feedback?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div>
                    <p>
                      The more quality feedback we receive, the faster we'll
                      reach product-market fit. We'd love to have your feedback,
                      and you can send it to {emailFounders}, add it to{' '}
                      <Link href={externalLinks.githubDiscussions.href}>
                        GitHub Discussions
                      </Link>
                      , or even raise it in{' '}
                      <Link href={externalLinks.discord.href}>Discord</Link>.
                    </p>
                  </div>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="level3-content"
                  id="level3-header"
                >
                  <Typography>🏁 &nbsp; Use Optic at Work</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div styles={'display: block'}>
                    <p>
                      Every API should use something like Optic for automated
                      documentation and testing. Whether you work at a startup
                      or a large company, the more teams that use Optic, the
                      better.
                    </p>
                    <p>
                      We can help you get set-up and answer your questions with
                      a 30 minute on-boarding call. You can book it really
                      quickly at{' '}
                      <Link href={externalLinks.onboardingCalendly.href}>
                        {externalLinks.onboardingCalendly.href}
                      </Link>{' '}
                      and invite a colleague 😊
                    </p>
                  </div>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="level4-content"
                  id="level4-header"
                >
                  <Typography>🎨 &nbsp; Publish Content</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div styles={'display: block'}>
                    <p>
                      Help spread the word and build the community by creating
                      some Optic content. Our team will help you promote it and
                      send you some thank you Optic swag.
                    </p>
                    <p>Examples of Content:</p>
                    <ul>
                      <li>Blog Post</li>
                      <li>
                        <Link href="https://twitter.com/intent/tweet?via=useoptic">
                          Tweet or TweetStorm
                        </Link>
                      </li>
                      <li>Make a tutorial post or video</li>
                      <li>
                        Improve the Optic docs (maybe even the page you're
                        reading right now)
                      </li>
                      <li>
                        Create boilerplate projects to help people get started
                        faster ie Express with Optic, or Rails w/ Optic
                      </li>
                    </ul>
                    <p>
                      Email us {emailFounders} before publishing so we know to
                      share your content.{' '}
                    </p>
                  </div>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="level5-content"
                  id="level5-header"
                >
                  <Typography>⌨️ &nbsp; Contribute Code</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div>
                    <p>
                      Optic is open source and you can see all our code on{' '}
                      <Link href="https://github.com/opticdev/optic">
                        GitHub
                      </Link>{' '}
                      at{' '}
                      <Link href="https://github.com/opticdev/optic">
                        https://github.com/opticdev/optic
                      </Link>
                      . You're more than welcome to get involved:
                    </p>
                    <ul>
                      <li>Fix a bug you find</li>
                      <li>
                        <Link href="https://github.com/opticdev/optic/issues">
                          Open an issue
                        </Link>
                      </li>
                      <li>
                        Check our{' '}
                        <Link href="https://github.com/opticdev/optic/issues">
                          open issues
                        </Link>{' '}
                        and talk to us at {emailFounders} about working on them.
                      </li>
                    </ul>
                    <p>
                      <strong>
                        Do you know a lot about managing open source projects?
                      </strong>{' '}
                      As you can see our contributor guides are still nascent.
                      We would love to chat and learn everything we can about
                      building a great open source community.
                    </p>
                  </div>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="level6-content"
                  id="level6-header"
                >
                  <Typography>🍀 &nbsp; Join the Team</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div>
                    <p>
                      Like Optic and want to work full time on it? We're hiring
                      people to help us make Optic even better, checkout{' '}
                      <Link href="/careers">our careers</Link> page with details
                      on the roles and about working here.
                    </p>
                  </div>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </Container>

        {/* 
        CONTRIBUTIONS
        */}

        <Container maxWidth={'md'} className={classes.section}>
          <Typography
            variant="h2"
            className={classes.heading}
            style={{ textAlign: 'center', fontSize: 30 }}
          >
            Interested in APIs in general?
          </Typography>

          <Divider style={{ marginTop: 20, marginBottom: 30 }} />

          <Grid container spacing={4}>
            <Grid item xs={12} sm={8}>
              <Typography variant="subtitle1">
                We cover them quite extensively here, our{' '}
                <Link href="https://useoptic.com/blog">blog</Link> has posts on
                documentation and concepts. And out in the wild you can listen
                to our very own{' '}
                <Link href="https://github.com/acunniffe">Aidan Cunniffe</Link>{' '}
                is part API Storytelling with{' '}
                <Link href="https://twitter.com/kinlane">Kin Lane</Link> and{' '}
                <Link href="https://twitter.com/mamund">Mike Amundsen</Link>.
                You can catch watch the video cast on{' '}
                <Link href="https://www.youtube.com/channel/UChLC45yh9DTkerV-TSJJo3A/featured">
                  YouTube
                </Link>
                , or listen to the podcast at{' '}
                <Link href="https://anchor.fm/api-storytelling">
                  https://anchor.fm/api-storytelling
                </Link>
                .
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <img src="https://s3-us-west-2.amazonaws.com/anchor-generated-image-bank/production/podcast_uploaded400/15633871/15633871-1623593067716-39a739b0c116d.jpg" />
            </Grid>
          </Grid>
        </Container>
      </MuiThemeProvider>
    </Layout>
  );
}
