from stock import stock_report


class WorkingService:
    def stock(self, product):
        return 12


class DownService:
    def stock(self, product):
        raise TimeoutError("The stock service did not answer")


def test_always_returns_a_message():
    assert isinstance(stock_report("Lamp", DownService()), str)


def test_shows_the_stock():
    assert stock_report("Lamp", WorkingService()) == "Lamp: 12 left"


def test_says_to_try_later_when_the_service_is_down():
    assert stock_report("Lamp", DownService()) == "No stock count right now, try again later"
