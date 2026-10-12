import os


def photos_in(folder):
    photos = []
    for name in sorted(os.listdir(folder)):
        if name.endswith(".jpg"):
            photos.append(name)
    return photos
