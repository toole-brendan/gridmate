const fs = require('fs');
const path = require('path');

// Simple script to copy the PNG as a fallback favicon
// Note: For a proper ICO file, you'd need a library like 'sharp' or 'jimp'
// But most modern browsers support PNG favicons

const sourceFile = path.join(__dirname, '../web-app/public/gridmate_icon.png');
const destFile = path.join(__dirname, '../web-app/public/favicon.ico');

// Check if source file exists
if (fs.existsSync(sourceFile)) {
  // Copy the PNG file as favicon.ico (browsers will handle it)
  fs.copyFileSync(sourceFile, destFile);
  console.log('✅ Created favicon.ico from gridmate_icon.png');
  console.log('Note: This is a PNG file renamed to .ico for compatibility.');
  console.log('Most modern browsers will handle this correctly.');
} else {
  console.error('❌ Source file not found:', sourceFile);
  process.exit(1);
} 