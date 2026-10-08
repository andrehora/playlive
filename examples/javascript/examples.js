// JS/TS mode's examples: the same ones as Python mode's, ported. Each has a
// folder, examples/javascript/<id>/, holding the code under test in <id>.js
// and <id>.ts, and its tests once per framework and language:
// jasmine/<id>.spec.js|ts and mocha/<id>.test.js|ts. Order matters: the list
// reads from the simplest up, and the first is where the mode opens.
export const JS_EXAMPLES = {
  "calculator": { name: "Calculator", teaches: "Checking a result" },
  "temperature": { name: "Temperature", teaches: "Comparing decimals" },
  "fizzbuzz": { name: "FizzBuzz", teaches: "One test, many cases" },
  "password-check": { name: "Password check", teaches: "True or false" },
  "word-count": { name: "Word count", teaches: "Comparing whole objects" },
  "grades": { name: "Grades", teaches: "Testing the boundaries" },
  "cart": { name: "Cart", teaches: "Testing a class" },
  "bank-account": { name: "Bank account", teaches: "Expecting an exception" },
  "stack": { name: "Stack", teaches: "A fresh object for each test" },
  "notes-file": { name: "Notes file", teaches: "A temporary folder" },
  "greeting": { name: "Greeting", teaches: "Replacing the clock" },
};

export const JS_IDS = Object.keys(JS_EXAMPLES);
export const JS_ACCENT = '#a16207';      // the picker's group head and the app bar's icon
