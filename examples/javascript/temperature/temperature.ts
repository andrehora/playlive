export function toFahrenheit(celsius: number): number {
  return celsius * 9 / 5 + 32;
}

export function toCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5 / 9;
}
