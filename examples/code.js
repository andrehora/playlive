// The code modes' examples, one list for Python and JS/TS: every example is
// written in both, in examples/python/<id>/ and examples/javascript/<id>/.
// Python's holds the code under test in <module>.py (the id with "-" as "_")
// and the same tests in unittest/test_<module>.py and pytest/test_<module>.py.
// JS/TS's holds <id>.js and <id>.ts, and the tests in jasmine/<id>.spec.js|ts
// and mocha/<id>.test.js|ts. Each example teaches one testing idea, and its
// tests ship passing, but for a flaky one, whose bad test fails now and then
// on purpose.
//
// The picker shows the groups in this order, each under its heading, and the
// examples in a group from the simplest up. Basics, Flaky tests, Fixtures and
// Test doubles show one tool each; Best practices, last, shows each practice three times.
// The first example is where both modes open.
//
// Each row is [id, what it teaches], and { flaky: true } for a flaky one (the
// suites that need every example green leave it out). An example written for
// some frameworks only names them, { frameworks: ['pytest'] }, and shows in
// the modes that have one of them; a framework without it is greyed out. The id names the
// folders and the link; the app shows it as a name, "-" as spaces and the
// first letter capital ("saved-cart" is Saved cart).
// The Integration examples, and a few others, are written for pytest alone
const PYTEST = { frameworks: ["pytest"] };
// and CPython's own tests (Real world) for unittest alone
const UNITTEST = { frameworks: ["unittest"] };
// A Real world example's code is one function of a package Pyodide installs,
// or of the standard library, "module:Class.function" (or a few of its
// functions and statements, comma separated, the main one first), and its tests are that
// package's own, in its framework: they import the package, so the code runs
// where the package has it. No Mutation or Create.
const installed = (what, fw = PYTEST) => ({ ...fw, installed: what });
const stdlib = what => installed(what, UNITTEST);

const GROUPS = [
  {
    group: "Basics", examples: [
      ["calculator", "A first example"],
      ["password-check", "Checking true or false"],
      ["cart", "Testing a class"],
      ["shopping-list", "Comparing objects"],
      ["grades", "Testing boundaries"],
      ["palindrome", "Parametrized tests"],
      ["bank-account", "Testing exceptions"],
      ["rainfall", "Compare approximately"],
      ["menu", "Other checks"],
      ["bus-fare", "Skipping a test"],
      ["water", "Code coverage"],
    ]
  },
  {
    group: "Flaky tests", examples: [
      ["dice", "Bug in test", { flaky: true }],
      ["password-generator", "Bug in code", { flaky: true, ...PYTEST }],
      ["bonus-points", "Too restrictive range", { flaky: true, ...PYTEST }],
      ["forecast", "External call", { flaky: true, ...PYTEST }],
    ]
  },
  {
    group: "Fixtures", examples: [
      ["stack", "Setup 1"],
      ["notes-file", "Setup 2"],
      ["language", "Teardown"],
      ["dictionary", "Setup once"],
      ["photos", "Teardown once"],
    ]
  },
  {
    group: "Test doubles", examples: [
      ["invoice", "Dummy"],
      ["converter", "Stub (manual)"],
      ["greeting", "Stub (framework)"],
      ["invitations", "Mock (manual)"],
      ["doorbell", "Mock (framework)"],
      ["bookmarks", "Fake"],
      ["cafe", "Choosing a double"],
    ]
  },
  {
    group: "Integration", examples: [
      ["checkout", "Multiple classes", PYTEST],
      ["notes-db", "Database", PYTEST],
      ["score-file", "File system", PYTEST],
      ["todo-api", "API 1", PYTEST],
      ["currency-api", "API 2", PYTEST],
      ["product-editor", "API 3", PYTEST],
    ]
  },
  {
    group: "Real world", examples: [
      ["calendar-monthrange", "Valid and invalid boundaries", stdlib("calendar:monthrange,_validate_month,weekday,isleap,mdays")],
      ["calendar-isleap", "Full coverage is not enough", stdlib("calendar:isleap")],
      ["attrs-to-bool", "Untested inputs", installed("attr.converters:to_bool")],
      ["rich-pick-bool", "One test, many asserts", installed("rich._pick:pick_bool")],
      ["rich-align", "The exact boundary", installed("rich.text:Text.align")],
      ["rich-truncate", "An untested option", installed("rich.text:Text.truncate")],
    ]
  },
  {
    group: "Best practices", examples: [
      ["user-profile", "Unchanging tests 1"],
      ["receipt", "Unchanging tests 2"],
      ["gradebook", "Unchanging tests 3"],
      ["coffee-card", "Behavior, not methods 1"],
      ["parking-meter", "Behavior, not methods 2"],
      ["bowling", "Behavior, not methods 3"],
      ["order", "Testing via the public API 1"],
      ["tip-jar", "Testing via the public API 2"],
      ["password-policy", "Testing via the public API 3"],
      ["library", "Readable over DRY 1"],
      ["movie-ticket", "Readable over DRY 2"],
      ["concert", "Readable over DRY 3"],
      ["leap-year", "No logic in tests 1"],
      ["discount", "No logic in tests 2"],
      ["pagination", "No logic in tests 3"],
      ["guest-list", "Independent tests 1"],
      ["ticket-counter", "Independent tests 2"],
      ["session", "Independent tests 3"],
      ["upload", "Make tests deterministic 1", { flaky: true }],
      ["happy-hour", "Make tests deterministic 2", { flaky: true }],
      ["delivery", "Make tests deterministic 3", { flaky: true }],
      ["average", "Testable code 1"],
      ["thermostat", "Testable code 2"],
      ["birthday", "Testable code 3"],
      ["shipping-fee", "Coverage as a signal 1"],
      ["password-rules", "Coverage as a signal 2"],
      ["loyalty-points", "Coverage as a signal 3"],
      ["age-input", "Happy and unhappy paths 1"],
      ["seat-booking", "Happy and unhappy paths 2"],
      ["time-input", "Happy and unhappy paths 3"],
      ["tea-shop", "Not too many mocks 1"],
      ["tax", "Not too many mocks 2"],
      ["online-shop", "Not too many mocks 3"],
      ["sign-up", "Fakes over mocks 1"],
      ["visit-counter", "Fakes over mocks 2"],
      ["todo-service", "Fakes over mocks 3"],
      ["payment", "Mocking only what you own 1"],
      ["weather", "Mocking only what you own 2"],
      ["backup", "Mocking only what you own 3"],
      ["reminders", "Mocking at the boundary 1"],
      ["shop-hours", "Mocking at the boundary 2"],
      ["order-confirmation", "Mocking at the boundary 3"],
      ["newsletter", "State over interaction 1"],
      ["transfer", "State over interaction 2"],
      ["saved-cart", "State over interaction 3"],
    ]
  },
];

const nameOf = id => id[0].toUpperCase() + id.slice(1).replace(/-/g, ' ');

// Every example by id, with its group: { name, teaches, group, flaky,
// frameworks, installed }, frameworks null when it is written for all of them
// and installed null but for a Real world example
export const CODE_EXAMPLES = Object.fromEntries(GROUPS.flatMap(({ group, examples }) =>
  examples.map(([id, teaches, { flaky = false, frameworks = null, installed = null } = {}]) => [id, { name: nameOf(id), teaches, group, flaky, frameworks, installed }])));

export const CODE_IDS = Object.keys(CODE_EXAMPLES);

// What a Real world example's code is called: the file it is in
// ("rich.text:Text.truncate" is "text.py")
export const installedName = installed => `${installed.split(':')[0].split('.').pop()}.py`;

// Whether example `id` is written for framework `fw`
export const hasFramework = (id, fw) => !CODE_EXAMPLES[id].frameworks || CODE_EXAMPLES[id].frameworks.includes(fw);

// The examples of a mode whose frameworks are `fws`: those written for one of them
export function examplesFor(fws) {
  const ids = CODE_IDS.filter(id => fws.some(fw => hasFramework(id, fw)));
  return { examples: Object.fromEntries(ids.map(id => [id, CODE_EXAMPLES[id]])), ids };
}
