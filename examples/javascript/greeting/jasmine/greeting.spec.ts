import { clock, greet } from "./greeting";

// The real clock changes, so the tests replace it with a fixed hour
describe("Greeting", () => {
  it("says good morning", () => {
    spyOn(clock, "hour").and.returnValue(9);
    expect(greet("Ana")).toBe("Good morning, Ana");
  });

  it("says good afternoon", () => {
    spyOn(clock, "hour").and.returnValue(15);
    expect(greet("Ana")).toBe("Good afternoon, Ana");
  });

  it("says good evening", () => {
    spyOn(clock, "hour").and.returnValue(20);
    expect(greet("Ana")).toBe("Good evening, Ana");
  });
});
