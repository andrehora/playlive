from converter import Converter


# Stub: returns a fixed rate
class StubRates:
    def __init__(self, eur):
        self.eur = eur

    def rate(self, currency):
        return self.eur


def test_converts_dollars_to_euros():
    converter = Converter(StubRates(0.5))
    assert converter.to_euros(10) == 5


def test_follows_the_rate():
    converter = Converter(StubRates(2))
    assert converter.to_euros(10) == 20
