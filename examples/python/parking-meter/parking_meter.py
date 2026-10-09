class ParkingMeter:
    def __init__(self, minutes=0):
        self.minutes = minutes

    # Each euro buys 30 minutes, up to 2 hours
    def pay(self, euros):
        if euros <= 0:
            raise ValueError("Pay at least 1 euro")
        # A bug to try: self.minutes = min(self.minutes + euros * 20, 120)
        self.minutes = min(self.minutes + euros * 30, 120)
