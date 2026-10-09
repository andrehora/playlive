const { Newsletter, Subscribers } = require("./newsletter");

describe("Newsletter", () => {
  // Bad: it checks that add was called, not that Ana is subscribed, so a new way
  // of storing her breaks it though nothing anyone sees has changed
  it("calls add when subscribing", () => {
    const store = jasmine.createSpyObj("store", ["add", "size"]);
    new Newsletter(store, jasmine.createSpyObj("mailer", ["send"])).subscribe("ana@example.test");
    expect(store.add).toHaveBeenCalledOnceWith("ana@example.test");
  });

  // Good: it checks the result, with a real store
  it("counts a subscriber", () => {
    const newsletter = new Newsletter(new Subscribers(), jasmine.createSpyObj("mailer", ["send"]));
    newsletter.subscribe("ana@example.test");
    expect(newsletter.count()).toBe(1);
  });

  // Good too: sending the welcome email is the behavior, so checking the call is right
  it("sends a subscriber a welcome", () => {
    const mailer = jasmine.createSpyObj("mailer", ["send"]);
    new Newsletter(new Subscribers(), mailer).subscribe("ana@example.test");
    expect(mailer.send).toHaveBeenCalledOnceWith("ana@example.test", "Welcome to the newsletter");
  });
});
