from menu import dishes, price_of


# Not every check is ==. pytest needs nothing special: in, is None and < are
# plain Python, and a failure still shows both sides
def test_has_soup():
    assert "soup" in dishes()


def test_has_no_price_for_a_dish_not_on_the_menu():
    assert price_of("pizza") is None


def test_keeps_the_soup_under_5():
    assert price_of("soup") < 5
