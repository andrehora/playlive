import unittest
from user_profile import make_profile


class UserProfileTest(unittest.TestCase):
    # Bad: it compares the whole profile, so adding a field (as "avatar") breaks it
    def test_makes_the_whole_profile(self):
        self.assertEqual(make_profile("Ana", "ana@example.test"), {"name": "Ana", "email": "ana@example.test"})

    # Good: each test checks only what it is about, so new fields leave it alone
    def test_the_name_is_trimmed(self):
        name = make_profile("  Ana ", "ana@example.test")["name"]
        self.assertEqual(name, "Ana")

    def test_the_email_is_lowercased(self):
        email = make_profile("Ana", "Ana@Example.TEST")["email"]
        self.assertEqual(email, "ana@example.test")

    def test_a_blank_name_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Name is required"):
            make_profile("   ", "ana@example.test")


if __name__ == "__main__":
    unittest.main()
