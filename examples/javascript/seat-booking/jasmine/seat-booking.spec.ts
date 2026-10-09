import { book } from "./seat-booking";

describe("Seat booking", () => {
  // Bad: only the happy path. Zero, negative, too many, the last seats and a
  // full show are never tried
  it("books seats", () => {
    expect(book(10, 2)).toBe(8);
  });

  // Good: the unhappy paths and the edges too
  it("refuses to book no seats", () => {
    expect(() => book(10, 0)).toThrowError("Book at least 1 seat");
  });

  it("refuses to book a negative number", () => {
    expect(() => book(10, -1)).toThrowError("Book at least 1 seat");
  });

  it("refuses to book more than are left", () => {
    expect(() => book(10, 11)).toThrowError("Not enough seats");
  });

  it("leaves none when the last seats are booked", () => {
    const left = book(10, 10);
    expect(left).toBe(0);
  });

  it("takes no booking for a full show", () => {
    expect(() => book(0, 1)).toThrowError("Not enough seats");
  });
});
