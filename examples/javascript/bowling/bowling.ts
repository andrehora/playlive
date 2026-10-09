// The score of a game of ten-pin bowling, from the pins each roll knocked down
export function score(rolls: number[]): number {
  let total = 0;
  let i = 0;
  let frame = 0;
  while (frame < 10) {
    if (rolls[i] === 10) {
      total += 10 + rolls[i + 1] + rolls[i + 2];
      i += 1;
    } else if (rolls[i] + rolls[i + 1] === 10) {
      // A bug to try: total += 10 + rolls[i + 1];
      total += 10 + rolls[i + 2];
      i += 2;
    } else {
      total += rolls[i] + rolls[i + 1];
      i += 2;
    }
    frame += 1;
  }
  return total;
}
