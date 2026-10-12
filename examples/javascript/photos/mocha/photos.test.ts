import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { photosIn } from "./photos";

describe("Photos", () => {
  let folder: string;

  // One folder for every test, filled before the first
  before(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), "photos-"));
    fs.writeFileSync(path.join(folder, "cake.jpg"), "");
    fs.writeFileSync(path.join(folder, "beach.jpg"), "");
    fs.writeFileSync(path.join(folder, "notes.txt"), "");
  });

  // Teardown once: after removes the folder after the last test, even a failing one
  after(() => {
    fs.rmSync(folder, { recursive: true });
  });

  it("lists the photos in order", () => {
    expect(photosIn(folder)).to.deep.equal(["beach.jpg", "cake.jpg"]);
  });

  it("leaves out other files", () => {
    expect(photosIn(folder)).to.not.include("notes.txt");
  });
});
