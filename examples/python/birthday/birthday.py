from datetime import datetime


# Easy to test: who has a birthday on a given day ("YYYY-MM-DD"), handed in
def birthdays(employees, today):
    return [name for name, born in employees if born[5:] == today[5:]]


def birthday_messages(employees, today):
    messages = []
    for name in birthdays(employees, today):
        messages.append("Happy birthday, " + name + "!")
    return messages


# Hard to test: it reads the real date itself, so a test has to fake the clock.
# It says how many it sent. Keeping it this thin leaves almost nothing in it to test
def send_greetings(employees, mailer):
    today = str(datetime.now())[0:10]
    messages = birthday_messages(employees, today)
    for message in messages:
        mailer.send(message)
    return len(messages)
