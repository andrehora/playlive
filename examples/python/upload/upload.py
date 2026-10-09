import random


# A real network: it drops 1 send in 5, at random
class Network:
    def send(self, file):
        if random.random() < 0.2:
            raise ConnectionError("The network dropped " + file)


def upload(file, network):
    try:
        network.send(file)
    except ConnectionError:
        return "Try again later"
    return "Uploaded " + file
