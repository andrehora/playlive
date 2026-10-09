const { expect } = require("chai");
const sinon = require("sinon");
const { Doorbell } = require("./doorbell");

describe("Doorbell", () => {
  let phone;
  let doorbell;

  // Mock: replaces the phone and checks how it was called
  beforeEach(() => {
    phone = { notify: sinon.stub() };
    doorbell = new Doorbell(phone);
  });

  it("tells the phone who is there", () => {
    doorbell.ring("Ana");
    expect(phone.notify.calledOnceWith("Ana is at the door")).to.equal(true);
  });

  it("stays quiet when muted", () => {
    doorbell.mute();
    doorbell.ring("Ana");
    expect(phone.notify.called).to.equal(false);
  });
});
