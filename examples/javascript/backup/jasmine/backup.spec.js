const { FileStore, backup } = require("./backup");

describe("Backup", () => {
  // Bad: it mocks CloudSDK, which is not ours, so CloudSDK's changes break it
  it("puts each note in the cloud", () => {
    const sdk = jasmine.createSpyObj("sdk", { putObject: { ResponseMetadata: { HTTPStatusCode: 200 } } });
    expect(backup([["a.txt", "hi"]], new FileStore(sdk, "my-bucket"))).toBe(1);
    expect(sdk.putObject).toHaveBeenCalledOnceWith({ Bucket: "my-bucket", Key: "notes/a.txt", Body: "hi" });
  });

  // Good: it mocks FileStore, our own wrapper around CloudSDK
  it("saves each note", () => {
    const store = jasmine.createSpyObj("store", { save: true });
    const saved = backup([["a.txt", "hi"], ["b.txt", "yo"]], store);
    expect(saved).toBe(2);
  });

  it("skips empty notes", () => {
    const store = jasmine.createSpyObj("store", ["save"]);
    const saved = backup([["a.txt", "  "]], store);
    expect(saved).toBe(0);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("stops when a save fails", () => {
    const store = jasmine.createSpyObj("store", { save: false });
    expect(() => backup([["a.txt", "hi"]], store)).toThrowError("Could not save a.txt");
  });
});
