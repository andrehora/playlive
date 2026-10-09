class Doorbell:
    # In the app, phone sends a notification to the owner's phone
    def __init__(self, phone):
        self.phone = phone
        self.muted = False

    def mute(self):
        self.muted = True

    def ring(self, visitor):
        if not self.muted:
            self.phone.notify(visitor + " is at the door")
