import pytest
from invitations import invite


# Spy, by hand: counts the emails instead of sending them
class SpyMailer:
    def __init__(self):
        self.sent = 0

    def send(self, to, text):
        self.sent += 1


@pytest.fixture
def mailer():
    return SpyMailer()


def test_each_guest_gets_an_email(mailer):
    invite(["ana@example.test", "ben@example.test"], mailer)
    assert mailer.sent == 2


def test_a_blank_address_gets_no_email(mailer):
    invite(["ana@example.test", ""], mailer)
    assert mailer.sent == 1


def test_no_guests_get_no_email(mailer):
    invite([], mailer)
    assert mailer.sent == 0
