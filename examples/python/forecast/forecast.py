import random


# WeatherService simulates a real service that may fail
class WeatherService:
    def temperature(self, city):
        if random.random() < 0.3:
            raise TimeoutError("The weather service did not answer")
        return random.randint(10, 30)


def forecast(city, service):
    try:
        return city + ": " + str(service.temperature(city)) + "C"
    except TimeoutError:
        return "No forecast right now, try again later"
