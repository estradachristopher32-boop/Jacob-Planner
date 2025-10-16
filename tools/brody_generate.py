#!/usr/bin/env python3
import json, os, sys, pathlib
# ensure repo root on sys.path for local imports
ROOT = str(pathlib.Path(__file__).resolve().parents[1])
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from tg_adapters import build_request, brody_handle

def main():
    payload = {
        "goal": os.getenv('JACOB_GOAL','bulk'),
        "stores": [s for s in (os.getenv('JACOB_STORES') or 'Costco,HEB,Walmart').split(',')],
        "assumptions": {"sex":"male","height_cm":183}
    }
    req = build_request(sender='runner', target='brody', intent='generate_weekly_plan_request', payload=payload)
    resp = brody_handle(req)
    plan = resp.payload.get('plan')
    if not plan:
        print('No plan returned', file=sys.stderr)
        sys.exit(2)
    out_path = os.path.join('docs','jacob_plan.json')
    with open(out_path,'w',encoding='utf-8') as f:
        json.dump(plan, f, indent=2)
    print('Wrote', out_path)

if __name__ == '__main__':
    main()
