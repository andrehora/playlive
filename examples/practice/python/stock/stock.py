import random


class StockService:
    def stock(self, product):
        if random.random() < 0.3:
            raise TimeoutError("The stock service did not answer")
        return random.randint(0, 50)


def stock_report(product, service):
    try:
        return product + ": " + str(service.stock(product)) + " left"
    except TimeoutError:
        return "No stock count right now, try again later"
