import requests

# Frankfurter: exchange rates published by the European Central Bank
BASE_URL = "https://api.frankfurter.dev/v1"


class Currency:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url

    # requests adds the params to the URL: /2024-01-02?from=EUR&to=USD&amount=1
    def convert(self, day, amount, source, target):
        params = {"from": source, "to": target, "amount": amount}
        response = requests.get(f"{self.base_url}/{day}", params=params, timeout=10)
        response.raise_for_status()
        return response.json()["rates"][target]

    def rate(self, day, source, target):
        return self.convert(day, 1, source, target)
