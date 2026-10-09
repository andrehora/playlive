import { ConsoleLog, DoorLock } from "./door-lock";

describe("Door lock", () => {
  let log: ConsoleLog;
  let lock: DoorLock;

  // Spy: records each call to the real log, which still runs
  beforeEach(() => {
    log = new ConsoleLog();
    spyOn(log, "write").and.callThrough();
    lock = new DoorLock("1234", log);
  });

  it("unlocks with the right code", () => {
    lock.unlock("1234");
    expect(log.write).toHaveBeenCalledOnceWith("Unlocked");
  });

  it("logs a wrong code", () => {
    lock.unlock("0000");
    expect(log.write).toHaveBeenCalledOnceWith("Wrong code");
  });
});
