// A real network: it drops 1 send in 5, at random
class Network {
  send(file) {
    if (Math.random() < 0.2) {
      throw new Error("The network dropped " + file);
    }
  }
}

function upload(file, network) {
  try {
    network.send(file);
  } catch {
    return "Try again later";
  }
  return "Uploaded " + file;
}

module.exports = { Network, upload };
