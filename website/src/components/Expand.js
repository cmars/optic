import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { primary, SubtleBlueBackground, UpdatedBlue } from './theme';
import { FormatCopy } from './FormatCopy';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    backgroundColor: SubtleBlueBackground,
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
}));

export default function ExpandDocs(props) {
  const { defaultOpen, title, children } = props;

  const classes = useStyles();
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <Accordion
      expanded={open}
      elevation={0}
      onChange={() => setOpen(!open)}
      className={classes.root}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1a-content"
        id="panel1a-header"
      >
        <Typography variant="h6" color="primary">
          <FormatCopy value={title} />
        </Typography>
      </AccordionSummary>
      <AccordionDetails style={{ display: 'flex', flexDirection: 'column' }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}
