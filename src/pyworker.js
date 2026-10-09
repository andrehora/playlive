/* ---------- Python mode's interpreter: Pyodide, unittest and pytest, off the page ----------

   A module worker: Pyodide's classic script no longer loads through
   importScripts, but its ES module imports from the CDN as any module does.
   Running here rather than on the page keeps the app responsive while the
   interpreter downloads, and makes Stop possible: a `while True` cannot be
   interrupted, but the worker running it can be thrown away.

   Messages in: { files, target, framework }: the files to write, the test file
   or one test's id ("test_x.py::Class::test_y") to run, and 'unittest' or
   'pytest' to run it with. Messages out: { type: 'status', text },
   { type: 'ready', versions: { python, pytest } }, { type: 'out', line }, { type: 'done', code }
   (0 passed, 1 failed, 5 no tests), { type: 'error', message }, and while the
   tests run: { type: 'collected', tests: [{ id, name, line }] },
   { type: 'start', id }, { type: 'result', id, outcome, ms, message, frames }
   and { type: 'collect-error', message, frames }. A frame is { file, line }
   in one of the files written, deepest last. Lines count from 0.

   With `cover` (the code under test's file name), the run also measures
   which of its lines ran, and ends with { type: 'coverage', file, lines, hit,
   branches }: the lines that hold code, those of them that ran, and for each
   line with branches [line, ways out, ways taken], all counted from 0.     
   With `list` and `src`, only the mutants that code would have, as below.
   With `smells` and `src` (a test file), { type: 'smells', report: { tests,
   items: [{ smell, what, detail, line }] }, example }, or report null when
   it does not parse; `example` is passed back as it was sent.
   With `mutate`, the same files are mutated instead (see mutate below):
   { type: 'mutants', mutants: [{ id, line, what, text, after }] } (after:
   the line with the change, when it fits on it), then
   { type: 'mutant', id, outcome, timeout } for each (caught, escaped, or
   unrun when no test runs its line), or { type: 'mutation-refused', reason }
   when the tests do not all pass first, and { type: 'mutation-done' }.     */
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

// Each run writes the files again and forgets the modules a previous run
// imported, or the tests would run against the code as it was. No bytecode is
// written, so an edit inside the same second cannot be served from a stale .pyc.
const RUNNER = `
import ast, contextlib, inspect, io, json, os, re, sys, time, traceback, types, unittest, pytest
sys.dont_write_bytecode = True
os.makedirs('/work', exist_ok=True)
os.chdir('/work')
if '/work' not in sys.path:
    sys.path.insert(0, '/work')
FILES = set()

def tell(kind, **data):
    emit(json.dumps({'type': kind, **data}))

# The files of a job, written where the runners import them from; the names of
# their modules, which each run forgets so it imports them afresh
def write_files(files):
    FILES.clear()
    for name, src in files.items():
        with open(name, 'w') as f:
            f.write(src)
        FILES.add(name)
    return [n.removesuffix('.py') for n in files]

def frames(pairs):
    out = []
    for path, lineno in pairs:
        name = os.path.basename(str(path))
        if name in FILES and lineno:
            out.append({'file': name, 'line': lineno - 1})
    return out

# ---------- pytest: a plugin reports each test ----------
def crash(report):
    lr = report.longrepr
    if isinstance(lr, tuple):                       # a skip: (path, lineno, reason)
        return {'message': lr[2].removeprefix('Skipped: '), 'frames': []}
    rc = getattr(lr, 'reprcrash', None)
    entries = getattr(getattr(lr, 'reprtraceback', None), 'reprentries', None) or []
    pairs = [(e.reprfileloc.path, e.reprfileloc.lineno) for e in entries if getattr(e, 'reprfileloc', None)]
    if rc:
        return {'message': rc.message, 'frames': frames(pairs or [(rc.path, rc.lineno)])}
    text = str(lr or '').strip()
    return {'message': text.splitlines()[-1] if text else '',
            'frames': frames((p, int(n)) for p, n in re.findall(r'^(\\S+\\.py):(\\d+)', text, re.M))}

class Reporter:
    def pytest_collection_finish(self, session):
        tell('collected', tests=[{'id': i.nodeid, 'name': i.name, 'line': i.location[1] or 0} for i in session.items])

    def pytest_collectreport(self, report):
        if report.failed:
            tell('collect-error', **crash(report))

    def pytest_runtest_logstart(self, nodeid, location):
        tell('start', id=nodeid)

    # The call decides a test, unless its setup failed or skipped it, or its
    # teardown failed after it passed
    def pytest_runtest_logreport(self, report):
        if report.when == 'call' or report.outcome != 'passed':
            outcome = 'error' if report.failed and report.when != 'call' else report.outcome
            info = crash(report) if outcome != 'passed' else {}
            tell('result', id=report.nodeid, outcome=outcome, ms=round(report.duration * 1000), **info)

def run_pytest(target):
    args = [target, '-v', '--color=no', '--capture=sys', '-p', 'no:cacheprovider']
    return int(pytest.main(args, plugins=[Reporter()]))

# ---------- unittest: a result class reports each test ----------
def uid(test):
    module, cls, method = test.id().rsplit('.', 2)
    return f'{module}.py::{cls}::{method}'

def real(test):
    return isinstance(test, unittest.TestCase) and type(test).__name__ != '_FailedTest'

def tests_in(suite):
    for t in suite:
        if isinstance(t, unittest.TestSuite):
            yield from tests_in(t)
        else:
            yield t

def line_of(test):
    try:
        return inspect.getsourcelines(getattr(test, test._testMethodName))[1] - 1
    except Exception:
        return 0

def failure(err):
    return {'message': traceback.format_exception_only(err[0], err[1])[-1].strip(),
            'frames': frames((f.filename, f.lineno) for f in traceback.extract_tb(err[2]))}

class Result(unittest.TextTestResult):
    def startTest(self, test):
        super().startTest(test)
        self.t0 = time.perf_counter()
        if real(test):
            tell('start', id=uid(test))

    def end(self, test, outcome, info=None):
        if not real(test):                          # the file did not import
            tell('collect-error', **(info or {}))
            return
        ms = round((time.perf_counter() - self.t0) * 1000)
        tell('result', id=uid(test), outcome=outcome, ms=ms, **(info or {}))

    def addSuccess(self, test):
        super().addSuccess(test)
        self.end(test, 'passed')

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.end(test, 'failed', failure(err))

    def addError(self, test, err):
        super().addError(test, err)
        self.end(test, 'error', failure(err))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.end(test, 'skipped', {'message': reason, 'frames': []})

    # A failing subTest fails its test, which then reports once, as failed
    def addSubTest(self, test, subtest, err):
        super().addSubTest(test, subtest, err)
        if err is not None:
            self.sub_failed = failure(err)

    def stopTest(self, test):
        sub = getattr(self, 'sub_failed', None)
        if sub and real(test):
            self.end(test, 'failed', sub)
        self.sub_failed = None
        super().stopTest(test)

def run_unittest(target):
    file, *rest = target.split('::')
    name = '.'.join([file.removesuffix('.py'), *rest])
    suite = unittest.TestLoader().loadTestsFromName(name)
    tell('collected', tests=[{'id': uid(t), 'name': t._testMethodName, 'line': line_of(t)}
                             for t in tests_in(suite) if real(t)])
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2, resultclass=Result).run(suite)
    if not result.testsRun:
        return 5
    return 0 if result.wasSuccessful() else 1

# ---------- Coverage: which lines of the code under test ran ----------
# Not coverage.py, only its idea. sys.monitoring reports a line the first time
# it runs and the callback then switches that line off, so a loop costs
# nothing after its first pass. The lines that could run are those the
# compiled module and every function in it have instructions on.
#
# Branches the same way (Python 3.14): each branch point of a code object
# (co_branches) has two ways out, and BRANCH_LEFT/RIGHT report the one taken.
# They are counted per statement (statement_branches): an if, an elif, a for
# or a while loop, two ways each; a ternary or an "and" outside one does not.
MON = getattr(sys, 'monitoring', None)
HIT, TAKEN, WATCH = set(), set(), ['']
BRANCHING = bool(MON) and hasattr(MON.events, 'BRANCH_LEFT') and hasattr(types.CodeType, 'co_branches')
if MON:
    MON.use_tool_id(MON.COVERAGE_ID, 'playlive')
    def on_line(code, line):
        if code.co_filename == WATCH[0]:
            HIT.add(line)
        return MON.DISABLE
    MON.register_callback(MON.COVERAGE_ID, MON.events.LINE, on_line)
    if BRANCHING:
        def on_branch(code, src, dest):
            if code.co_filename == WATCH[0]:
                TAKEN.add((code.co_qualname, code.co_firstlineno, src, dest))
            return MON.DISABLE
        MON.register_callback(MON.COVERAGE_ID, MON.events.BRANCH_LEFT, on_branch)
        MON.register_callback(MON.COVERAGE_ID, MON.events.BRANCH_RIGHT, on_branch)

# The lines holding code, and each branch as (line, way out, way out): a way
# out is named the way on_branch names a branch taken, so the two compare
def code_map(src, name):
    try:
        todo = [compile(src, name, 'exec')]
    except SyntaxError:
        return set(), []
    lines, branches = set(), []
    while todo:
        c = todo.pop()
        at = {}
        for start, end, line in c.co_lines():
            if line:
                lines.add(line)
                for off in range(start, end, 2):
                    at[off] = line
        if BRANCHING:
            for src_off, left, right in c.co_branches():
                if src_off in at:
                    key = (c.co_qualname, c.co_firstlineno, src_off)
                    branches.append((at[src_off], [(key + (left,), at.get(left)), (key + (right,), at.get(right))]))
        todo.extend(k for k in c.co_consts if isinstance(k, types.CodeType))
    return lines, branches

# A branch is a statement's, as in JS/TS: each if, elif, while and for has two
# ways, into its body or not, however many jumps its condition makes. Where a
# jump lands does not say which way it is (a for's next item lands on the for
# line, to set its name; "if not a <= b <= c" lands on its own line before the
# body), so the true way is the body's first line having run (hit), and the
# false way a jump taken out of the condition's lines to anywhere but the
# body. A body on the condition's own line cannot be told by its line, so
# there a jump within the line stands for it. Branches of no such statement
# (an "and" in a return, a comprehension's loop) do not count.
# Per statement: [line, 2, ways taken], lines from 0.
def statement_branches(src, points, hit):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return []
    out = []
    for n in ast.walk(tree):
        if isinstance(n, (ast.If, ast.While)):
            head = n.test
        elif isinstance(n, (ast.For, ast.AsyncFor)):
            head = n.iter
        else:
            continue
        test, into = set(range(n.lineno, head.end_lineno + 1)), n.body[0].lineno
        ways = [w for line, pair in points if line in test for w in pair]
        if not ways:
            continue
        taken = [dest for key, dest in ways if key in TAKEN]
        yes = into in hit if into not in test else any(d in test for d in taken)
        no = any(d is None or (d not in test and d != into) for d in taken)
        out.append([n.lineno - 1, 2, yes + no])
    return sorted(out)

# ---------- Flow: the control flow of each function with a branch ----------
# Read from the syntax tree, for the flow view. A function is a list of items:
# a block of plain statements (ending the flow when its last one returns,
# raises, breaks or continues), an if with its two arms, a loop with its body,
# a try with its handlers, or a match with its cases. Lines count from 0.
TRIES = (ast.Try,) + ((ast.TryStar,) if hasattr(ast, 'TryStar') else ())
BRANCHY = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Match) + TRIES
TERMINAL = (ast.Return, ast.Raise, ast.Break, ast.Continue)

def flows_of(src):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return []
    text = src.split(chr(10))
    first = lambda n: text[n.lineno - 1].strip()

    def seq(body):
        items = []
        def stmt(s):
            last = items[-1] if items else None
            if not (last and last['t'] == 'block' and not last['end']):
                last = {'t': 'block', 'lines': [], 'texts': [], 'end': False}
                items.append(last)
            last['lines'].append(s.lineno - 1)
            last['texts'].append(first(s))
            last['end'] = isinstance(s, TERMINAL)
        def add(stmts):
            for s in stmts:
                if isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant) and isinstance(s.value.value, str):
                    continue                                # a docstring
                if isinstance(s, ast.If):
                    word = 'elif' if first(s).startswith('elif') else 'if'
                    items.append({'t': 'if', 'line': s.lineno - 1, 'text': word + ' ' + ast.unparse(s.test),
                                  'then': seq(s.body), 'else': seq(s.orelse)})
                elif isinstance(s, (ast.For, ast.AsyncFor)):
                    items.append({'t': 'loop', 'line': s.lineno - 1, 'body': seq(s.body),
                                  'text': 'for ' + ast.unparse(s.target) + ' in ' + ast.unparse(s.iter)})
                    add(s.orelse)
                elif isinstance(s, ast.While):
                    items.append({'t': 'loop', 'line': s.lineno - 1, 'text': 'while ' + ast.unparse(s.test), 'body': seq(s.body)})
                    add(s.orelse)
                elif isinstance(s, TRIES):
                    items.append({'t': 'try', 'line': s.lineno - 1, 'text': 'try', 'body': seq(s.body + s.orelse),
                                  'handlers': [{'line': h.lineno - 1, 'body': seq(h.body),
                                                'text': 'except' + (' ' + ast.unparse(h.type) if h.type else '') + (' as ' + h.name if h.name else '')}
                                               for h in s.handlers]})
                    add(s.finalbody)
                elif isinstance(s, ast.Match):
                    items.append({'t': 'match', 'line': s.lineno - 1, 'text': 'match ' + ast.unparse(s.subject),
                                  'cases': [{'line': c.pattern.lineno - 1, 'body': seq(c.body),
                                             'text': 'case ' + ast.unparse(c.pattern) + (' if ' + ast.unparse(c.guard) if c.guard else '')}
                                            for c in s.cases]})
                elif isinstance(s, (ast.With, ast.AsyncWith)):
                    stmt(s)
                    add(s.body)
                else:
                    stmt(s)
        add(body)
        return items

    def branchy(fn):
        todo = list(fn.body)
        while todo:
            n = todo.pop()
            if isinstance(n, BRANCHY):
                return True
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
                todo.extend(ast.iter_child_nodes(n))
        return False

    out = []
    def visit(body, prefix):
        for n in body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if branchy(n):
                    out.append({'name': prefix + n.name, 'line': n.lineno - 1,
                                'text': first(n).removesuffix(':'), 'body': seq(n.body)})
                visit(n.body, prefix + n.name + '.')
            elif isinstance(n, ast.ClassDef):
                visit(n.body, prefix + n.name + '.')
    visit(tree.body, '')
    return out

# ---------- Mutation: change the code in small ways, and see if a test fails ----------
# Each mutant is the module with one change, made on its syntax tree: a
# comparison, an arithmetic or a boolean operator swapped, a number one more,
# True and False swapped, a not removed, a returned value replaced by None.
# A mutant on a line no test runs cannot be caught, so it is not run. One
# that loops forever is stopped once its loops have jumped back far more
# often than the real code's did.
SWAPS = {ast.Lt: ast.LtE, ast.LtE: ast.Lt, ast.Gt: ast.GtE, ast.GtE: ast.Gt, ast.Eq: ast.NotEq,
         ast.NotEq: ast.Eq, ast.In: ast.NotIn, ast.NotIn: ast.In, ast.Is: ast.IsNot, ast.IsNot: ast.Is,
         ast.Add: ast.Sub, ast.Sub: ast.Add, ast.Mult: ast.Div, ast.Div: ast.Mult, ast.FloorDiv: ast.Mult,
         ast.Mod: ast.FloorDiv, ast.Pow: ast.Mult, ast.And: ast.Or, ast.Or: ast.And}
SYMBOLS = {ast.Lt: '<', ast.LtE: '<=', ast.Gt: '>', ast.GtE: '>=', ast.Eq: '==', ast.NotEq: '!=',
           ast.In: 'in', ast.NotIn: 'not in', ast.Is: 'is', ast.IsNot: 'is not', ast.Add: '+',
           ast.Sub: '-', ast.Mult: '*', ast.Div: '/', ast.FloorDiv: '//', ast.Mod: '%', ast.Pow: '**',
           ast.And: 'and', ast.Or: 'or'}
MAX_MUTANTS = 60

def mutants_of(src):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return []
    text = src.split(chr(10))
    # Not mutated: docstrings, f-strings, and what runs only as a script
    skip = set()
    for n in ast.walk(tree):
        body = getattr(n, 'body', None)
        if isinstance(body, list) and body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
            skip.update(id(k) for k in ast.walk(body[0]))
        if isinstance(n, ast.JoinedStr):
            skip.update(id(k) for k in ast.walk(n))
        if isinstance(n, ast.If) and '__main__' in ast.unparse(n.test):
            skip.update(id(k) for k in ast.walk(n))
    parents = {}
    for n in ast.walk(tree):
        for c in ast.iter_child_nodes(n):
            parents[id(c)] = n
    def replace(node, new):
        parent = parents[id(node)]
        for field, value in ast.iter_fields(parent):
            if value is node:
                setattr(parent, field, new)
                return lambda: setattr(parent, field, node)
            if isinstance(value, list) and any(v is node for v in value):
                i = next(i for i, v in enumerate(value) if v is node)
                value[i] = new
                return lambda: value.__setitem__(i, node)
    def swap(obj, field, new):
        old = getattr(obj, field)
        setattr(obj, field, new)
        return lambda: setattr(obj, field, old)
    # Each change: where, what it does, and how to make it (which returns how to undo it)
    changes = []
    for n in ast.walk(tree):
        if id(n) in skip:
            continue
        if isinstance(n, ast.Compare):
            for i, op in enumerate(n.ops):
                if type(op) in SWAPS:
                    new = SWAPS[type(op)]
                    def make(n=n, i=i, new=new):
                        old = n.ops[i]
                        n.ops[i] = new()
                        return lambda: n.ops.__setitem__(i, old)
                    changes.append((n, SYMBOLS[type(op)] + ' → ' + SYMBOLS[new], make))
        elif isinstance(n, (ast.BinOp, ast.AugAssign, ast.BoolOp)) and type(n.op) in SWAPS:
            new = SWAPS[type(n.op)]
            eq = '=' if isinstance(n, ast.AugAssign) else ''
            changes.append((n, SYMBOLS[type(n.op)] + eq + ' → ' + SYMBOLS[new] + eq, lambda n=n, new=new: swap(n, 'op', new())))
        elif isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.Not) and id(n) in parents:
            changes.append((n, 'not removed', lambda n=n: replace(n, n.operand)))
        elif isinstance(n, ast.Constant) and id(n) in parents:
            if isinstance(n.value, bool):
                changes.append((n, str(n.value) + ' → ' + str(not n.value), lambda n=n: swap(n, 'value', not n.value)))
            elif isinstance(n.value, int):
                changes.append((n, str(n.value) + ' → ' + str(n.value + 1), lambda n=n: swap(n, 'value', n.value + 1)))
        elif isinstance(n, ast.Return) and n.value is not None and not (isinstance(n.value, ast.Constant) and n.value.value is None):
            changes.append((n, 'returns None', lambda n=n: swap(n, 'value', ast.Constant(None))))
    # The change written into its own line, the rest of the file as it is, so
    # the code can show it (and a traceback names the lines as written): kept
    # only when it reads back as the very same mutant
    def chars(line, col):
        return len(line.encode()[:col].decode(errors='ignore'))
    def patched(node, piece, want):
        if node.lineno != node.end_lineno:
            return None
        line = text[node.lineno - 1]
        a, b = chars(line, node.col_offset), chars(line, node.end_col_offset)
        new = line[:a] + piece + line[b:]
        src2 = chr(10).join(text[:node.lineno - 1] + [new] + text[node.lineno:])
        try:
            same = ast.dump(ast.parse(src2)) == want
        except SyntaxError:
            same = False
        return (new, src2) if same else None
    original, seen, out = ast.unparse(tree), set(), []
    for node, what, make in sorted(changes, key=lambda c: (c[0].lineno, c[0].col_offset)):
        undo = make()
        try:
            ast.fix_missing_locations(tree)
            mutated, want = ast.unparse(tree), ast.dump(tree)
            patch = patched(node, ast.unparse(node.operand if what == 'not removed' else node), want)
        finally:
            undo()
        if mutated == original or mutated in seen:
            continue
        seen.add(mutated)
        meta = {'id': len(out), 'line': node.lineno - 1, 'what': what, 'text': text[node.lineno - 1].strip()}
        if patch:
            meta['after'] = patch[0]
            mutated = patch[1]
        out.append((meta, mutated))
        if len(out) >= MAX_MUTANTS:
            break
    return out

# Counting the jumps back of the module's loops, to stop a mutant that never ends
JUMPS, LIMIT, STOPPED = [0], [0], [False]
if MON:
    MON.use_tool_id(MON.PROFILER_ID, 'playlive-loops')
    def on_jump(code, src, dest):
        if code.co_filename != WATCH[0]:
            return MON.DISABLE
        JUMPS[0] += 1
        if LIMIT[0] and JUMPS[0] > LIMIT[0]:
            # counted again from nothing, so the tests after this one run as usual
            JUMPS[0], STOPPED[0] = 0, True
            raise TimeoutError('The code ran on and on, so it was stopped')
    MON.register_callback(MON.PROFILER_ID, MON.events.JUMP, on_jump)

# ---------- Test smells: what is wrong with the tests themselves ----------
# The four the site modes look for, read from the test file's syntax tree, and
# as quiet when unsure: a test with no check of its own (Unknown Test), one
# with more than ROULETTE (Assertion Roulette), tests that all open with the
# same lines (Duplication of Setup), and setup some test does without
# (General Fixture). Each finding is { smell, what, detail, line }, from 0.
ROULETTE = 5
NESTED = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)

def smells_of(src):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return None
    text = src.split(chr(10))
    first = lambda n: text[n.lineno - 1].strip()
    same = lambda a, b: ast.dump(a) == ast.dump(b)
    def body_of(fn):
        b = fn.body
        if b and isinstance(b[0], ast.Expr) and isinstance(b[0].value, ast.Constant) and isinstance(b[0].value.value, str):
            b = b[1:]
        return b
    def walk(nodes):
        todo = list(nodes)
        while todo:
            n = todo.pop()
            yield n
            if not isinstance(n, NESTED):
                todo.extend(ast.iter_child_nodes(n))
    def callee(call):
        f = call.func
        return f.attr if isinstance(f, ast.Attribute) else f.id if isinstance(f, ast.Name) else ''
    def is_check(n, helpers):
        if isinstance(n, ast.Assert):
            return True
        if not isinstance(n, ast.Call):
            return False
        name = callee(n)
        if name.startswith('assert') or name == 'fail' or name in helpers:
            return True
        f = n.func
        return isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == 'pytest' and f.attr in ('raises', 'fail', 'warns')
    def uses(node, name):
        for n in ast.walk(node):
            if isinstance(n, ast.Name) and n.id == name:
                return True
            if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == 'self' and n.attr == name:
                return True
        return False
    # self.name = value, with what it sets, or None
    def sets_self(stmt):
        if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
            t = stmt.targets[0]
            if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == 'self':
                return t.attr
        return None

    # The tests, in groups that share their setup: each test class, and the
    # functions at the top level
    groups, helpers_fns, fixtures = [], [], {}
    top = []
    for n in tree.body:
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if n.name.startswith('test'):
                top.append(n)
            else:
                helpers_fns.append(n)
                for d in n.decorator_list:
                    d = d.func if isinstance(d, ast.Call) else d
                    if (isinstance(d, ast.Attribute) and d.attr == 'fixture') or (isinstance(d, ast.Name) and d.id == 'fixture'):
                        fixtures[n.name] = n
        elif isinstance(n, ast.ClassDef):
            based = any('TestCase' in ast.unparse(b) for b in n.bases)
            if not (n.name.startswith('Test') or based):
                continue
            methods = [m for m in n.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
            helpers_fns += [m for m in methods if not m.name.startswith('test')]
            groups.append((n, [m for m in methods if m.name.startswith('test')], next((m for m in methods if m.name == 'setUp'), None)))
    if top:
        groups.append((None, top, None))
    # A helper of the file's that checks counts as a check where it is called
    helpers = set()
    for _ in range(3):
        for h in helpers_fns:
            if h.name not in helpers and any(is_check(x, helpers) for x in walk(h.body)):
                helpers.add(h.name)
    tests = [t for _, ts, _ in groups for t in ts]
    items = []

    for t in tests:
        checks = sum(1 for x in walk(body_of(t)) if is_check(x, helpers))
        if not checks:
            items.append({'smell': 'unknown-test', 'what': t.name, 'detail': 'runs its code and checks nothing', 'line': t.lineno - 1})
        if checks > ROULETTE:
            items.append({'smell': 'assertion-roulette', 'what': t.name, 'detail': str(checks) + ' checks in one test', 'line': t.lineno - 1})

    for cls, ts, setup in groups:
        bodies = [body_of(t) for t in ts]
        if len(ts) >= 2:
            n = 0
            while all(n < len(b) for b in bodies) and all(same(b[n], bodies[0][n]) for b in bodies):
                n += 1
            # A check is the test, not its setup
            for stmt in bodies[0][:n]:
                if any(is_check(x, helpers) for x in ast.walk(stmt)):
                    break
                items.append({'smell': 'duplication-of-setup', 'what': first(stmt),
                              'detail': 'at the start of all ' + str(len(ts)) + ' tests' + (' in ' + cls.name if cls else ''),
                              'line': stmt.lineno - 1})
        # General Fixture: setUp sets self.x and a test does without it, by
        # setting it again before anything could use it, or by never using it
        # (nor anything setUp built from it). A test that calls another method
        # of its own, or hands self on, might use anything: it is not counted.
        # Nor is an attribute tearDown or the rest of setUp does more with.
        if setup:
            steps = body_of(setup)
            ends = [m for m in cls.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)) and m.name == 'tearDown']
            sets = {sets_self(a): a for a in steps if sets_self(a)}
            built = {k: {o for o in sets if o != k and uses(v.value, o)} for k, v in sets.items()}
            def needs(names):
                out, todo = set(), list(names)
                while todo:
                    n = todo.pop()
                    if n not in out:
                        out.add(n)
                        todo.extend(built.get(n, ()))
                return out
            def reads(body):
                attrs, bare = set(), 0
                for node in (x for stmt in body for x in ast.walk(stmt)):
                    if isinstance(node, ast.Name) and node.id == 'self':
                        bare += 1
                    elif isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id == 'self':
                        attrs.add(node.attr)
                        bare -= 1
                    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name)
                            and node.func.value.id == 'self' and not node.func.attr.startswith('assert')
                            and node.func.attr not in ('fail', 'subTest', 'skipTest')):
                        return None
                return attrs if bare == 0 else None
            for name, stmt in sets.items():
                others = [a for a in steps if not sets_self(a)] + ends
                if any(uses(o, name) for o in others):
                    continue
                k = 0
                for b in bodies:
                    r = reads(b)
                    if r is None:
                        continue
                    if b and sets_self(b[0]) == name and not uses(b[0].value, name) and not same(b[0].value, stmt.value):
                        r = r - {name}
                    if name not in needs(r):
                        k += 1
                if k:
                    items.append({'smell': 'general-fixture', 'what': first(stmt), 'line': stmt.lineno - 1,
                                  'detail': 'used by no test' if k == len(ts) else 'not used by ' + str(k) + ' of ' + str(len(ts)) + ' tests'})
    # pytest: a fixture that makes a value, given to a test that replaces it in
    # its first line or never uses it (one asked for its side effect is fine)
    for name, fx in fixtures.items():
        if not any(isinstance(x, (ast.Return, ast.Yield)) and x.value is not None for x in ast.walk(fx)):
            continue
        given = [t for t in tests if any(a.arg == name for a in t.args.args)]
        k = 0
        for t in given:
            b = body_of(t)
            replaced = (b and isinstance(b[0], ast.Assign) and len(b[0].targets) == 1 and isinstance(b[0].targets[0], ast.Name)
                        and b[0].targets[0].id == name and not uses(b[0].value, name))
            mentioned = any(isinstance(x, ast.Name) and x.id == name for stmt in b for x in ast.walk(stmt))
            if replaced or not mentioned:
                k += 1
        if k:
            items.append({'smell': 'general-fixture', 'what': first(fx), 'line': fx.lineno - 1,
                          'detail': 'used by no test given it' if k == len(given) else 'not used by ' + str(k) + ' of ' + str(len(given)) + ' tests given it'})
    return {'tests': len(tests), 'items': items}

# example, when given, says which file it was: the All smells list reads them all
def list_smells(src, example=None):
    tell('smells', report=smells_of(src), example=example)

# What mutate would try, without running anything: for the tab, before a run
def list_mutants(src):
    tell('mutants', mutants=[m for m, _ in mutants_of(src)])

# only, a mutant's id, runs that one alone
def mutate(files, target, framework, cover, only=None):
    files = json.loads(files)
    modules = write_files(files)
    mutants = mutants_of(files[cover])
    tell('mutants', mutants=[m for m, _ in mutants])
    if not MON:
        tell('mutation-refused', reason='unsupported')
        return
    # First the tests as they are: they must pass, and they say which lines run
    WATCH[0] = os.path.abspath(cover)
    HIT.clear()
    JUMPS[0], LIMIT[0] = 0, 0
    MON.restart_events()
    MON.set_events(MON.COVERAGE_ID, MON.events.LINE)
    MON.set_events(MON.PROFILER_ID, MON.events.JUMP)
    try:
        base = failing(target, framework, modules)
    finally:
        MON.set_events(MON.COVERAGE_ID, 0)
    ran = set(HIT)
    if not base or not all(base.values()):
        MON.set_events(MON.PROFILER_ID, 0)
        tell('mutation-refused', reason='none' if base == {} else 'failing')
        return
    LIMIT[0] = max(100 * JUMPS[0], 100000)
    try:
        for meta, src in mutants:
            if only is not None and meta['id'] != only:
                continue
            if meta['line'] + 1 not in ran:
                tell('mutant', id=meta['id'], outcome='unrun')
                continue
            with open(cover, 'w') as f:
                f.write(src)
            JUMPS[0], STOPPED[0] = 0, False
            MON.restart_events()
            r = failing(target, framework, modules)
            tell('mutant', id=meta['id'], outcome='escaped' if r and all(r.values()) else 'caught', timeout=STOPPED[0])
    finally:
        MON.set_events(MON.PROFILER_ID, 0)
        LIMIT[0] = 0
        with open(cover, 'w') as f:
            f.write(files[cover])
        for m in modules:
            sys.modules.pop(m, None)

# ---------- Create: does a test you wrote catch what the example's own catches? ----------
# Both files run on the code and then on each mutant, every test to the end, and
# what is kept is the names of the tests that failed: a test with that name in
# yours has to fail on every mutant the example's own fails on. Names, not
# ids, so the class you put a test in is yours to choose; a parametrized test
# fails when any of its cases does. None when the file did not load.
def failing(target, framework, modules):
    for m in modules:
        sys.modules.pop(m, None)
    sink, names, bad = io.StringIO(), set(), set()
    with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
        if framework == 'pytest':
            class Collect:
                def pytest_runtest_logreport(self, report):
                    name = report.nodeid.split('::')[-1].split('[')[0]
                    names.add(name)
                    if report.failed:
                        bad.add(name)
            code = int(pytest.main([target, '-q', '--color=no', '--capture=sys', '-p', 'no:cacheprovider'], plugins=[Collect()]))
            if code not in (0, 1, 5):
                return None
        else:
            try:
                suite = unittest.TestLoader().loadTestsFromName(target.removesuffix('.py'))
            except Exception:
                return None
            tests = [t for t in tests_in(suite)]
            if any(not real(t) for t in tests):
                return None
            names.update(t._testMethodName for t in tests)
            result = unittest.TestResult()
            suite.run(result)
            for t, _ in result.failures + result.errors:
                bad.add(getattr(t, 'test_case', t)._testMethodName)
    return {n: n not in bad for n in names}

# What the example's own tests catch, kept while the code and they stay the same
BRIEFS = {}

def brief(files, cover, mine, original, framework):
    files = json.loads(files)
    theirs = 'brief_' + mine
    files[theirs] = original
    modules = write_files(files)
    if not MON:
        tell('brief', refused='unsupported')
        return
    def measure(target):
        WATCH[0] = os.path.abspath(cover)
        HIT.clear()
        JUMPS[0] = 0
        MON.restart_events()
        MON.set_events(MON.COVERAGE_ID, MON.events.LINE)
        try:
            return failing(target, framework, modules), set(HIT), JUMPS[0]
        finally:
            MON.set_events(MON.COVERAGE_ID, 0)
    key = (files[cover], original, framework)
    LIMIT[0] = 0
    MON.set_events(MON.PROFILER_ID, MON.events.JUMP)
    try:
        want, ran_t, jumps_t = measure(theirs)
        got, ran_m, jumps_m = measure(mine)
        if not want or not all(want.values()):
            tell('brief', refused='original')
            return
        if got is None:
            tell('brief', refused='mine')
            return
        mutants = [(m, src) for m, src in mutants_of(files[cover]) if m['line'] + 1 in ran_t | ran_m]
        known = BRIEFS.setdefault(key, {})
        LIMIT[0] = max(100 * max(jumps_t, jumps_m), 100000)
        caught_t, caught_m = {}, {}
        for i, (meta, src) in enumerate(mutants):
            tell('brief-progress', done=i, of=len(mutants))
            with open(cover, 'w') as f:
                f.write(src)
            # A mutant the module cannot even be imported with fails every test
            if meta['id'] not in known:
                JUMPS[0] = 0
                MON.restart_events()
                r = failing(theirs, framework, modules)
                known[meta['id']] = {n for n, ok in r.items() if not ok} if r is not None else set(want)
            caught_t[meta['id']] = known[meta['id']]
            JUMPS[0] = 0
            MON.restart_events()
            r = failing(mine, framework, modules)
            caught_m[meta['id']] = {n for n, ok in r.items() if not ok} if r is not None else set(got)
        out = {}
        for name in want:
            need = [i for i, names in caught_t.items() if name in names]
            out[name] = {'written': name in got, 'passes': bool(got.get(name)),
                         'need': need, 'missed': [i for i in need if name not in caught_m[i]]}
        tell('brief', tests=out, mutants=[m for m, _ in mutants])
    finally:
        MON.set_events(MON.PROFILER_ID, 0)
        LIMIT[0] = 0
        with open(cover, 'w') as f:
            f.write(files[cover])
        for m in modules:
            sys.modules.pop(m, None)
        os.remove(theirs)

def run(files, target, framework, cover=None):
    files = json.loads(files)
    for m in write_files(files):
        sys.modules.pop(m, None)
    measure = bool(MON and cover in files)
    if measure:
        HIT.clear()
        TAKEN.clear()
        WATCH[0] = os.path.abspath(cover)
        MON.restart_events()
        events = MON.events.LINE
        if BRANCHING:
            events |= MON.events.BRANCH_LEFT | MON.events.BRANCH_RIGHT
        MON.set_events(MON.COVERAGE_ID, events)
    try:
        return run_pytest(target) if framework == 'pytest' else run_unittest(target)
    finally:
        if measure:
            MON.set_events(MON.COVERAGE_ID, 0)
            lines, points = code_map(files[cover], WATCH[0])
            tell('coverage', file=cover, lines=sorted(n - 1 for n in lines), hit=sorted(n - 1 for n in HIT & lines),
                 branches=statement_branches(files[cover], points, HIT) if BRANCHING else None, flows=flows_of(files[cover]))
`;

const say = line => postMessage({ type: 'out', line });
const ready = (async () => {
  postMessage({ type: 'status', text: 'Downloading Python…' });
  const py = await loadPyodide({ indexURL: PYODIDE, stdout: () => {}, stderr: () => {} });
  postMessage({ type: 'status', text: 'Loading pytest…' });
  await py.loadPackage('pytest', { messageCallback: () => {}, errorCallback: () => {} });
  py.setStdout({ batched: say });
  py.setStderr({ batched: say });
  py.globals.set('emit', text => postMessage(JSON.parse(text)));
  py.runPython(RUNNER);
  postMessage({ type: 'ready', versions: {
    python: py.runPython('import sys; sys.version.split()[0]'),
    pytest: py.runPython('import pytest; pytest.__version__')
  } });
  return { run: py.globals.get('run'), mutate: py.globals.get('mutate'), list: py.globals.get('list_mutants'), smells: py.globals.get('list_smells'), brief: py.globals.get('brief') };
})();
ready.catch(e => postMessage({ type: 'error', message: String(e?.message || e) }));

onmessage = async ({ data }) => {
  let py;
  try { py = await ready; } catch { return; }      // already reported
  try {
    if (data.list) py.list(data.src);
    else if (data.brief) py.brief(JSON.stringify(data.files), data.cover, data.target, data.original, data.framework);
    else if (data.smells) py.smells(data.src, data.example ?? undefined);
    else if (data.mutate){
      py.mutate(JSON.stringify(data.files), data.target, data.framework, data.cover, data.only ?? undefined);   // undefined is None; null is not
      postMessage({ type: 'mutation-done' });
    } else postMessage({ type: 'done', code: py.run(JSON.stringify(data.files), data.target, data.framework, data.cover) });
  } catch (e){ postMessage({ type: 'error', message: String(e?.message || e) }); }
};
