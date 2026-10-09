import unittest
from upload import Network, upload


# Good: stand-ins for the network, one that works and one that is down
class WorkingNetwork:
    def send(self, file):
        pass


class DownNetwork:
    def send(self, file):
        raise ConnectionError("The network dropped " + file)


class UploadTest(unittest.TestCase):
    # Bad: the real network, so it fails 1 run in 5
    def test_uploads_a_file(self):
        self.assertEqual(upload("photo.jpg", Network()), "Uploaded photo.jpg")

    # Good: the stand-ins
    def test_a_file_is_uploaded_when_the_network_works(self):
        message = upload("photo.jpg", WorkingNetwork())
        self.assertEqual(message, "Uploaded photo.jpg")

    def test_try_again_later_when_the_network_is_down(self):
        message = upload("photo.jpg", DownNetwork())
        self.assertEqual(message, "Try again later")


if __name__ == "__main__":
    unittest.main()
