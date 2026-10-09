import { Network, Sender, upload } from "./upload";

// Good: stand-ins for the network, one that works and one that is down
class WorkingNetwork implements Sender {
  send(): void {}
}

class DownNetwork implements Sender {
  send(file: string): void {
    throw new Error("The network dropped " + file);
  }
}

describe("Upload", () => {
  // Bad: the real network, so it fails 1 run in 5
  it("uploads a file", () => {
    expect(upload("photo.jpg", new Network())).toBe("Uploaded photo.jpg");
  });

  // Good: the stand-ins
  it("uploads a file when the network works", () => {
    const message = upload("photo.jpg", new WorkingNetwork());
    expect(message).toBe("Uploaded photo.jpg");
  });

  it("says try again later when the network is down", () => {
    const message = upload("photo.jpg", new DownNetwork());
    expect(message).toBe("Try again later");
  });
});
