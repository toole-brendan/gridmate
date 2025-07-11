#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const manifestPath = path.join(__dirname, '../manifest.xml')

function sideloadWindows() {
  console.log('📋 Side-loading Gridmate add-in on Windows...')
  
  // Check if manifest exists
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.xml not found!')
    process.exit(1)
  }

  console.log('')
  console.log('Please follow these steps:')
  console.log('')
  console.log('1. Open Excel')
  console.log('2. Go to: Insert > Add-ins > My Add-ins')
  console.log('3. Click "Manage My Add-ins" > "Upload My Add-in"')
  console.log(`4. Browse to: ${manifestPath}`)
  console.log('5. Click "Upload"')
  console.log('')
  console.log('The Gridmate button will appear in the Home tab.')
  
  // Attempt to open the manifest folder
  try {
    execSync(`explorer.exe /select,"${manifestPath}"`)
    console.log('✅ Opened manifest folder in Explorer')
  } catch (error) {
    // Ignore errors
  }
}

function sideloadMac() {
  console.log('📋 Side-loading Gridmate add-in on macOS...')
  
  const wefPath = path.join(
    os.homedir(),
    'Library/Containers/com.microsoft.Excel/Data/Documents/wef'
  )
  
  // Create wef directory if it doesn't exist
  if (!fs.existsSync(wefPath)) {
    fs.mkdirSync(wefPath, { recursive: true })
    console.log('✅ Created add-ins directory')
  }
  
  // Copy manifest
  const destPath = path.join(wefPath, 'gridmate-manifest.xml')
  try {
    fs.copyFileSync(manifestPath, destPath)
    console.log(`✅ Copied manifest to: ${destPath}`)
  } catch (error) {
    console.error('❌ Failed to copy manifest:', error.message)
    process.exit(1)
  }
  
  console.log('')
  console.log('Next steps:')
  console.log('1. Open Excel')
  console.log('2. Go to: Insert > Add-ins > My Add-ins')
  console.log('3. You should see "Gridmate - AI Financial Assistant"')
  console.log('4. Click to add it')
  console.log('')
  console.log('The Gridmate button will appear in the Home tab.')
  
  // Try to open Excel
  try {
    execSync('open -a "Microsoft Excel"')
    console.log('✅ Opened Excel')
  } catch (error) {
    console.log('📝 Please open Excel manually')
  }
}

function sideloadLinux() {
  console.log('📋 Side-loading on Linux...')
  console.log('')
  console.log('Excel add-ins are only supported on Windows and macOS.')
  console.log('For Linux users, consider:')
  console.log('1. Using Excel Online (limited add-in support)')
  console.log('2. Running Excel in a Windows VM')
  console.log('3. Using the Gridmate desktop app directly')
}

function main() {
  console.log('🚀 Gridmate Excel Add-in Side-loader')
  console.log('===================================')
  console.log('')
  
  // Check if Gridmate is running
  try {
    const response = execSync('curl -s http://localhost:3000/health', { encoding: 'utf8' })
    console.log('✅ Gridmate server is running')
  } catch (error) {
    console.log('⚠️  Gridmate server is not running')
    console.log('   Please start it with: npm run dev')
    console.log('')
  }
  
  const platform = os.platform()
  
  switch (platform) {
    case 'win32':
      sideloadWindows()
      break
    case 'darwin':
      sideloadMac()
      break
    case 'linux':
      sideloadLinux()
      break
    default:
      console.error(`Unsupported platform: ${platform}`)
      process.exit(1)
  }
  
  console.log('')
  console.log('📚 For troubleshooting, see: docs/excel-sideload.md')
}

main()