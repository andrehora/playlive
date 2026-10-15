// Practice: lessons beside the code examples. Each one teaches the same idea as
// an example, on code of its own: the source is there, the tests are only
// started, and you write the rest. The answer opens once every goal is met.
//
// Python and pytest only, for now. A lesson ships in examples/practice/python/<id>/:
// the code in <module>.py (the id with "-" as "_"), the tests you start from in
// pytest/test_<module>.py, and the answer in pytest/answer.py.
//
// Each row is [id, the example it practises], and { goals, tools }.
//
// Goals are what the answer waits for, each named here and said in words that
// hold for any framework (src/code/practice.js checks them). Every lesson has
// "pass" and "lines"; a lesson adds what its example's idea asks for:
//   "pass"          every test passes
//   "lines"         every line of the code runs
//   "branches"      every way out of every branch is taken
//   "parametrized"  some test is parameterized, one test run once per case
//   "steady"        every test passes 10 runs in a row, for a lesson about flaky tests
//   "truefalse"     some test checks a result is true, and some that one is false
//   "raises"        some test checks the code raises an exception
//   "setup"         some test starts from shared setup, made once for every test
//
// Tools are what the panels show beyond the Lesson tab, Results, Output and
// line coverage, which every lesson has. A lesson shows only what its idea needs, so a tool is named
// where the lesson is about it:
//   "repeat"     Run tests' Repeat, for a lesson about flaky tests
//   "branches"   branch coverage beside line coverage, and the code's flow
// The picker shows a lesson under its example's group, with what that example teaches.
import { CODE_EXAMPLES } from "./code.js";

export const GOALS = ["pass", "lines", "branches", "parametrized", "steady", "truefalse", "raises", "setup"];
export const TOOLS = ["repeat", "branches"];
const ALWAYS = ["pass", "lines"];

const LESSONS = [
  ["username", "calculator"],
  ["pin-code", "password-check", { goals: ["truefalse"] }],
  ["anagram", "palindrome", { goals: ["parametrized"] }],
  ["elevator", "bank-account", { goals: ["raises"] }],
  ["password", "dice", { goals: ["steady"], tools: ["repeat"] }],
  ["museum", "water", { goals: ["branches"], tools: ["branches"] }],
  ["jukebox", "stack", { goals: ["setup"] }],
];

const nameOf = id => id[0].toUpperCase() + id.slice(1).replace(/-/g, " ");

// Every lesson by id: { name, teaches, group, from, goals, tools, frameworks },
// in the shape of the code examples, so the picker and the panels read them alike
export const PRACTICE = Object.fromEntries(LESSONS.map(([id, from, { goals = [], tools = [] } = {}]) => [id, {
  name: nameOf(id), teaches: CODE_EXAMPLES[from].teaches, group: CODE_EXAMPLES[from].group,
  from, goals: [...ALWAYS, ...goals], tools, flaky: false, frameworks: ["pytest"]
}]));

export const PRACTICE_IDS = Object.keys(PRACTICE);
