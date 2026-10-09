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
  "user-profile": { name: "User profile", teaches: "Unchanging tests 1" },
  "receipt": { name: "Receipt", teaches: "Unchanging tests 2" },
  "gradebook": { name: "Gradebook", teaches: "Unchanging tests 3" },
  "coffee-card": { name: "Coffee card", teaches: "Behavior, not methods 1" },
  "parking-meter": { name: "Parking meter", teaches: "Behavior, not methods 2" },
  "bowling": { name: "Bowling", teaches: "Behavior, not methods 3" },
  "order": { name: "Order", teaches: "Testing via the public API 1" },
  "tip-jar": { name: "Tip jar", teaches: "Testing via the public API 2" },
  "password-policy": { name: "Password policy", teaches: "Testing via the public API 3" },
  "library": { name: "Library", teaches: "Readable over DRY 1" },
  "movie-ticket": { name: "Movie ticket", teaches: "Readable over DRY 2" },
  "concert": { name: "Concert", teaches: "Readable over DRY 3" },
  "leap-year": { name: "Leap year", teaches: "No logic in tests 1" },
  "discount": { name: "Discount", teaches: "No logic in tests 2" },
  "pagination": { name: "Pagination", teaches: "No logic in tests 3" },
  "guest-list": { name: "Guest list", teaches: "Independent tests 1" },
  "ticket-counter": { name: "Ticket counter", teaches: "Independent tests 2" },
  "session": { name: "Session", teaches: "Independent tests 3" },
  "raffle": { name: "Raffle", teaches: "Deterministic tests 1" },
  "voucher": { name: "Voucher", teaches: "Deterministic tests 2" },
  "rate-limiter": { name: "Rate limiter", teaches: "Deterministic tests 3" },
  "average": { name: "Average", teaches: "Testable code 1" },
  "thermostat": { name: "Thermostat", teaches: "Testable code 2" },
  "birthday": { name: "Birthday", teaches: "Testable code 3" },
  "shipping-fee": { name: "Shipping fee", teaches: "Coverage as a signal 1" },
  "password-rules": { name: "Password rules", teaches: "Coverage as a signal 2" },
  "loyalty-points": { name: "Loyalty points", teaches: "Coverage as a signal 3" },
  "age-input": { name: "Age input", teaches: "Happy and unhappy paths 1" },
  "seat-booking": { name: "Seat booking", teaches: "Happy and unhappy paths 2" },
  "time-input": { name: "Time input", teaches: "Happy and unhappy paths 3" },
  "tea-shop": { name: "Tea shop", teaches: "Not too many mocks 1" },
  "tax": { name: "Tax", teaches: "Not too many mocks 2" },
  "online-shop": { name: "Online shop", teaches: "Not too many mocks 3" },
  "sign-up": { name: "Sign-up", teaches: "Fakes over mocks 1" },
  "visit-counter": { name: "Visit counter", teaches: "Fakes over mocks 2" },
  "todo-service": { name: "To-do service", teaches: "Fakes over mocks 3" },
  "payment": { name: "Payment", teaches: "Mocking only what you own 1" },
  "weather": { name: "Weather", teaches: "Mocking only what you own 2" },
  "backup": { name: "Backup", teaches: "Mocking only what you own 3" },
  "reminders": { name: "Reminders", teaches: "Mocking at the boundary 1" },
  "shop-hours": { name: "Shop hours", teaches: "Mocking at the boundary 2" },
  "order-confirmation": { name: "Order confirmation", teaches: "Mocking at the boundary 3" },
  "newsletter": { name: "Newsletter", teaches: "State over interaction 1" },
  "transfer": { name: "Transfer", teaches: "State over interaction 2" },
  "saved-cart": { name: "Saved cart", teaches: "State over interaction 3" },
};

export const PY_IDS = Object.keys(PY_EXAMPLES);
export const PY_ACCENT = '#306998';      // the picker's group head and the app bar's icon
export const FRAMEWORKS = ['unittest', 'pytest'];
export const moduleOf = id => id.replace(/-/g, '_');
