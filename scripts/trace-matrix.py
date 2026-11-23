import re, sys, collections
docs = sys.argv[1]
stories = open(f"{docs}/03-user-stories.md").read()
tcs = open(f"{docs}/07-test-cases.md").read()

# stories and ACs
story_acs = collections.OrderedDict(); titles = {}; feats = {}
cur = None
for line in stories.splitlines():
    m = re.match(r"### (US-\d+) · (.+?)(?: `|$)", line)
    if m:
        cur = m.group(1); titles[cur] = m.group(2).strip(); story_acs[cur] = []
        feats[cur] = " ".join(re.findall(r"`([MS]\d+)`", line)); continue
    m = re.match(r"\| (AC\d+)", line)
    if m and cur: story_acs[cur].append(m.group(1))

# test cases → refs
cov = collections.defaultdict(list)
level = {}
for line in tcs.splitlines():
    m = re.match(r"\| (TC-[A-Z0-9-]+) \| [^|]+\| ([^|]+)\|", line)
    if not m: continue
    tc, ref = m.group(1), m.group(2)
    lv = "U" if tc.startswith("TC-U-") else "A" if tc.startswith("TC-API") else "UI" if tc.startswith("TC-UI") else "M" if tc.startswith("TC-M-") else "N"
    level[tc] = lv
    for part in ref.split("·"):
        mm = re.search(r"(US-\d+)\s*(AC[\dAC/–\-, ]+)?", part)
        if not mm: continue
        us = mm.group(1)
        acs = mm.group(2)
        if not acs:
            for ac in story_acs.get(us, []): cov[(us, ac)].append(tc)
            continue
        nums = []
        for seg in re.findall(r"AC(\d+)((?:[/–-]\d+|/AC\d+)*)", acs):
            pass
        # parse tokens like AC1/2/4, AC1–3, AC2/AC3
        toks = re.findall(r"AC\d+|\d+|[–-]", acs)
        prev=None; rng=False
        for t in toks:
            if t in "–-": rng=True; continue
            n = int(t[2:]) if t.startswith("AC") else int(t)
            if rng and prev is not None:
                nums.extend(range(prev+1, n+1)); rng=False
            else: nums.append(n)
            prev=n
        for n in nums: cov[(us, f"AC{n}")].append(tc)

out = []
out.append("| Story | Title | Features | AC | Test cases | Levels | Status |")
out.append("|---|---|---|---|---|---|---|")
missing = []
for us, acs in story_acs.items():
    for i, ac in enumerate(acs):
        t = sorted(set(cov.get((us, ac), [])), key=lambda x: (x.split('-')[1], x))
        lv = "/".join(sorted({level[x] for x in t}, key=["U","A","UI","M","N"].index)) if t else ""
        if not t: missing.append(f"{us} {ac}")
        out.append(f"| {us if i==0 else ''} | {titles[us] if i==0 else ''} | {feats[us] if i==0 else ''} | {ac} | {', '.join(t) if t else '**GAP**'} | {lv} | ☐ Not run |")
print("\n".join(out))
print("MISSING:", missing, file=sys.stderr)
# test cases referencing nothing
