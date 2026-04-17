// Run with: node download-images.js
// Downloads all Google Photos locally so they work without internet/CORS issues

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

const photos = {
  'the-dumpster-co':            'https://lh3.googleusercontent.com/places/ANXAkqEJR8fYqDumhYl768Cqz1ladPxIAq5JfNlY67ENfhinG_JNqv6mJIZStCmHevZ2rOZuIml5FwBs6XN5X4o7uwFeeryvJPmsUuM=s4800-w600-h400',
  'indian-springs-state-park':  'https://lh3.googleusercontent.com/place-photos/AJRVUZOHfRtrLZCc0tSQW84GlBCM2Mo8w47kzIDHD1wI3rbAcxL5TSt2eWAl3RmVZczVoJy9FWNkikAVOZj9_memHpdH1SXt_43CJXmXiI1oa0F1pidvvNJElQut9JQ8O8Fyxh0km93UN9JG7mt3OSk=s4800-w600-h400',
  'dauset-trails':              'https://lh3.googleusercontent.com/places/ANXAkqGd11oIygRR79RVVQCsJgbPszs06d4I2l91fnGzW2bHp6U3_cwtL3yngVkTGHsI8V5N0YdXMP9yovmPTMnXgzjNY2O_NYQOIY0=s4800-w600-h400',
  'high-falls-state-park':      'https://lh3.googleusercontent.com/place-photos/AJRVUZNvbmLg2YfHhppw405gDAvdIcpXbiICIYY-M-XI_HeO4GEEndoFGrrzq-eyQLuv8EDMJW_pnYDmE4TGfOKh2AIuz_914LI3ZXB12gbR6Z8NdAx-lqKQUQ7Yv1xaqoIZDs-r22gqWgpsUh1QC-U=s4800-w600-h400',
  'butts-county-library':       'https://lh3.googleusercontent.com/place-photos/AJRVUZNnQfcC3PW9E-iaedAxDVR3YvKra1JCU006wwimlav9mzu0aRUKtJXxOSfGOnwRo-5Jx_70Uz3aFpQHIFBoqN8-YpcNY2GIzsyEETqe4_qPqms9XASKq6ndqI3A3_TnQwnVHq6aHsuEJu1b=s4800-w600-h400',
  'southern-star-diner':        'https://lh3.googleusercontent.com/place-photos/AJRVUZO8VYSw6P8gzjb2D9nkonNdYoJxwXo3TJHmXqQPbYT1GiAjZrA6PBmSg6Ao_qJRRpUWOldELfcy-BnOspJgLAlnzDReAvWl81trxmMouniLDkrfEvE-aRflhl2F9Q7sEdxtwQJYltU12b6vK8=s4800-w600-h400',
  'jackson-bbq-smokehouse':     'https://lh3.googleusercontent.com/places/ANXAkqGeiiExDe882BhrMWYmVynR4BHGTE5Dw8LJYcxKZgslktO-1BnqEK0LsbeawAEBeLvyeqEvYBWk3DfPGJzZE_nSiXgyVyqdCyc=s4800-w600-h400',
  'peach-tree-cafe':            'https://lh3.googleusercontent.com/place-photos/AJRVUZOwnirshoJ3fcyAWtbkuRYAppRA9m5hHGPJxfO3ETV4P0oPbPls5s_uC_p7KR4Jikh4ugmLwlh8zvZ3aLRD1_kdne5Hk6X9tQK2h6x2EcKCsprWPzBjirhi8VF9aAl-4Oh4daaIdkjlTWFKfQ=s4800-w600-h400',
  'el-rancho-mexican':          'https://lh3.googleusercontent.com/place-photos/AJRVUZMByvZwIBulFrklKAgO6s7r4dm576Kca5J7a2rVIv0TNFMATiX55mFR6IFqlKYuULPqH5AKUiGS60ylQ-6hvUSgL4ojT84kvvtmgVImke4mOW1-6JBhuFWMkQjGtThXHNjstulIQ35_Xy43XQ=s4800-w600-h400',
  'butts-county-family-health': 'https://lh3.googleusercontent.com/place-photos/AJRVUZMKy_yqsSGlPSHmcnQe-EMby5vmpznQiwrmgLhAV9e1wOJ24WujZWKEztTkQydL071j1-IJHAVnCa9j03L6n7FKW9kr4yBPz86LiqLCIbC16SfLMsTG01WLx6A82HEhcfldohV6UdXpfgpIplfQDQW2_Q=s4800-w600-h400',
  'jackson-dental-associates':  'https://lh3.googleusercontent.com/place-photos/AJRVUZOUxlQWZopXJcj9uHBS3tSq3CD40LV24elavBhkOcBxgHITAdXFBFtJ1pj2QeKa9v1yQpw29A4VFumYI3A9vOsHAVewECSz6S4tf2jKfPxHSd-eI3Mh9tXgFdFL9sC9gUMcA2LsCpA0cX_4zN8=s4800-w600-h400',
  'jackson-urgent-care':        'https://lh3.googleusercontent.com/places/ANXAkqEURG0OgkRk3rImaW6anByH_JrfDezSUzJLJXLHays2MOaYxS-E6Mx8aYQrQ58yN5MB33OwrlbKf6yOhkwvZe9WlmsL7tYrV2M=s4800-w480-h270',
  'jackson-auto-tire':          'https://lh3.googleusercontent.com/place-photos/AJRVUZOfhJSpFCYlPKhudVQPjTGuG4t3_EWypHdDLmLoE7oxyCCAXtnjNd14TgJEVCT8qeuq-vziLyu6Kmc07_aJxWpPSW-pHquoiFy1PogXraj2jgckPuEuZxY3RJaCfLzlIiRlAJZ7iUVuexmaRw=s4800-w600-h400',
  'butts-county-collision':     'https://lh3.googleusercontent.com/places/ANXAkqH4yQyEUrmxQ3IBLdR3QONJBXNPJadaR0wSsU6DXZ4XX3Y4-MNXWnYcdNudFivzu1vxrITarhKSYg12nYWFTJE8sUWMzxbbuQI=s4800-w600-h315',
  'magnolia-hair-studio':       'https://lh3.googleusercontent.com/places/ANXAkqH_bav10D6atTeJAVvYsYNiTpNJdKOlVZEGkZrJXC4SczTElTF8quTsMmBn58vCDiIYk6TpkzOuDv6od4sHdDHESlDXjNS0h1Q=s4800-w600-h400',
  'jackson-nail-spa':           'https://lh3.googleusercontent.com/places/ANXAkqGvGyofeW2W-oMwt6KurY7NMPD4XC03jlpsIGPB0ypQsJCvhMux6MUTtpf1ZZVM2q1Ytv__g-QzzVh6ig9XfmxJbItPmVKKkpc=s4800-w600-h400',
  'jackson-family-fitness':     'https://lh3.googleusercontent.com/place-photos/AJRVUZNFnonh3Gn6lA-Tlr5F14Wj6zz-WGJlbPiTMjuk5uX2LwWdpuJRZ4qi79LTNyr7oM4lBORPffrxfzHbrmRIwBv4UvEwJIijhwNwWk9yP6f47co4w9u9nrmkM1goFwYZCMqzp4SIT9r0ijzX8g=s4800-w600-h400',
  'georgia-green-lawn':         'https://lh3.googleusercontent.com/places/ANXAkqHfl4xSK9dTlRHXiWoDBcZGhdCMAzQcPODLRxOnG3fsIg-qgdXJY8GIoS0DrPDEacgd7pnPBUaKJSGQsFwu6PYAP0qzrkM12ZU=s4800-w600-h400',
  'jackson-animal-clinic':      'https://lh3.googleusercontent.com/places/ANXAkqEZKLAtkgpVQ_FtZzHQyp8Vqc86prrfiWQO3T86x83t-8ffquEVse8xL8cjsYmhy4_RoN2QpEbRf3fb2Ojns-W8BRzZb0V6fm0=s4800-w600-h400',
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log(`Downloading ${Object.keys(photos).length} images to images/ folder...\n`);
  let ok = 0, fail = 0;

  for (const [slug, url] of Object.entries(photos)) {
    const dest = path.join(IMAGES_DIR, `${slug}.jpg`);
    try {
      await download(url, dest);
      const kb = Math.round(fs.statSync(dest).size / 1024);
      console.log(`✓ ${slug}.jpg (${kb}KB)`);
      ok++;
    } catch (e) {
      console.error(`✗ ${slug}: ${e.message}`);
      fail++;
    }
    await wait(300);
  }

  console.log(`\n✅ Done! ${ok} downloaded, ${fail} failed.`);
  console.log(`\nNow run: node update-image-paths.js`);
  console.log(`This will update all HTML files to use local images instead of Google URLs.`);
}

run();
