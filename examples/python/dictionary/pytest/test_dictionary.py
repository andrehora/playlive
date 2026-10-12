import pytest
from dictionary import Dictionary


# Setup once: scope="module" builds one dictionary for every test. No test
# changes it, so sharing it is safe
@pytest.fixture(scope="module")
def dictionary():
    return Dictionary({"apple": "A round fruit", "bread": "A baked food"})


def test_defines_a_word(dictionary):
    assert dictionary.define("apple") == "A round fruit"


def test_ignores_capital_letters(dictionary):
    assert dictionary.define("Bread") == "A baked food"
