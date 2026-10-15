import random


def pickup_minutes(distance_km):
    traffic = random.choice([0, 0, 0, 5])
    return distance_km * 2 + traffic
