from converter import Converter


# Stub, by hand: returns a fixed rate
class StubBankService:
    def rate(self, currency):
        return 0.5


def test_converts_dollars_to_euros():
    dollars = 10
    converter = Converter(StubBankService())

    euros = converter.to_euros(dollars)

    assert euros == 5


def test_converts_any_amount():
    dollars = 3
    converter = Converter(StubBankService())

    euros = converter.to_euros(dollars)

    assert euros == 1.5
