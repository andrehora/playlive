class ConsoleLog {
  write(line) {
    console.log(line);
  }
}

class DoorLock {
  constructor(code, log) {
    this.code = code;
    this.log = log;
  }

  unlock(code) {
    if (code === this.code) {
      this.log.write("Unlocked");
    } else {
      this.log.write("Wrong code");
    }
  }
}

module.exports = { ConsoleLog, DoorLock };
