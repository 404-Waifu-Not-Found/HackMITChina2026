import fs from 'node:fs';
import path from 'node:path';

const sourceLogoPath = path.resolve('logo.png');
const targetLogoPaths = [path.resolve('docs/public/logo.png'), path.resolve('extension/logo.png')];

if (!fs.existsSync(sourceLogoPath)) {
  throw new Error('Root logo.png not found.');
}

const sourceLogo = fs.readFileSync(sourceLogoPath);

for (const targetPath of targetLogoPaths) {
  fs.writeFileSync(targetPath, sourceLogo);
}

console.log(`Synced ${path.basename(sourceLogoPath)} to docs and extension.`);
