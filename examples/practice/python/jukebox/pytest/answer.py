import pytest
from jukebox import Jukebox


# A fixture: every test that asks for "jukebox" gets a fresh one
@pytest.fixture
def jukebox():
    return Jukebox()


def test_songs_play_in_the_order_they_were_added(jukebox):
    jukebox.add("Intro")
    jukebox.add("Outro")
    assert jukebox.play_next() == "Intro"
    assert len(jukebox) == 1


def test_up_next_does_not_remove(jukebox):
    jukebox.add("Intro")
    assert jukebox.up_next() == "Intro"
    assert len(jukebox) == 1


def test_playing_an_empty_jukebox_is_refused(jukebox):
    with pytest.raises(IndexError):
        jukebox.play_next()
