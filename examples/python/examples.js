// Python mode's examples. Each one has a folder, examples/python/<id>/, holding
// the code under test in <module>.py and the same tests written twice:
// unittest/test_<module>.py and pytest/test_<module>.py. The module is the id
// with "-" as "_". Order matters: the list reads from the simplest up, and the
// first is where the mode opens. Each example teaches one testing idea, named
// in `teaches`, and its tests ship passing.
export const PY_EXAMPLES = {
  "calculator": { name: "Calculator", teaches: "Checking a result" },
  "temperature": { name: "Temperature", teaches: "Comparing decimals" },
  "fizzbuzz": { name: "FizzBuzz", teaches: "One test, many cases" },
  "password-check": { name: "Password check", teaches: "True or false" },
  "word-count": { name: "Word count", teaches: "Comparing whole dicts" },
  "grades": { name: "Grades", teaches: "Testing the boundaries" },
  "cart": { name: "Cart", teaches: "Testing a class" },
  "bank-account": { name: "Bank account", teaches: "Expecting an exception" },
  "stack": { name: "Stack", teaches: "A fresh object for each test" },
  "notes-file": { name: "Notes file", teaches: "A temporary folder" },
  "greeting": { name: "Greeting", teaches: "Replacing the clock" },
};

export const PY_IDS = Object.keys(PY_EXAMPLES);
export const PY_ACCENT = '#306998';      // the picker's group head and the app bar's icon
export const FRAMEWORKS = ['unittest', 'pytest'];
export const moduleOf = id => id.replace(/-/g, '_');
