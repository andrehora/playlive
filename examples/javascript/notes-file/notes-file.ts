import * as fs from "fs";

export function saveNotes(path: string, notes: string[]): void {
  fs.writeFileSync(path, notes.join("\n"));
}

export function loadNotes(path: string): string[] {
  try {
    return fs.readFileSync(path, "utf8").split("\n").filter(line => line);
  } catch {
    return [];
  }
}
