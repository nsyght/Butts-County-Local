#!/usr/bin/env python3
"""
Butts County Local — Google Places API (New) Scraper
=====================================================
Uses the NEW Places API (places.googleapis.com) which is what
your Google Cloud project has enabled.

SETUP:
  pip install requests

USAGE:
  python scrape_places.py --key YOUR_GOOGLE_API_KEY --slug the-dumpster-co
  python scrape_places.py --key YOUR_GOOGLE_API_KEY --all
  python scrape_places.py --key YOUR_GOOGLE_API_KEY --all --no-photos
"""

import requests
import json
import os
import sys
import argparse
import re
import time

# ── CONFIG ────────────────────────────────────────────────────────────────
OUT_DIR     = os.path.dirname(os.path.abspath(__file__))
BIZ_DIR     = os.path.join(OUT_DIR, "businesses")
IMAGES_DIR  = os.path.join(OUT_DIR, "images")
PHOTO_WIDTH = 800

os.makedirs(IMAGES_DIR, exist_ok=True)

# Places API (New) endpoints
SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PHOTO_URL  = "https://places.googleapis.com/v1/{name}/media"

# ── BUSINESS LIST ─────────────────────────────────────────────────────────
BUSINESSES = [
    # Real businesses first — most reliable matches
    {"slug": "the-dumpster-co",            "query": "The Dumpster Co Jackson GA"},
    {"slug": "indian-springs-state-park",  "query": "Indian Springs State Park Flovilla GA"},
    {"slug": "dauset-trails",              "query": "Dauset Trails Nature Center Jackson GA"},
    {"slug": "high-falls-state-park",      "query": "High Falls State Park Jackson GA"},
    {"slug": "butts-county-library",       "query": "Butts County Public Library Jackson GA"},
    {"slug": "butts-county-schools",       "query": "Butts County School System Jackson GA"},
    # Fictional — will match nearest real equivalent in Jackson GA
    {"slug": "southern-star-diner",        "query": "diner breakfast restaurant Jackson GA"},
    {"slug": "jackson-bbq-smokehouse",     "query": "BBQ restaurant Jackson GA"},
    {"slug": "peach-tree-cafe",            "query": "coffee cafe Jackson GA"},
    {"slug": "el-rancho-mexican",          "query": "Mexican restaurant Jackson GA"},
    {"slug": "butts-county-family-health", "query": "family health clinic Jackson GA"},
    {"slug": "jackson-dental-associates",  "query": "dentist Jackson GA"},
    {"slug": "jackson-urgent-care",        "query": "urgent care Jackson GA"},
    {"slug": "jackson-auto-tire",          "query": "auto repair tire shop Jackson GA"},
    {"slug": "butts-county-collision",     "query": "auto body collision repair Jackson GA"},
    {"slug": "magnolia-hair-studio",       "query": "hair salon Jackson GA"},
    {"slug": "jackson-nail-spa",           "query": "nail salon Jackson GA"},
    {"slug": "jackson-family-fitness",     "query": "gym fitness center Jackson GA"},
    {"slug": "georgia-green-lawn",         "query": "lawn care landscaping Jackson GA"},
    {"slug": "jackson-animal-clinic",      "query": "veterinarian animal clinic Jackson GA"},
    {"slug": "butts-county-farm-supply",   "query": "farm supply feed store Jackson GA"},
]


# ── API HELPERS ───────────────────────────────────────────────────────────

def text_search(query, api_key):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.nationalPhoneNumber,places.internationalPhoneNumber,"
            "places.websiteUri,places.regularOpeningHours,"
            "places.rating,places.userRatingCount,places.photos"
        ),
    }
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": 33.2929, "longitude": -83.9638},
                "radius": 50000.0,
            }
        },
        "maxResultCount": 1,
    }
    try:
        r = requests.post(SEARCH_URL, headers=headers, json=body, timeout=10)
        data = r.json()
        if r.status_code != 200:
            msg = data.get("error", {}).get("message", str(r.status_code))
            print(f"  ✗ API error: {msg}")
            return None
        places = data.get("places", [])
        if not places:
            print(f"  ⚠  No results found")
            return None
        return places[0]
    except Exception as e:
        print(f"  ✗ Request failed: {e}")
        return None


def download_photo(photo_name, api_key, slug):
    url = PHOTO_URL.format(name=photo_name)
    params = {"maxWidthPx": PHOTO_WIDTH, "key": api_key}
    try:
        r = requests.get(url, params=params, timeout=15, allow_redirects=True)
        if r.status_code == 200 and "image" in r.headers.get("Content-Type", ""):
            ext = "jpg" if "jpeg" in r.headers.get("Content-Type","") else "png"
            filename = f"{slug}.{ext}"
            with open(os.path.join(IMAGES_DIR, filename), "wb") as f:
                f.write(r.content)
            kb = len(r.content) // 1024
            print(f"  ✓ Photo → images/{filename} ({kb}KB)")
            return f"images/{filename}"
        print(f"  ⚠  Photo download failed (HTTP {r.status_code})")
        return None
    except Exception as e:
        print(f"  ✗ Photo error: {e}")
        return None


def format_hours(opening_hours):
    if not opening_hours:
        return None
    lines = opening_hours.get("weekdayDescriptions", [])
    return " · ".join(lines[:2]) + ("…" if len(lines) > 2 else "") if lines else None


# ── HTML PATCHING ─────────────────────────────────────────────────────────

def patch_business_page(slug, data):
    filepath = os.path.join(BIZ_DIR, f"{slug}.html")
    if not os.path.exists(filepath):
        print(f"  ⚠  businesses/{slug}.html not found — skipping")
        return

    with open(filepath, encoding="utf-8") as f:
        html = f.read()

    # Photo — insert full-width image above the back-bar
    if data.get("photo_path"):
        photo_block = (
            f'\n<div style="width:100%;height:260px;overflow:hidden;">'
            f'<img src="/{data["photo_path"]}" alt="{data["name"]}" '
            f'style="width:100%;height:100%;object-fit:cover;display:block;"></div>'
        )
        if "object-fit:cover" not in html:
            html = html.replace('<div class="back-bar">', photo_block + '\n<div class="back-bar">', 1)

    # Phone
    if data.get("phone"):
        digits = re.sub(r"\D", "", data["phone"])
        html = re.sub(r'href="tel:\d{7,}"', f'href="tel:{digits}"', html)
        html = re.sub(
            r'(<a href="tel:[^"]*" class="speakable">)[^<]*(</a>)',
            rf'\g<1>{data["phone"]}\g<2>', html
        )

    # Address
    if data.get("address"):
        q = re.sub(r"\s+", "+", data["address"])
        html = re.sub(r'href="https://maps\.google\.com/\?q=[^"]*"',
                      f'href="https://maps.google.com/?q={q}"', html)
        html = re.sub(
            r'(<a href="https://maps\.google\.com/[^"]*" target="_blank" class="speakable">)[^<]*(</a>)',
            rf'\g<1>{data["address"]}\g<2>', html
        )

    # Hours
    if data.get("hours"):
        html = re.sub(
            r'(<div class="info-row"><span class="info-icon">🕐</span><div class="speakable">)[^<]*(</div>)',
            rf'\g<1>{data["hours"]}\g<2>', html
        )

    # Rating row
    if data.get("rating") and "Google reviews" not in html:
        rating_row = (
            f'\n      <div class="info-row"><span class="info-icon">⭐</span>'
            f'<div>{data["rating"]}/5 &nbsp;·&nbsp; {data.get("review_count",0):,} Google reviews</div></div>'
        )
        html = html.replace(
            '<div class="info-row"><span class="info-icon">🏷️</span>',
            rating_row + '\n      <div class="info-row"><span class="info-icon">🏷️</span>', 1
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  ✓ Patched businesses/{slug}.html")


def patch_index_card(slug, data, index_html):
    if not data.get("photo_path"):
        return index_html
    img = (
        f'<div style="height:160px;overflow:hidden;">'
        f'<img src="/{data["photo_path"]}" alt="{data["name"]}" '
        f'style="width:100%;height:100%;object-fit:cover;display:block;"></div>'
    )
    href = f'/businesses/{slug}.html'
    if href not in index_html:
        return index_html
    idx         = index_html.find(href)
    card_start  = index_html.rfind('<article', 0, idx)
    card_end    = index_html.find('</article>', idx) + len('</article>')
    card        = index_html[card_start:card_end]
    new_card    = re.sub(r'<div class="card-icon"[^>]*>[^<]*</div>', img, card, count=1)
    return index_html[:card_start] + new_card + index_html[card_end:]


# ── MAIN ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Butts County Local — Places API scraper")
    parser.add_argument("--key",       required=True, help="Google Maps API key")
    parser.add_argument("--slug",      help="Single business slug to scrape")
    parser.add_argument("--all",       action="store_true", help="Scrape all businesses")
    parser.add_argument("--no-photos", action="store_true", help="Skip photo downloads")
    args = parser.parse_args()

    dl_photos = not args.no_photos

    if args.slug:
        targets = [b for b in BUSINESSES if b["slug"] == args.slug]
        if not targets:
            print(f"Slug '{args.slug}' not found. Available slugs:")
            for b in BUSINESSES:
                print(f"  {b['slug']}")
            sys.exit(1)
    elif args.all:
        targets = BUSINESSES
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python scrape_places.py --key AIzaSy... --slug the-dumpster-co")
        print("  python scrape_places.py --key AIzaSy... --all")
        sys.exit(0)

    results = {}

    for biz in targets:
        slug = biz["slug"]
        print(f"\n{'─'*50}")
        print(f"  [{slug}]  {biz['query']}")
        print(f"{'─'*50}")

        place = text_search(biz["query"], args.key)
        if not place:
            continue

        name    = place.get("displayName", {}).get("text", "")
        address = place.get("formattedAddress", "")
        phone   = place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber", "")
        website = place.get("websiteUri", "")
        rating  = place.get("rating")
        reviews = place.get("userRatingCount")
        photos  = place.get("photos", [])
        hours   = format_hours(place.get("regularOpeningHours"))

        print(f"  Name:    {name}")
        print(f"  Phone:   {phone or '—'}")
        print(f"  Website: {website or '—'}")
        print(f"  Rating:  {rating} ({reviews} reviews)" if rating else "  Rating:  —")
        print(f"  Photos:  {len(photos)} available")

        photo_path = None
        if dl_photos and photos:
            photo_path = download_photo(photos[0]["name"], args.key, slug)

        data = {
            "name": name, "address": address, "phone": phone,
            "website": website, "hours": hours,
            "rating": rating, "review_count": reviews,
            "photo_path": photo_path,
        }
        patch_business_page(slug, data)
        results[slug] = data
        time.sleep(0.3)

    # Update index.html cards
    if dl_photos and results:
        idx_path = os.path.join(OUT_DIR, "index.html")
        with open(idx_path, encoding="utf-8") as f:
            idx_html = f.read()
        for slug, data in results.items():
            idx_html = patch_index_card(slug, data, idx_html)
        with open(idx_path, "w", encoding="utf-8") as f:
            f.write(idx_html)
        print(f"\n✓ index.html cards updated")

    # Save summary JSON
    with open(os.path.join(OUT_DIR, "places_data.json"), "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*50}")
    print(f"  Done — {len(results)}/{len(targets)} scraped successfully")
    print(f"  Photos in:  images/")
    print(f"  Summary:    places_data.json")
    print(f"\n  Push to GitHub:")
    print(f"    git add .")
    print(f"    git commit -m 'Add real business photos from Google Places'")
    print(f"    git push")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
