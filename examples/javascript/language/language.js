// The app's settings, shared by every part of it
const settings = { language: "en" };

function greet(name) {
  if (settings.language === "pt") {
    return "Olá, " + name;
  }
  return "Hello, " + name;
}

module.exports = { settings, greet };
