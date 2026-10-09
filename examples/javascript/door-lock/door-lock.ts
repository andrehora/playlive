export interface Log {
  write(line: string): void;
}

export class ConsoleLog implements Log {
  write(line: string): void {
    console.log(line);
  }
}

export class DoorLock {
  constructor(private code: string, private log: Log) {}

  unlock(code: string): void {
    if (code === this.code) {
      this.log.write("Unlocked");
    } else {
      this.log.write("Wrong code");
    }
  }
}
