import pytest
from product_editor import ProductEditor


@pytest.fixture
def editor():
    return ProductEditor()


def test_replaces_a_product(editor):
    product = editor.replace(1, "Blue mascara", 5)
    assert product["title"] == "Blue mascara"
    assert product["price"] == 5


def test_reprices_a_product_and_keeps_its_title(editor):
    product = editor.reprice(1, 5)
    assert product["price"] == 5
    assert product["title"] == "Essence Mascara Lash Princess"


def test_deletes_a_product(editor):
    assert editor.delete(1)


def test_cannot_delete_a_missing_product(editor):
    assert not editor.delete(9999)
