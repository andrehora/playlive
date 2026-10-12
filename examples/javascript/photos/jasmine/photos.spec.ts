import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { photosIn } from "./photos";

describe("Photos", () => {
  let folder: string;

  // One folder for every test, filled before the first
  beforeAll(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), "photos-"));
    fs.writeFileSync(path.join(folder, "cake.jpg"), "");
    fs.writeFileSync(path.join(folder, "beach.jpg"), "");
    fs.writeFileSync(path.join(folder, "notes.txt"), "");
  });

  // Teardown once: afterAll removes the folder after the last test, even a failing one
  afterAll(() => {
    fs.rmSync(folder, { recursive: true });
  });

  it("lists the photos in order", () => {
    expect(photosIn(folder)).toEqual(["beach.jpg", "cake.jpg"]);
  });

  it("leaves out other files", () => {
    expect(photosIn(folder)).not.toContain("notes.txt");
  });
});
