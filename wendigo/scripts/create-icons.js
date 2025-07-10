#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple SVG icon template
const createSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0078d4"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" 
        fill="white" text-anchor="middle" dominant-baseline="central">W</text>
</svg>`;

const sizes = [16, 32, 64, 80];
const assetsDir = path.join(__dirname, '../assets');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Create SVG icons
sizes.forEach(size => {
    const svgContent = createSvgIcon(size);
    const svgPath = path.join(assetsDir, `icon-${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Created ${svgPath}`);
});

// Create a simple PNG fallback message
const pngNote = `The Office Add-in requires PNG icons. 
Please convert the SVG files to PNG using:
1. An online converter like https://cloudconvert.com/svg-to-png
2. Command line tools like ImageMagick: convert icon-32.svg icon-32.png
3. Or use the icon-generator.html file in this directory
`;

fs.writeFileSync(path.join(assetsDir, 'README.md'), pngNote);
console.log('\n📌 Note: Office Add-ins require PNG format. Please convert the SVG files to PNG.');
console.log('   See assets/README.md for instructions.');