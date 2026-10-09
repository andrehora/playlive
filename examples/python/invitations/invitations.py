class Mailer:
    # In the app, it sends a real email
    def send(self, to, text):
        raise ConnectionError(f"No mail server in tests ({to}: {text})")


def invite(emails, mailer):
    for email in emails:
        if email != "":
            mailer.send(email, "You're invited!")
