export interface SkyReply {
  data: { current: { temp_c: number } };
}

// Theirs: a weather library you installed. Its API is not yours to change
export class SkyApi {
  fetch(path: string): SkyReply {
    throw new Error(`SkyApi is not reachable from tests (${path})`);
  }
}

// Ours: the one place that knows SkyApi's paths and replies. Tests mock this
export class Forecast {
  constructor(private api: SkyApi) {}

  // A change to try: SkyApi moves temp_c into reply.now. Only this method
  // and the bad test have to change
  temperature(city: string): number {
    const reply = this.api.fetch("/current?city=" + city);
    return reply.data.current.temp_c;
  }
}

export function whatToWear(city: string, forecast: Forecast): string {
  if (forecast.temperature(city) < 15) {
    return "Coat";
  }
  return "T-shirt";
}
