import json
import math
import statistics
import sys
import urllib.request
from datetime import date

BASE = "https://iss.moex.com/iss"

DEFAULT_CONFIG = {
    "top_n": 5,
    "variant": "C",
    "min_years": 1.0,
    "max_years": 10.0,
    "min_liq": 5000000.0,
    "max_per_bucket": 2,
    "weights": (40.0, 30.0, 15.0, 15.0)
}

def _get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ofz-agent-tool)"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

def _table(data: dict):
    cols = data["columns"]
    return [dict(zip(cols, row)) for row in data.get("data", []) if isinstance(row, list)]

def _num(v, default=None):
    if v is None or v == "" or v == "null":
        return default
    try:
        f = float(v)
        return default if math.isnan(f) else f
    except (TypeError, ValueError):
        return default

def fetch_tqob_securities() -> list:
    url = f"{BASE}/engines/stock/markets/bonds/boards/TQOB/securities.json?iss.meta=off"
    res = _get_json(url)
    sec_rows = _table(res["securities"])
    m_rows = _table(res["marketdata"])
    m_map = {row.get("SECID"): row for row in m_rows if row.get("SECID")}
    combined = []
    for sec in sec_rows:
        secid = sec.get("SECID")
        if not secid: continue
        combined.append({**sec, **m_map.get(secid, {})})
    return combined

def modified_duration(coupon_pct, cpy, years_left, clean_price, ytm, face=1000.0):
    if ytm is None or ytm <= 0 or clean_price is None or clean_price <= 0:
        return None
    y_per = (ytm / 100.0) / cpy
    step_days = 365.25 / cpy
    n = max(1, int(math.ceil(years_left * 365.25 / step_days)))
    cf = (coupon_pct / 100.0) * face / cpy
    pv = 0.0
    dur_periods = 0.0
    for t in range(1, n + 1):
        flow = cf + (face if t == n else 0.0)
        disc = (1.0 + y_per) ** t
        dur_periods += t * flow / disc
        pv += flow / disc
    if pv <= 0: return None
    return (dur_periods / pv) / (1.0 + y_per) / cpy

def get_scored_ofz_json(config=None):
    if config is None:
        config = DEFAULT_CONFIG

    today = date.today()
    universe = fetch_tqob_securities()
    cands = []

    for b in universe:
        secid = b.get("SECID", "")
        name = (b.get("SHORTNAME") or "").upper()

        if "ОФЗ" not in name and not secid.startswith("SU"):
            continue

        mat_str = b.get("MATDATE")
        if not mat_str or len(str(mat_str)) < 10:
            continue
        try:
            mat = date.fromisoformat(str(mat_str)[:10])
        except ValueError:
            continue

        years_left = (mat - today).days / 365.25
        if years_left < config["min_years"] or years_left > config["max_years"]:
            continue

        ytm = _num(b.get("YIELD")) or _num(b.get("YIELD_TO_MATURITY")) or _num(b.get("YIELD_TO_MATURITY_PREV")) or _num(b.get("YIELDTOOFFER"))
        clean = _num(b.get("CLEANPRICE")) or _num(b.get("CLEAN_PRICE")) or _num(b.get("PREVPRICE")) or _num(b.get("LCLOSEPRICE"))

        if ytm is None or clean is None or ytm <= 0 or clean <= 0:
            continue

        liq = _num(b.get("VALTODAY")) or _num(b.get("VALUE"))
        if liq is None or liq <= 0:
            prev_vol = _num(b.get("PREVVOLUME")) or 0.0
            prev_price = _num(b.get("PREVPRICE")) or 100.0
            face_val = _num(b.get("FACEVALUE"), 1000.0) or 1000.0
            liq = prev_vol * (prev_price / 100.0) * (face_val / 1000.0)

        if liq < config["min_liq"]:
            continue

        face_val = _num(b.get("FACEVALUE"), 1000.0) or 1000.0
        cpy = _num(b.get("COUPONPERYEAR"), 2) or 2
        c_val = _num(b.get("COUPONVALUE"))
        
        if c_val is not None and c_val > 0:
            coupon_pct = (c_val * cpy / face_val) * 100.0
        else:
            coupon_pct = _num(b.get("COUPON")) or _num(b.get("COUPONPERCENT")) or 0.0

        c_val_num = round(c_val, 2) if c_val is not None else round(face_val * (coupon_pct / 100.0) / cpy, 2)
        next_coup_str = str(b.get("NEXTCOUPON") or "")

        # Determine payout months (e.g. if next coupon is Jan and cpy=2 -> Jan & Jul)
        payout_months = []
        if next_coup_str and len(next_coup_str) >= 7:
            try:
                base_m = int(next_coup_str[5:7])
                step_m = max(1, round(12 / cpy))
                payout_months = sorted([((base_m - 1 + i * step_m) % 12) + 1 for i in range(int(cpy))])
            except Exception:
                payout_months = [3, 9] if cpy == 2 else [1, 4, 7, 10]
        else:
            payout_months = [3, 9] if cpy == 2 else [1, 4, 7, 10]

        cands.append({
            "secid": secid,
            "name": b.get("SHORTNAME", ""),
            "face": face_val,
            "cpy": cpy,
            "coupon_pct": round(coupon_pct, 2),
            "coupon_value": c_val_num,
            "next_coupon": next_coup_str,
            "payout_months": payout_months,
            "maturity": str(mat),
            "years_left": round(years_left, 2),
            "ytm": round(ytm, 2),
            "clean": round(clean, 2),
            "liq": round(liq, 0),
            "ndi": round(_num(b.get("ACCRUEDINTEREST", 0.0)) or 0.0, 2),
        })

    enriched = []
    for c in cands:
        moddur = modified_duration(c["coupon_pct"], c["cpy"], c["years_left"],
                                   c["clean"], c["ytm"], c["face"])
        if not moddur: continue

        price_to_par = c["clean"]
        c.update({
            "moddur": round(moddur, 2),
            "price_to_par": round(price_to_par, 2),
            "discount": round(100.0 - price_to_par, 2),
            "price_rub": round(c["face"] * (c["clean"] / 100.0) + c["ndi"], 2)
        })
        enriched.append(c)

    if not enriched:
        return []

    ytms = [c["ytm"] for c in enriched]
    ytm_ref = statistics.mean(ytms) if ytms else 1.0

    def minmax(vals):
        lo, hi = min(vals), max(vals)
        if hi - lo < 1e-9: return [50.0] * len(vals)
        return [(v - lo) / (hi - lo) * 100.0 for v in vals]

    n_ytm = minmax([c["ytm"] for c in enriched])
    n_inv = minmax([1.0 / c["moddur"] for c in enriched])
    n_liq = minmax([c["liq"] for c in enriched])
    n_disc = minmax([c["discount"] for c in enriched])

    tot_w = sum(config["weights"])
    w = [wi / tot_w for wi in config["weights"]]

    for i, c in enumerate(enriched):
        if config["variant"] == "A":
            c["score"] = round(c["ytm"] / c["moddur"], 2)
        elif config["variant"] == "B":
            c["score"] = round((c["ytm"] - ytm_ref) / c["moddur"], 2)
        else: 
            c["score"] = round(w[0]*n_ytm[i] + w[1]*n_inv[i] + w[2]*n_liq[i] + w[3]*n_disc[i], 2)

    def get_bucket(y):
        return "short" if y < 2 else ("mid" if y <= 5 else "long")

    ranked = sorted(enriched, key=lambda x: x["score"], reverse=True)
    final_list = []
    counts = {"short": 0, "mid": 0, "long": 0}
    for c in ranked:
        bucket = get_bucket(c["years_left"])
        if counts[bucket] < config["max_per_bucket"]:
            final_list.append(c)
            counts[bucket] += 1

    final_list = final_list[:config["top_n"]]

    for c in final_list:
        c["ldv_eligible"] = c["years_left"] >= 3.0

    return final_list

if __name__ == "__main__":
    cfg = DEFAULT_CONFIG.copy()
    if len(sys.argv) > 1:
        try:
            custom_cfg = json.loads(sys.argv[1])
            cfg.update(custom_cfg)
        except Exception:
            pass
    data = get_scored_ofz_json(cfg)
    print(json.dumps(data, ensure_ascii=False, indent=2))
