import { makeStyles } from '@material-ui/styles';
import {
  AddedGreen,
  ChangedYellow,
  ChangedYellowBackground,
  RemovedRed,
  RemovedRedBackground,
} from '<src>/styles';

export const useChangelogStyles = makeStyles(() => ({
  added: {
    backgroundColor: `rgba(0,196,70,0.2)`,
    borderLeft: `2px solid ${AddedGreen}`,
  },
  updated: {
    backgroundColor: ChangedYellowBackground,
    borderLeft: `2px solid ${ChangedYellow}`,
  },
  removed: {
    backgroundColor: RemovedRedBackground,
    borderLeft: `2px solid ${RemovedRed}`,
  },
}));
