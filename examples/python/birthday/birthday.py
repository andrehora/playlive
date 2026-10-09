from datetime import datetime


# Easy to test: the day is handed in, as "YYYY-MM-DD"
def birthdays(employees, today):
    return [name for name, born in employees if born[5:] == today[5:]]


def birthday_messages(employees, today):
    messages = []
    for name in birthdays(employees, today):
        messages.append("Happy birthday, " + name + "!")
    return messages


# Hard to test: it reads the real date. Kept thin, so there is little to test
def send_greetings(employees, mailer):
    today = str(datetime.now())[0:10]
    messages = birthday_messages(employees, today)
    for message in messages:
        mailer.send(message)
    return len(messages)
