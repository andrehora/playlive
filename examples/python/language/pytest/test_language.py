import pytest
from language import settings, greet


# Teardown: the code after yield puts the setting back after every test
@pytest.fixture(autouse=True)
def restore_language():
    yield
    settings["language"] = "en"


def test_can_greet_in_portuguese():
    settings["language"] = "pt"
    assert greet("Ana") == "Olá, Ana"


def test_greets_in_english():
    assert greet("Ana") == "Hello, Ana"
