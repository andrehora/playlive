# Theirs: a weather library you installed. Its API is not yours to change
class SkyApi:
    def fetch(self, path):
        raise ConnectionError("SkyApi is not reachable from tests")


# Ours: the one place that knows SkyApi's paths and replies. Tests mock this
class Forecast:
    def __init__(self, api):
        self.api = api

    # A change to try: SkyApi moves temp_c into reply["now"]. Only this method
    # and the bad test have to change
    def temperature(self, city):
        reply = self.api.fetch("/current?city=" + city)
        return reply["data"]["current"]["temp_c"]


def what_to_wear(city, forecast):
    if forecast.temperature(city) < 15:
        return "Coat"
    return "T-shirt"
