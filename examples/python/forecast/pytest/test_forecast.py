from forecast import WeatherService, forecast


def test_always_returns_a_message():
    report = forecast("Paris", WeatherService())
    assert isinstance(report, str)


# Flaky test: look closely at what the test calls.
# Tip: create a WorkingService and a DownService.
def test_shows_the_temperature():
    report = forecast("Paris", WeatherService())
    assert report.startswith("Paris: ")
    assert report.endswith("C")
