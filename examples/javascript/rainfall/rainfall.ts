// Rainfall in millimetres, one reading a day
export function total(readings: number[]): number {
  let result = 0;
  for (const reading of readings) {
    result += reading;
  }
  return result;
}

export function average(readings: number[]): number {
  return total(readings) / readings.length;
}
