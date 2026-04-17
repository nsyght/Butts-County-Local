// Run with: node fetch-places-photos.js
// Fetches ratings, hours, websites AND photo URLs for all businesses

const https = require('https');

const API_KEY = 'AIzaSyCKs0rN2CjZ3PXgW2Dp0lAjWx8fyBMi8Jw';

const businesses = [
  {slug:'the-dumpster-co',            query:'The Dumpster Co 10 3rd St Jackson GA 30233'},
  {slug:'indian-springs-state-park',  query:'Indian Springs State Park 678 Lake Clark Rd Flovilla GA'},
  {slug:'dauset-trails',              query:'Dauset Trails Nature Center 360 Mount Vernon Rd Jackson GA'},
  {slug:'high-falls-state-park',      query:'High Falls State Park 76 High Falls Park Dr Jackson GA'},
  {slug:'butts-county-library',       query:'Butts County Public Library Jackson GA'},
  {slug:'butts-county-schools',       query:'Butts County School System 186 N Mulberry St Jackson GA'},
  {slug:'southern-star-diner',        query:'diner breakfast Jackson GA'},
  {slug:'jackson-bbq-smokehouse',     query:'BBQ restaurant Jackson GA'},
  {slug:'peach-tree-cafe',            query:'coffee cafe Jackson GA'},
  {slug:'el-rancho-mexican',          query:'Mexican restaurant Jackson GA'},
  {slug:'butts-county-family-health', query:'family health clinic Jackson GA'},
  {slug:'jackson-dental-associates',  query:'dentist Jackson GA'},
  {slug:'jackson-urgent-care',        query:'urgent care Jackson GA'},
  {slug:'jackson-auto-tire',          query:'auto repair tire shop Jackson GA'},
  {slug:'butts-county-collision',     query:'auto body collision repair Jackson GA'},
  {slug:'magnolia-hair-studio',       query:'hair salon Jackson GA'},
  {slug:'jackson-nail-spa',           query:'nail salon Jackson GA'},
  {slug:'jackson-family-fitness',     query:'gym fitness center Jackson GA'},
  {slug:'georgia-green-lawn',         query:'lawn care landscaping Jackson GA'},
  {slug:'jackson-animal-clinic',      query:'veterinarian animal clinic Jackson GA'},
  {slug:'butts-county-farm-supply',   query:'farm supply feed store Jackson GA'},
];

function post(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'places.googleapis.com',
      path: '/v1/places:searchText',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours,places.internationalPhoneNumber,places.nationalPhoneNumber,places.formattedAddress,places.photos'
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fmtTime(h, m) {
  const s = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return `${h12}${m ? ':' + String(m).padStart(2,'0') : ''}${s}`;
}

function parseHours(periods) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const map = {};
  for (const p of (periods || [])) {
    const d = p.open?.day ?? 0;
    const oh = p.open?.hour ?? 0, om = p.open?.minute ?? 0;
    const ch = p.close?.hour ?? 0, cm = p.close?.minute ?? 0;
    map[days[d]] = `${fmtTime(oh,om)}-${fmtTime(ch,cm)}`;
  }
  return map;
}

async function getPhotoUrl(photoName) {
  return new Promise((resolve) => {
    const path = `/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=600&key=${API_KEY}`;
    const opts = { hostname: 'places.googleapis.com', path, method: 'GET' };
    const req = https.request(opts, res => {
      resolve(res.headers['location'] || '');
    });
    req.on('error', () => resolve(''));
    req.end();
  });
}

async function run() {
  const results = {};
  for (const biz of businesses) {
    try {
      const data = await post({ textQuery: biz.query, maxResultCount: 1 });
      const place = data.places?.[0];
      if (!place) {
        console.error(`NOT FOUND: ${biz.slug}`);
        results[biz.slug] = { found: false };
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      let photoUrl = '';
      if (place.photos && place.photos.length > 0) {
        photoUrl = await getPhotoUrl(place.photos[0].name);
      }
      const hours = parseHours(place.regularOpeningHours?.periods);
      results[biz.slug] = {
        found: true,
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
        rating: place.rating || '',
        reviews: place.userRatingCount || '',
        website: place.websiteUri || '',
        hours,
        photoUrl,
      };
      console.log(`✓ ${biz.slug} — ${place.rating}★ | photo: ${photoUrl ? 'YES' : 'none'}`);
    } catch(e) {
      console.error(`ERROR ${biz.slug}: ${e.message}`);
      results[biz.slug] = { found: false };
    }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('\n\n===RESULTS===');
  console.log(JSON.stringify(results, null, 2));
  console.log('===END RESULTS===');
}

run();
