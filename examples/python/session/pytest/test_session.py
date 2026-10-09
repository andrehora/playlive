import pytest
from session import current_user, greeting, login, logout


# Bad: the second test needs the first one's login. Run it alone and it fails
def test_ana_can_log_in():
    login("ana", "secret1")
    assert current_user() == "ana"


def test_the_greeting_names_the_user():
    assert greeting() == "Hello, ana"


# Good: each test starts logged out
@pytest.fixture
def logged_out():
    logout()


def test_a_user_can_log_in(logged_out):
    login("ben", "secret2")
    user = current_user()
    assert user == "ben"


def test_the_greeting_names_whoever_logged_in(logged_out):
    login("ben", "secret2")
    message = greeting()
    assert message == "Hello, ben"


def test_no_one_is_logged_in_at_first(logged_out):
    with pytest.raises(ValueError, match="No one is logged in"):
        current_user()


def test_a_wrong_password_is_refused(logged_out):
    with pytest.raises(ValueError, match="Wrong name or password"):
        login("ben", "nope")
