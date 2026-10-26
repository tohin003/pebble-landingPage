"""Check a KIT.json against kit.schema.json, plus the kit's own rules (files exist, peaks as stated, no failing
classifier verdicts, every third-party take has its source page and SHA-256). No dependencies: it implements the
subset of JSON Schema the kit schema uses (type, required, enum, const, pattern, minimum/maximum/exclusiveMinimum,
properties, additionalProperties, items, $ref, allOf with if/then).

Usage: python -I validate_kit.py <work>/KIT.json [--schema tools/audio/sfx2/kit.schema.json]
Exit 1 on any problem, listing each one.
"""
import argparse
import json
import os
import re
import sys

TYPES = {"object": dict, "array": list, "string": str, "boolean": bool, "null": type(None)}


def is_type(v, t):
    if t == "number":
        return isinstance(v, (int, float)) and not isinstance(v, bool)
    if t == "integer":
        return isinstance(v, int) and not isinstance(v, bool)
    return isinstance(v, TYPES[t])


def check(v, s, root, path, errs):
    if "$ref" in s:
        name = s["$ref"].split("/")[-1]
        return check(v, root["$defs"][name], root, path, errs)
    if "type" in s:
        ts = s["type"] if isinstance(s["type"], list) else [s["type"]]
        if not any(is_type(v, t) for t in ts):
            errs.append(f"{path}: {repr(v)[:80]} is not {ts}")
            return
    if "const" in s and v != s["const"]:
        errs.append(f"{path}: {v!r} != {s['const']!r}")
    if "enum" in s and v not in s["enum"]:
        errs.append(f"{path}: {v!r} not in {s['enum']}")
    if isinstance(v, str) and "pattern" in s and not re.search(s["pattern"], v):
        errs.append(f"{path}: {v!r} does not match {s['pattern']}")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if "maximum" in s and v > s["maximum"]:
            errs.append(f"{path}: {v} > {s['maximum']}")
        if "minimum" in s and v < s["minimum"]:
            errs.append(f"{path}: {v} < {s['minimum']}")
        if "exclusiveMinimum" in s and v <= s["exclusiveMinimum"]:
            errs.append(f"{path}: {v} <= {s['exclusiveMinimum']}")
    if isinstance(v, dict):
        for k in s.get("required", []):
            if k not in v:
                errs.append(f"{path}: missing '{k}'")
        props = s.get("properties", {})
        for k, sub in props.items():
            if k in v:
                check(v[k], sub, root, f"{path}.{k}", errs)
        ap = s.get("additionalProperties")
        if isinstance(ap, dict):
            for k in v:
                if k not in props:
                    check(v[k], ap, root, f"{path}.{k}", errs)
    if isinstance(v, list) and "items" in s:
        for i, x in enumerate(v):
            check(x, s["items"], root, f"{path}[{i}]", errs)
    for sub in s.get("allOf", []):
        if "if" in sub:
            probe = []
            check(v, sub["if"], root, path, probe)
            if not probe and "then" in sub:
                check(v, sub["then"], root, path, errs)
        else:
            check(v, sub, root, path, errs)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("kit")
    ap.add_argument("--schema", default=os.path.join(here, "kit.schema.json"))
    a = ap.parse_args()
    kit = json.load(open(a.kit, encoding="utf-8"))
    schema = json.load(open(a.schema, encoding="utf-8"))
    errs = []
    check(kit, schema, schema, "KIT", errs)
    work = os.path.dirname(os.path.abspath(a.kit))
    ids = set()
    for f in kit.get("files", []):
        p = f"KIT.files[{f.get('id')}]"
        if f.get("id") in ids:
            errs.append(f"{p}: duplicate id")
        ids.add(f.get("id"))
        if not os.path.exists(os.path.join(work, f.get("file", ""))):
            errs.append(f"{p}: file missing: {f.get('file')}")
        target = f.get("edit", {}).get("peak_target_dbtp")
        tp = f.get("measure", {}).get("true_peak_dbtp")
        if target is not None and tp is not None and abs(tp - target) > 0.1:
            errs.append(f"{p}: true peak {tp} dBTP, stated {target}")
        for key in ("classifier", "classifier_film_level"):
            if f.get(key, {}).get("verdict") == "fail":
                errs.append(f"{p}: {key} verdict fail: {f[key].get('flags')}")
        if f.get("licence") not in kit.get("licences", {}):
            errs.append(f"{p}: unknown licence {f.get('licence')}")
        if f.get("role") in ("drop_impact",) and f.get("status") in ("primary",) and f.get("licence") == "mixkit-sfx-free":
            errs.append(f"{p}: a Mixkit take cannot be a primary hit (TREATMENT §4.6)")
        if f.get("role") in ("standin_plunk", "standin_tap", "stinger") and f.get("status") != "stand-in":
            errs.append(f"{p}: stand-ins must say so (status 'stand-in')")
    for e in errs:
        print("FAIL", e)
    print(f"{len(kit.get('files', []))} takes checked: {'ok' if not errs else str(len(errs)) + ' problem(s)'}")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
