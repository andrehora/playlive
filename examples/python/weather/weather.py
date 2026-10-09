# Theirs: a weather library. Its API is not yours to change
class SkyApi:
    def fetch(self, path):
        raise ConnectionError("SkyApi is not reachable from tests")


# Ours: the only code that knows SkyApi. Tests mock this
class Forecast:
    def __init__(self, api):
        self.api = api

    # A change to try: SkyApi moves temp_c. Only this and the bad test change
    def temperature(self, city):
        reply = self.api.fetch("/current?city=" + city)
        return reply["data"]["current"]["temp_c"]


def what_to_wear(city, forecast):
    if forecast.temperature(city) < 15:
        return "Coat"
    return "T-shirt"
