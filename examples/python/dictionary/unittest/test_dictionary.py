import unittest
from dictionary import Dictionary


class DictionaryTest(unittest.TestCase):
    # Setup once: setUpClass builds one dictionary for every test. No test
    # changes it, so sharing it is safe
    @classmethod
    def setUpClass(cls):
        cls.dictionary = Dictionary({"apple": "A round fruit", "bread": "A baked food"})

    def test_defines_a_word(self):
        self.assertEqual(self.dictionary.define("apple"), "A round fruit")

    def test_ignores_capital_letters(self):
        self.assertEqual(self.dictionary.define("Bread"), "A baked food")


if __name__ == "__main__":
    unittest.main()
