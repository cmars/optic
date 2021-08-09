import { IShapeRenderer } from '<src>/types';

export function summarizeTypes(shapes: IShapeRenderer[], required: boolean) {
  const optionalText = required ? '' : ' (optional)';
  if (shapes.length === 1) {
    return shapes[0].jsonType.toString().toLowerCase() + optionalText;
  } else {
    const allShapes = shapes.map((i) => i.jsonType.toString().toLowerCase());
    const last = allShapes.pop();
    return allShapes.join(', ') + ' or ' + last + optionalText;
  }
}
