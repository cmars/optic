import React, { useRef } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { useHistory } from '@docusaurus/router';

import { Link } from '@material-ui/core';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function PreviewPageModal(props) {
  const { Source, link, children } = props;

  const history = useHistory();
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <div onClick={handleClickOpen}>{children}</div>
      <Dialog
        open={open}
        maxWidth={'lg'}
        fullWidth={true}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
      >
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
          <Button
            endIcon={<OpenInNewIcon />}
            onClick={() => history.push(link)}
            style={{ textDecoration: 'none' }}
            color="primary"
          >
            Open as Page
          </Button>
        </DialogActions>
        <DialogContent>{Source}</DialogContent>
      </Dialog>
    </div>
  );
}
