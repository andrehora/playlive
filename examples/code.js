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
// examples in a group from the simplest up. Basics, Fixtures and Test doubles
// show one tool each; Best practices, last, shows each practice three times.
// The first example is where both modes open.
//
// Each row is [id, what it teaches], and { flaky: true } for a flaky one (the
// suites that need every example green leave it out). The id names the
// folders and the link; the app shows it as a name, "-" as spaces and the
// first letter capital ("saved-cart" is Saved cart).
const GROUPS = [
  {
    group: "Basics", examples: [
      ["calculator", "A first example"],
      ["password-check", "Checking true or false"],
      ["cart", "Testing a class"],
      ["grades", "Testing boundaries"],
      ["palindrome", "Parametrized tests"],
      ["bank-account", "Testing exceptions"],
      ["rainfall", "Compare approximately"],
      ["bus-fare", "Skipping a test"],
      ["water", "Code coverage"],
    ]
  },
  {
    group: "Fixtures", examples: [
      ["stack", "Setup 1"],
      ["notes-file", "Setup 2"],
      ["language", "Teardown"],
    ]
  },
  {
    group: "Test doubles", examples: [
      ["invoice", "Dummy"],
      ["converter", "Stub (manual)"],
      ["greeting", "Stub (framework)"],
      ["invitations", "Mock/spy (manual)"],
      ["doorbell", "Mock/spy (framework)"],
      ["bookmarks", "Fake"],
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

// Every example by id, with its group: { name, teaches, group, flaky }
export const CODE_EXAMPLES = Object.fromEntries(GROUPS.flatMap(({ group, examples }) =>
  examples.map(([id, teaches, { flaky = false } = {}]) => [id, { name: nameOf(id), teaches, group, flaky }])));

export const CODE_IDS = Object.keys(CODE_EXAMPLES);
