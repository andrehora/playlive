class Jukebox:
    def __init__(self):
        self._songs = []

    def add(self, song):
        self._songs.append(song)

    def play_next(self):
        if not self._songs:
            raise IndexError("The jukebox is empty")
        return self._songs.pop(0)

    def up_next(self):
        return self._songs[0] if self._songs else None

    def __len__(self):
        return len(self._songs)
