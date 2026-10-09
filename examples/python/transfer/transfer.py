class Account:
    def __init__(self, balance):
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

    def transfer(self, to, amount):
        if amount > self.balance:
            raise ValueError("Not enough money")
        self.balance -= amount
        # A change to try: to.balance += amount, skipping deposit
        to.deposit(amount)
