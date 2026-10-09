const { Doorbell } = require("./doorbell");

describe("Doorbell", () => {
  let phone;
  let doorbell;

  // Mock, from the framework: replaces the phone and checks its calls
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
