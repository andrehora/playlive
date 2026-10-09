// Theirs: a weather library you installed. Its API is not yours to change
class SkyApi {
  fetch(path) {
    throw new Error(`SkyApi is not reachable from tests (${path})`);
  }
}

// Ours: the one place that knows SkyApi's paths and replies. Tests mock this
class Forecast {
  constructor(api) {
    this.api = api;
  }

  // A change to try: SkyApi moves temp_c into reply.now. Only this method
  // and the bad test have to change
  temperature(city) {
    const reply = this.api.fetch("/current?city=" + city);
    return reply.data.current.temp_c;
  }
}

function whatToWear(city, forecast) {
  if (forecast.temperature(city) < 15) {
    return "Coat";
  }
  return "T-shirt";
}

module.exports = { SkyApi, Forecast, whatToWear };
