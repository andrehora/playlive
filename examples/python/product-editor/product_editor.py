import requests

# DummyJSON answers as if it changed the product, but keeps it as it was
BASE_URL = "https://dummyjson.com"


class ProductEditor:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url

    # PUT sends the new product
    def replace(self, product_id, title, price):
        product = {"title": title, "price": price}
        response = requests.put(f"{self.base_url}/products/{product_id}", json=product, timeout=10)
        response.raise_for_status()
        return response.json()

    # PATCH sends only what changes
    def reprice(self, product_id, price):
        response = requests.patch(f"{self.base_url}/products/{product_id}", json={"price": price}, timeout=10)
        response.raise_for_status()
        return response.json()

    def delete(self, product_id):
        response = requests.delete(f"{self.base_url}/products/{product_id}", timeout=10)
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return response.json()["isDeleted"]
