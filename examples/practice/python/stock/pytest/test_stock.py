from stock import StockService, stock_report


def test_always_returns_a_message():
    report = stock_report("Lamp", StockService())
    assert isinstance(report, str)


def test_shows_the_stock():
    report = stock_report("Lamp", StockService())
    assert report.startswith("Lamp: ")
    assert report.endswith(" left")
