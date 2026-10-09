from unittest.mock import Mock
from newsletter import Newsletter, Subscribers


# Bad: it checks that add was called, not that Ana is subscribed
def test_subscribing_calls_add():
    store = Mock()
    Newsletter(store, Mock()).subscribe("ana@example.test")
    store.add.assert_called_once_with("ana@example.test")


# Good: it checks the result, with a real store
def test_a_subscriber_is_counted():
    newsletter = Newsletter(Subscribers(), Mock())
    newsletter.subscribe("ana@example.test")
    assert newsletter.count() == 1


# Good too: the email is the behavior, so checking the call is right
def test_a_subscriber_is_sent_a_welcome():
    mailer = Mock()
    Newsletter(Subscribers(), mailer).subscribe("ana@example.test")
    mailer.send.assert_called_once_with("ana@example.test", "Welcome to the newsletter")
