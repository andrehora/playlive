import unittest
from language import settings, greet


class LanguageTest(unittest.TestCase):
    # Teardown: tearDown runs after every test, even one that fails, and puts
    # the setting back. Without it, the next test greets in Portuguese
    def tearDown(self):
        settings["language"] = "en"

    def test_can_greet_in_portuguese(self):
        settings["language"] = "pt"
        self.assertEqual(greet("Ana"), "Olá, Ana")

    def test_greets_in_english(self):
        self.assertEqual(greet("Ana"), "Hello, Ana")


if __name__ == "__main__":
    unittest.main()
