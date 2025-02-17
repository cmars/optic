import { JsonType } from '@useoptic/optic-domain';
import { ChangeType } from './changes';
import { IContribution } from './contributions';

// Types for rendering shapes and fields
export interface IFieldRenderer {
  fieldId: string;
  name: string;
  shapeId: string;
  shapeChoices: IShapeRenderer[];
  required: boolean;
  changes: ChangeType | null;
  contributions: Record<string, string>;
  additionalAttributes?: string[];
}

// Used to render an objects field details and contributions
export interface IFieldDetails {
  fieldId: string;
  name: string;
  contribution: IContribution;
  shapes: IShapeRenderer[];
  depth: number;
  required: boolean;
}

// Used to render query parameters
export type QueryParameters = Record<string, IFieldRenderer>;

export type IShapeRenderer =
  | {
      shapeId: string;
      jsonType: JsonType.OBJECT;
      asArray?: undefined;
      asObject: {
        fields: IFieldRenderer[];
      };
    }
  | {
      shapeId: string;
      jsonType: JsonType.ARRAY;
      asArray: IArrayRender;
      asObject?: undefined;
    }
  | {
      shapeId: string;
      jsonType: Exclude<JsonType, JsonType.OBJECT | JsonType.ARRAY>;
      asArray?: undefined;
      asObject?: undefined;
    };

export interface IArrayRender {
  shapeChoices: IShapeRenderer[];
  shapeId: string;
}
