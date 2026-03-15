import * as ImageManipulator from "expo-image-manipulator";

const MAX_DIMENSION = 1024;

export async function prepareImage(uri: string): Promise<string> {
  const actions: ImageManipulator.Action[] = [];

  const info = await ImageManipulator.manipulateAsync(uri, [], {});
  const { width, height } = info;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      actions.push({ resize: { width: MAX_DIMENSION } });
    } else {
      actions.push({ resize: { height: MAX_DIMENSION } });
    }
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}
