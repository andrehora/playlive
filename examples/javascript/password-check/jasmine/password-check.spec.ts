import { isStrong } from "./password-check";

describe("Password check", () => {
  it("calls a long password with a digit and a capital strong", () => {
    expect(isStrong("Sunflower7")).toBeTrue();
  });

  it("calls a short password weak", () => {
    expect(isStrong("Sun7")).toBeFalse();
  });

  it("calls a password without a digit weak", () => {
    expect(isStrong("Sunflowers")).toBeFalse();
  });

  it("calls a password without a capital weak", () => {
    expect(isStrong("sunflower7")).toBeFalse();
  });
});
