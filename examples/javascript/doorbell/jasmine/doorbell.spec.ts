import { Doorbell, Phone } from "./doorbell";

describe("Doorbell", () => {
  let phone: jasmine.SpyObj<Phone>;
  let doorbell: Doorbell;

  // Mock: replaces the phone and checks how it was called
  beforeEach(() => {
    phone = jasmine.createSpyObj("phone", ["notify"]);
    doorbell = new Doorbell(phone);
  });

  it("tells the phone who is there", () => {
    doorbell.ring("Ana");
    expect(phone.notify).toHaveBeenCalledOnceWith("Ana is at the door");
  });

  it("stays quiet when muted", () => {
    doorbell.mute();
    doorbell.ring("Ana");
    expect(phone.notify).not.toHaveBeenCalled();
  });
});
