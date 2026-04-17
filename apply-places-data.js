// Run with: node apply-places-data.js
// Paste the ===RESULTS=== JSON from fetch-places-photos.js into the `data` variable below
// This patches all business HTML pages and index.html with real data + photos

const fs = require('fs');
const path = require('path');

// ── PASTE YOUR RESULTS HERE ───────────────────────────────────────────────
// Copy everything between ===RESULTS=== and ===END RESULTS=== and paste below
const data = {
  // example structure — replace with your actual results:
  // "the-dumpster-co": {
  //   "found": true,
  //   "name": "The Dumpster Co.",
  //   "address": "10 3rd St Suite 201, Jackson, GA 30233",
  //   "phone": "(678) 306-9993",
  //   "rating": 4.8,
  //   "reviews": 47,
  //   "website": "https://mydumpsterco.com",
  //   "hours": { "Monday": "8am-5pm", ... },
  //   "photoUrl": "https://lh3.googleusercontent.com/..."
  // }
};

// ── CONFIG ────────────────────────────────────────────────────────────────
const BIZ_DIR   = path.join(__dirname, 'businesses');
const INDEX     = path.join(__dirname, 'index.html');

let patchedPages = 0;
let patchedCards = 0;

// ── PATCH BUSINESS DETAIL PAGES ───────────────────────────────────────────
for (const [slug, info] of Object.entries(data)) {
  if (!info.found) {
    console.log(`⚠  Skipping ${slug} (not found)`);
    continue;
  }

  const filepath = path.join(BIZ_DIR, `${slug}.html`);
  if (!fs.existsSync(filepath)) {
    console.log(`⚠  File not found: businesses/${slug}.html`);
    continue;
  }

  let html = fs.readFileSync(filepath, 'utf8');

  // ── Real photo — insert above back-bar ──────────────────────────────
  if (info.photoUrl && !html.includes('object-fit:cover')) {
    const photoBlock = `
<div style="width:100%;height:260px;overflow:hidden;">
  <img src="${info.photoUrl}" alt="${info.name}"
    style="width:100%;height:100%;object-fit:cover;display:block;"
    referrerpolicy="no-referrer">
</div>`;
    html = html.replace('<div class="back-bar">', photoBlock + '\n<div class="back-bar">');
  }

  // ── Phone ────────────────────────────────────────────────────────────
  if (info.phone) {
    const digits = info.phone.replace(/\D/g, '');
    html = html.replace(/href="tel:\d{7,}"/g, `href="tel:${digits}"`);
    html = html.replace(
      /(<a href="tel:[^"]*" class="speakable">)[^<]*(<\/a>)/,
      `$1${info.phone}$2`
    );
  }

  // ── Address ──────────────────────────────────────────────────────────
  if (info.address) {
    const q = info.address.replace(/\s+/g, '+');
    html = html.replace(
      /href="https:\/\/maps\.google\.com\/\?q=[^"]*"/g,
      `href="https://maps.google.com/?q=${q}"`
    );
    html = html.replace(
      /(<a href="https:\/\/maps\.google\.com\/[^"]*" target="_blank" class="speakable">)[^<]*(<\/a>)/,
      `$1${info.address}$2`
    );
    // Also update the embedded map iframe
    html = html.replace(
      /src="https:\/\/maps\.google\.com\/maps\?q=[^"]*&output=embed"/,
      `src="https://maps.google.com/maps?q=${q}&output=embed"`
    );
  }

  // ── Hours ────────────────────────────────────────────────────────────
  if (info.hours && Object.keys(info.hours).length > 0) {
    const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const hoursStr = dayOrder
      .filter(d => info.hours[d])
      .map(d => `${d.slice(0,3)}: ${info.hours[d]}`)
      .join(' · ');
    if (hoursStr) {
      html = html.replace(
        /(<div class="info-row"><span class="info-icon">🕐<\/span><div class="speakable">)[^<]*(<\/div>)/,
        `$1${hoursStr}$2`
      );
    }
  }

  // ── Website ──────────────────────────────────────────────────────────
  if (info.website) {
    const domain = info.website.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    // Update href and visible text for website link
    html = html.replace(
      /(<div class="info-row"><span class="info-icon">🌐<\/span><div><a href=")[^"]*(")/,
      `$1${info.website}$2`
    );
    html = html.replace(
      /(<div class="info-row"><span class="info-icon">🌐<\/span><div><a href="[^"]*" target="_blank">)[^<]*(<\/a>)/,
      `$1${domain}$2`
    );
  }

  // ── Rating ───────────────────────────────────────────────────────────
  if (info.rating && !html.includes('Google reviews')) {
    const ratingRow = `
      <div class="info-row"><span class="info-icon">⭐</span><div>${info.rating}/5 &nbsp;·&nbsp; ${Number(info.reviews).toLocaleString()} Google reviews</div></div>`;
    html = html.replace(
      '<div class="info-row"><span class="info-icon">🏷️</span>',
      ratingRow + '\n      <div class="info-row"><span class="info-icon">🏷️</span>'
    );
  }

  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`✓ Patched businesses/${slug}.html`);
  patchedPages++;
}

// ── PATCH INDEX.HTML CARDS ────────────────────────────────────────────────
let indexHtml = fs.readFileSync(INDEX, 'utf8');

for (const [slug, info] of Object.entries(data)) {
  if (!info.found || !info.photoUrl) continue;

  const href = `/businesses/${slug}.html`;
  if (!indexHtml.includes(href)) continue;

  const imgTag = `<div style="height:160px;overflow:hidden;"><img src="${info.photoUrl}" alt="${info.name}" style="width:100%;height:100%;object-fit:cover;display:block;" referrerpolicy="no-referrer"></div>`;

  // Find the article card containing this slug's href
  const idx       = indexHtml.indexOf(href);
  const cardStart = indexHtml.lastIndexOf('<article', idx);
  const cardEnd   = indexHtml.indexOf('</article>', idx) + '</article>'.length;
  const card      = indexHtml.slice(cardStart, cardEnd);

  // Replace card-icon div with real photo
  const newCard = card.replace(/<div class="card-icon"[^>]*>[^<]*<\/div>/, imgTag);

  if (newCard !== card) {
    indexHtml = indexHtml.slice(0, cardStart) + newCard + indexHtml.slice(cardEnd);
    console.log(`✓ Card updated in index.html: ${slug}`);
    patchedCards++;
  }
}

fs.writeFileSync(INDEX, indexHtml, 'utf8');

console.log(`\n✅ Done!`);
console.log(`   ${patchedPages} business pages patched`);
console.log(`   ${patchedCards} index cards updated`);
console.log(`\nNext steps:`);
console.log(`   git add .`);
console.log(`   git commit -m "Add real photos and data from Google Places"`);
console.log(`   git push`);
