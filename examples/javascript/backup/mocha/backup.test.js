const { expect } = require("chai");
const sinon = require("sinon");
const { FileStore, backup } = require("./backup");

describe("Backup", () => {
  // Bad: it mocks CloudSDK, which is not ours, so CloudSDK's changes break it
  it("puts each note in the cloud", () => {
    const sdk = { putObject: sinon.stub().returns({ ResponseMetadata: { HTTPStatusCode: 200 } }) };
    expect(backup([["a.txt", "hi"]], new FileStore(sdk, "my-bucket"))).to.equal(1);
    expect(sdk.putObject.calledOnceWith({ Bucket: "my-bucket", Key: "notes/a.txt", Body: "hi" })).to.equal(true);
  });

  // Good: it mocks FileStore, our own wrapper around CloudSDK
  it("saves each note", () => {
    const store = { save: sinon.stub().returns(true) };
    const saved = backup([["a.txt", "hi"], ["b.txt", "yo"]], store);
    expect(saved).to.equal(2);
  });

  it("skips empty notes", () => {
    const store = { save: sinon.stub() };
    const saved = backup([["a.txt", "  "]], store);
    expect(saved).to.equal(0);
    expect(store.save.called).to.equal(false);
  });

  it("stops when a save fails", () => {
    const store = { save: sinon.stub().returns(false) };
    expect(() => backup([["a.txt", "hi"]], store)).to.throw("Could not save a.txt");
  });
});
