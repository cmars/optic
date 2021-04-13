import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useSharedDiffContext } from '../../hooks/diffs/SharedDiffContext';

export default function AskForCommitMessage() {
  const [open, setOpen] = React.useState(false);

  const { pendingEndpoints } = useSharedDiffContext();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const pendingEndpointsCount = pendingEndpoints.filter((i) => i.staged).length;

  const handleSave = () => {
    // setOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleClickOpen}
        size="small"
        color="primary"
        style={{ fontSize: 10, marginRight: 5 }}
      >
        Save Changes
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">
          Save Changes to Specification
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have added {pendingEndpointsCount} new endpoint
            {pendingEndpointsCount === 1 ? '' : 's'} and updated 6 existing
            endpoints.
          </DialogContentText>
          <TextField
            placeholder="what changes have you made? why?"
            autoFocus
            margin="dense"
            label="Message"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="default">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
