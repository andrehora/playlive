# Ours: the rule, which tests should run for real
def is_overdue(due_day, today):
    return today > due_day


# A system boundary: the real mailer sends email, so tests mock it
class Mailer:
    def send(self, to, text):
        raise ConnectionError("No mail server in tests")


def remind(email, due_day, today, mailer):
    # A bug to try: if is_overdue(today, due_day):
    if is_overdue(due_day, today):
        mailer.send(email, "Your invoice is overdue")
        return True
    return False
