export interface Sender {
  send(file: string): void;
}

// A real network: it drops 1 send in 5, at random
export class Network implements Sender {
  send(file: string): void {
    if (Math.random() < 0.2) {
      throw new Error("The network dropped " + file);
    }
  }
}

export function upload(file: string, network: Sender): string {
  try {
    network.send(file);
  } catch {
    return "Try again later";
  }
  return "Uploaded " + file;
}
