import * as fs from "fs";

export function photosIn(folder: string): string[] {
  const photos: string[] = [];
  for (const name of fs.readdirSync(folder).sort()) {
    if (name.endsWith(".jpg")) {
      photos.push(name);
    }
  }
  return photos;
}
