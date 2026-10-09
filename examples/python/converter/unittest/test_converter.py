import unittest
from converter import Converter


# Stub, by hand: returns a fixed rate
class StubBankService:
    def rate(self, currency):
        return 0.5


class ConverterTest(unittest.TestCase):
    def test_converts_dollars_to_euros(self):
        dollars = 10
        converter = Converter(StubBankService())

        euros = converter.to_euros(dollars)

        self.assertEqual(euros, 5)

    def test_converts_any_amount(self):
        dollars = 3
        converter = Converter(StubBankService())

        euros = converter.to_euros(dollars)

        self.assertEqual(euros, 1.5)


if __name__ == "__main__":
    unittest.main()
