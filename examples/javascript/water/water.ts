// What water is at a temperature in °C
export function state(celsius: number): string {
  if (celsius <= 0) {
    return "ice";
  }
  if (celsius >= 100) {
    return "steam";
  }
  return "water";
}
