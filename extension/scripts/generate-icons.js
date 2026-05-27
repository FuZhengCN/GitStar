const sharp = require('sharp');
const path = require('path');

const svg = path.join(__dirname, '..', 'assets', 'icon.svg');
const assets = path.join(__dirname, '..', 'assets');

async function generate() {
  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(assets, `icon${size}.png`));
    console.log(`Generated icon${size}.png`);
  }
  // Also create a default icon.png (128px)
  await sharp(svg)
    .resize(128, 128)
    .png()
    .toFile(path.join(assets, 'icon.png'));
  console.log('Generated icon.png');
}

generate().catch(console.error);
