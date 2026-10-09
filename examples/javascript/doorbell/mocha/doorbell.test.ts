import { expect } from "chai";
import * as sinon from "sinon";
import { Doorbell } from "./doorbell";

describe("Doorbell", () => {
  let phone: { notify: sinon.SinonStub };
  let doorbell: Doorbell;

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
