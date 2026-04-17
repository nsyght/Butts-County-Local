// Run with: node update-image-paths.js
// Replaces all Google photo URLs in HTML files with local /images/slug.jpg paths

const fs = require('fs');
const path = require('path');

const ROOT    = __dirname;
const BIZ_DIR = path.join(ROOT, 'businesses');

const slugs = [
  'the-dumpster-co','indian-springs-state-park','dauset-trails',
  'high-falls-state-park','butts-county-library','southern-star-diner',
  'jackson-bbq-smokehouse','peach-tree-cafe','el-rancho-mexican',
  'butts-county-family-health','jackson-dental-associates','jackson-urgent-care',
  'jackson-auto-tire','butts-county-collision','magnolia-hair-studio',
  'jackson-nail-spa','jackson-family-fitness','georgia-green-lawn',
  'jackson-animal-clinic',
];

let totalPatched = 0;

function replaceGoogleUrl(html, slug) {
  // Replace any lh3.googleusercontent.com URL in an img src with local path
  return html.replace(
    /src="https:\/\/lh3\.googleusercontent\.com\/[^"]+"/g,
    `src="/images/${slug}.jpg"`
  );
}

// Patch each business page
for (const slug of slugs) {
  const imgPath = path.join(ROOT, 'images', `${slug}.jpg`);
  if (!fs.existsSync(imgPath)) {
    console.log(`⚠  Skipping ${slug} — image not downloaded yet`);
    continue;
  }

  const fp = path.join(BIZ_DIR, `${slug}.html`);
  if (!fs.existsSync(fp)) continue;

  let html = fs.readFileSync(fp, 'utf8');
  const newHtml = replaceGoogleUrl(html, slug);
  if (newHtml !== html) {
    fs.writeFileSync(fp, newHtml, 'utf8');
    console.log(`✓ businesses/${slug}.html`);
    totalPatched++;
  }
}

// Patch index.html — replace each Google URL with the right local slug image
let indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

for (const slug of slugs) {
  const imgPath = path.join(ROOT, 'images', `${slug}.jpg`);
  if (!fs.existsSync(imgPath)) continue;

  // Find the card for this slug and replace its Google URL
  const href = `/businesses/${slug}.html`;
  if (!indexHtml.includes(href)) continue;

  const idx       = indexHtml.indexOf(href);
  const cardStart = indexHtml.lastIndexOf('<article', idx);
  const cardEnd   = indexHtml.indexOf('</article>', idx) + '</article>'.length;
  const card      = indexHtml.slice(cardStart, cardEnd);

  const newCard = card.replace(
    /src="https:\/\/lh3\.googleusercontent\.com\/[^"]+"/,
    `src="/images/${slug}.jpg"`
  );

  if (newCard !== card) {
    indexHtml = indexHtml.slice(0, cardStart) + newCard + indexHtml.slice(cardEnd);
    console.log(`✓ index.html card: ${slug}`);
    totalPatched++;
  }
}

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');

console.log(`\n✅ Done! ${totalPatched} files updated to use local images.`);
console.log(`\nNow commit and push to GitHub:`);
console.log(`  git add .`);
console.log(`  git commit -m "Use local images instead of Google CDN"`);
console.log(`  git push`);
