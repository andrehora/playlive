import pytest
from unittest.mock import Mock
from saved_cart import Cart, MemoryStore


# Bad: it checks how the cart talks to its store, not what the cart holds, so
# keeping the items another way breaks it though the cart works the same
def test_adding_saves_the_items():
    store = Mock()
    store.load.return_value = {}
    Cart(store).add("tea", 2)
    store.save.assert_called_once_with({"tea": 2})


# Good: it checks the result, with a real store
def test_added_items_are_counted():
    cart = Cart(MemoryStore())
    cart.add("tea", 2)
    cart.add("cake", 1)
    assert cart.count() == 3


def test_the_cart_is_kept_for_the_next_visit():
    store = MemoryStore()
    Cart(store).add("tea", 2)
    next_visit = Cart(store)
    assert next_visit.count() == 2


def test_a_removed_item_is_gone():
    cart = Cart(MemoryStore())
    cart.add("tea", 2)
    cart.remove("tea")
    assert cart.count() == 0


def test_adding_nothing_is_refused():
    cart = Cart(MemoryStore())
    with pytest.raises(ValueError, match="Add at least 1"):
        cart.add("tea", 0)
