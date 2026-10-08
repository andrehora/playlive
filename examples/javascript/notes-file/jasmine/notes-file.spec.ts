import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { saveNotes, loadNotes } from "./notes-file";

describe("Notes file", () => {
  let folder: string, file: string;

  // Each test gets its own empty folder, removed again afterwards
  beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
    file = path.join(folder, "notes.txt");
  });

  afterEach(() => {
    fs.rmSync(folder, { recursive: true });
  });

  it("loads saved notes back", () => {
    saveNotes(file, ["Buy milk", "Call Ana"]);
    expect(loadNotes(file)).toEqual(["Buy milk", "Call Ana"]);
  });

  it("finds no notes in a missing file", () => {
    expect(loadNotes(file)).toEqual([]);
  });
});
