import unittest
from converter import Converter


# Stub: returns a fixed rate
class StubRates:
    def __init__(self, eur):
        self.eur = eur

    def rate(self, currency):
        return self.eur


class ConverterTest(unittest.TestCase):
    def test_converts_dollars_to_euros(self):
        converter = Converter(StubRates(0.5))
        self.assertEqual(converter.to_euros(10), 5)

    def test_follows_the_rate(self):
        converter = Converter(StubRates(2))
        self.assertEqual(converter.to_euros(10), 20)


if __name__ == "__main__":
    unittest.main()
