const fs = require("fs");

function saveNotes(path, notes) {
  fs.writeFileSync(path, notes.join("\n"));
}

function loadNotes(path) {
  try {
    return fs.readFileSync(path, "utf8").split("\n").filter(line => line);
  } catch {
    return [];
  }
}

module.exports = { saveNotes, loadNotes };
