const fs = require("fs");

function photosIn(folder) {
  const photos = [];
  for (const name of fs.readdirSync(folder).sort()) {
    if (name.endsWith(".jpg")) {
      photos.push(name);
    }
  }
  return photos;
}

module.exports = { photosIn };
