import React, { FC, useMemo } from 'react';
import { makeStyles, darken, lighten } from '@material-ui/core';
import ClassNames from 'classnames';

import { IFieldDetails, IShapeRenderer } from '<src>/types';
import * as Theme from '<src>/styles/theme';

export const ShapeEditor: FC<{
  fields: IFieldDetails[];
  selectedFieldId: string | null;
  setSelectedField: (fieldId: string | null) => void;
}> = ({ fields, selectedFieldId, setSelectedField }) => {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      {fields.length > 0 && (
        <ul className={classes.rowsList}>
          {fields.map((field) => (
            <li className={classes.rowListItem}>
              <Row
                field={field}
                selected={selectedFieldId === field.fieldId}
                onSelect={setSelectedField}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Row: FC<{
  field: IFieldDetails;
  selected: boolean;

  onSelect?: (fieldId: string) => void;
}> = function ShapeEditorRow({ field, selected, onSelect }) {
  const classes = useStyles();

  const onClickFieldHeader = useMemo(
    () => () => {
      if (onSelect) onSelect(field.fieldId);
    },
    [onSelect, field.fieldId]
  );

  return (
    <div className={classes.row}>
      <Field
        depth={field.depth}
        name={field.name}
        required={field.required}
        shapes={field.shapes}
        selected={selected}
        onClickHeader={onClickFieldHeader}
      >
        {selected && <FieldEditor field={field} />}
      </Field>
    </div>
  );
};

const FieldEditor: FC<{
  field: IFieldDetails;
}> = function ShapeEditorFieldEditor({ field }) {
  const classes = useStyles();

  return <div className={classes.editor}>Editor</div>;
};

const useStyles = makeStyles((theme) => ({
  container: {},
  rowsList: {
    listStyleType: 'none',
    paddingLeft: 0,
  },
  rowListItem: {},
  row: {},

  editor: {
    padding: theme.spacing(2, 3),
    minHeight: theme.spacing(10),
    marginBottom: theme.spacing(2),

    color: '#6b7384',

    boxShadow: 'inset 0px 13px 10px -10px rgba(0, 0, 0, 0.07)',
  },
}));

const Field: FC<{
  children?: React.ReactNode;
  depth: number;
  name: string;
  required: boolean;
  selected: boolean;
  shapes: IShapeRenderer[];

  onClickHeader?: () => void;
}> = function ShapeEditorField({
  name,
  shapes,
  required,
  depth,
  children,
  selected,
  onClickHeader,
}) {
  const classes = useFieldStyles();

  const onClickHeaderHandler = useMemo(
    () => (e: React.MouseEvent) => {
      e.preventDefault();
      if (onClickHeader) onClickHeader();
    },
    [onClickHeader]
  );

  return (
    <div
      className={ClassNames(classes.container, {
        [classes.isSelected]: selected,
        [classes.isIndented]: depth > 0,
      })}
    >
      <header
        className={classes.header}
        onClick={onClickHeaderHandler}
        style={{
          paddingLeft: Math.max(depth - 1, 0) * INDENT_WIDTH,
          backgroundImage: `url("${indentsImageUrl(depth - 1)}")`,
        }}
      >
        <div className={classes.description}>
          <div className={classes.fieldName}>{name}</div>
          <div className={classes.typesSummary}>
            {summarizeTypes(shapes, required)}
          </div>
        </div>
      </header>

      <div className={classes.stage}>{children}</div>
    </div>
  );
};

function summarizeTypes(shapes: IShapeRenderer[], required: boolean) {
  const optionalText = required ? '' : ' (optional)';
  if (shapes.length === 1) {
    return shapes[0].jsonType.toString().toLowerCase() + optionalText;
  } else {
    const allShapes = shapes.map((i) => i.jsonType.toString().toLowerCase());
    const last = allShapes.pop();
    return allShapes.join(', ') + ' or ' + last + optionalText;
  }
}

const INDENT_WIDTH = 8 * 3;
const INDENT_MARKER_WIDTH = 1;
const INDENT_COLOR = '#E4E8ED';
function indentsImageUrl(depth: number = 0) {
  let range = Array(Math.max(depth, 0))
    .fill(0)
    .map((val, n) => n);
  console.log(range);
  let width = INDENT_WIDTH * depth;
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='1' viewBox='0 0 ${width} 1'>
        ${range
          .map(
            (n) => `
            <rect fill="${INDENT_COLOR}" x="${
              INDENT_WIDTH * n
            }" y="0" height="1" width="${INDENT_MARKER_WIDTH}" />;
          `
          )
          .join('')}
      </svg>`
    )
  );
}

const useFieldStyles = makeStyles((theme) => ({
  container: {
    fontFamily: Theme.FontFamily,
    padding: theme.spacing(0, 0, 0, 1),
  },
  isSelected: {},
  isIndented: {},

  header: {
    display: 'flex',
    backgroundPositionX: 0,
    backgroundRepeat: 'repeat-y',
    padding: 0,
    cursor: 'pointer',

    '$isSelected &': {
      borderBottom: `1px solid ${lighten(Theme.OpticBlueReadable, 0.5)}`,

      '&:hover': {
        borderBottom: `1px solid ${lighten(Theme.OpticBlueReadable, 0.2)}`,
      },
    },
  },
  description: {
    display: 'flex',
    padding: theme.spacing(1, 0),
    alignItems: 'baseline',
    borderLeft: `1px solid #E4E8ED`,
    borderLeftWidth: 0,

    '$isIndented &': {
      paddingLeft: INDENT_WIDTH,
      borderLeftWidth: '1px',
    },

    '$isIndented $header:hover &': {
      borderLeftColor: darken(INDENT_COLOR, 0.3),
    },

    '$isIndented$isSelected &': {
      borderLeftWidth: '1px',
      borderLeftColor: lighten(Theme.OpticBlueReadable, 0.5),
    },
  },

  fieldName: {
    color: '#3c4257',
    fontWeight: theme.typography.fontWeightBold,
    fontSize: theme.typography.fontSize - 1,
    marginRight: theme.spacing(1),
  },
  typesSummary: {
    fontFamily: Theme.FontFamilyMono,
    color: '#8792a2',
  },

  stage: {},
}));
