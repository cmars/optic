import React, { FC, useState } from 'react';
import { makeStyles, Theme } from '@material-ui/core';
import { Check as CheckIcon, Edit as EditIcon } from '@material-ui/icons';
import { FontFamily, FontFamilyMono } from '<src>/styles';

type ContributionFieldProps = {
  fieldId: string;
  depth: number;
  name: string;
  descriptor: string;
  description: string;
};

export const ContributionField: FC<ContributionFieldProps> = ({
  depth,
  name,
  descriptor,
  description,
}) => {
  const classes = useStyles({ depth, isEditable: false });

  return (
    <div className={classes.container}>
      <div className={classes.fieldDetailContainer}>
        <div className={classes.fieldName}>{name}</div>
        <div className={classes.fieldDescriptor}>{descriptor}</div>
      </div>
      <div className={classes.contributionContainer}>{description}</div>
    </div>
  );
};

type EditableContributionFieldProps = ContributionFieldProps & {
  isEditable: boolean;
  setSelectedField?: (selectedFieldId: string | null) => void;
};

export const EditableContributionField: FC<EditableContributionFieldProps> = ({
  fieldId,
  depth,
  name,
  descriptor,
  description,
  isEditable,
  setSelectedField,
}) => {
  const classes = useStyles({ depth, isEditable });
  const [isEditing, setIsEditing] = useState(false);

  // TODO connect isOptional and isNullable to fields
  // TODO connect contributions
  // TODO connect toggles to optional and nullable
  return (
    <div className={classes.container}>
      <div
        className={classes.fieldDetailContainer}
        onClick={() => {
          if (isEditable) {
            // Select field when clicked into, and unselect when stop editing
            setSelectedField && setSelectedField(!isEditing ? fieldId : null);
            setIsEditing((prevIsEditing) => !prevIsEditing);
          }
        }}
      >
        <div className={classes.fieldName}>{name}</div>
        <div className={classes.fieldDescriptor}>{descriptor}</div>
        {isEditable && (
          <div className={classes.iconContainer}>
            {isEditing ? (
              <CheckIcon fontSize="small" />
            ) : (
              <EditIcon fontSize="small" />
            )}
          </div>
        )}
      </div>
      <div className={classes.contributionContainer}>
        {isEditing ? (
          <>
            {/* TODO hook up editing fields and other stuff here */}
            <div>toggle for optional</div>
            <div>toggle for nullable</div>
            <div>field for updating description</div>
            <div>remove button</div>
          </>
        ) : (
          description
        )}
      </div>
    </div>
  );
};

const useStyles = makeStyles<Theme, { depth: number; isEditable: boolean }>(
  (theme) => ({
    container: (props) => ({
      borderTop: '1px solid #e4e8ed',
      padding: theme.spacing(0.75, 0),
      paddingLeft: props.depth * 14,
    }),
    fieldDetailContainer: (props) => ({
      display: 'flex',
      alignItems: 'center',
      padding: theme.spacing(1, 0),
      cursor: props.isEditable ? 'pointer' : 'default',
    }),
    fieldName: {
      color: '#3c4257',
      fontWeight: 600,
      fontSize: theme.typography.fontSize - 1,
      fontFamily: FontFamily,
    },
    iconContainer: {
      flexGrow: 1,
      display: 'flex',
      justifyContent: 'flex-end',
    },
    fieldDescriptor: {
      fontFamily: FontFamilyMono,
      fontSize: theme.typography.fontSize - 2,
      color: '#8792a2',
      padding: theme.spacing(0, 1),
    },
    contributionContainer: {
      paddingLeft: theme.spacing(1),
    },
  })
);
