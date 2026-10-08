const fs = require("fs");
const os = require("os");
const path = require("path");
const { saveNotes, loadNotes } = require("./notes-file");

describe("Notes file", () => {
  let folder, file;

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
