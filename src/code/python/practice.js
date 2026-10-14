import { PRACTICE as LESSONS, PRACTICE_IDS } from '../../../examples/practice.js';
import { PYTHON } from './python.js';

/* ---------- Practice's profile: Python's, with lessons for examples ----------
   Practice runs on the same Python and pytest as Python mode, with its own
   worker, so neither mode's runs wait for the other's. What differs is what it
   offers: the lessons (examples/practice.js), shipped from examples/practice/python/,
   pytest alone, and no grader but the Lesson tab (code/practice.js).        */
export const PRACTICE = {
  ...PYTHON,
  frameworks: PYTHON.frameworks.filter(f => f.id === 'pytest'),
  dir: 'practice/python',           // where its files ship, under examples/
  answer: 'answer.py',              // the lesson's tests, written, beside the ones you start from
  practice: true,
  mutation: false, smells: null, create: false,
  examples: LESSONS, ids: PRACTICE_IDS
};
