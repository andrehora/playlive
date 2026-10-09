import unittest
from unittest.mock import Mock
from newsletter import Newsletter, Subscribers


class NewsletterTest(unittest.TestCase):
    # Bad: it checks that add was called, not that Ana is subscribed, so a new way
    # of storing her breaks it though nothing anyone sees has changed
    def test_subscribing_calls_add(self):
        store = Mock()
        Newsletter(store, Mock()).subscribe("ana@example.test")
        store.add.assert_called_once_with("ana@example.test")

    # Good: it checks the result, with a real store
    def test_a_subscriber_is_counted(self):
        newsletter = Newsletter(Subscribers(), Mock())
        newsletter.subscribe("ana@example.test")
        self.assertEqual(newsletter.count(), 1)

    # Good too: sending the welcome email is the behavior, so checking the call is right
    def test_a_subscriber_is_sent_a_welcome(self):
        mailer = Mock()
        Newsletter(Subscribers(), mailer).subscribe("ana@example.test")
        mailer.send.assert_called_once_with("ana@example.test", "Welcome to the newsletter")


if __name__ == "__main__":
    unittest.main()
