const { expect } = require("chai");
const sinon = require("sinon");
const { ConsoleLog, DoorLock } = require("./door-lock");

describe("Door lock", () => {
  let log;
  let lock;

  // Spy: records each call to the real log, which still runs
  beforeEach(() => {
    log = new ConsoleLog();
    sinon.spy(log, "write");
    lock = new DoorLock("1234", log);
  });

  it("unlocks with the right code", () => {
    lock.unlock("1234");
    expect(log.write.calledOnceWith("Unlocked")).to.equal(true);
  });

  it("logs a wrong code", () => {
    lock.unlock("0000");
    expect(log.write.calledOnceWith("Wrong code")).to.equal(true);
  });
});
