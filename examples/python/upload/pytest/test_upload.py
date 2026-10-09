from upload import Network, upload


# Bad: the real network, so it fails 1 run in 5
def test_uploads_a_file():
    assert upload("photo.jpg", Network()) == "Uploaded photo.jpg"


# Good: stand-ins for the network, one that works and one that is down
class WorkingNetwork:
    def send(self, file):
        pass


class DownNetwork:
    def send(self, file):
        raise ConnectionError("The network dropped " + file)


def test_a_file_is_uploaded_when_the_network_works():
    message = upload("photo.jpg", WorkingNetwork())
    assert message == "Uploaded photo.jpg"


def test_try_again_later_when_the_network_is_down():
    message = upload("photo.jpg", DownNetwork())
    assert message == "Try again later"
