#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const certsDir = path.join(__dirname, '../certs')
const certPath = path.join(certsDir, 'localhost.pem')
const keyPath = path.join(certsDir, 'localhost-key.pem')

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true })
}

// Check if certificates already exist
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificates already exist')
  console.log(`   Certificate: ${certPath}`)
  console.log(`   Key: ${keyPath}`)
  process.exit(0)
}

console.log('🔐 Generating self-signed certificates for local development...')

try {
  // Check if mkcert is installed
  try {
    execSync('mkcert --version', { stdio: 'ignore' })
  } catch (error) {
    console.log('⚠️  mkcert is not installed.')
    console.log('')
    console.log('Please install mkcert first:')
    console.log('  macOS: brew install mkcert')
    console.log('  Windows: choco install mkcert')
    console.log('  Linux: https://github.com/FiloSottile/mkcert#installation')
    console.log('')
    console.log('After installing mkcert, run:')
    console.log('  mkcert -install')
    console.log('')
    process.exit(1)
  }

  // Generate certificates using mkcert
  console.log('📝 Generating certificates with mkcert...')
  execSync(`mkcert -cert-file "${certPath}" -key-file "${keyPath}" localhost 127.0.0.1 ::1`, {
    stdio: 'inherit'
  })

  console.log('')
  console.log('✅ Certificates generated successfully!')
  console.log(`   Certificate: ${certPath}`)
  console.log(`   Key: ${keyPath}`)
  console.log('')
  console.log('📌 These certificates are trusted by your system.')
  console.log('   Excel add-ins will load without security warnings.')
  
  // Add certs directory to .gitignore if not already there
  const gitignorePath = path.join(__dirname, '../.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    if (!gitignoreContent.includes('certs/')) {
      fs.appendFileSync(gitignorePath, '\n# SSL certificates\ncerts/\n')
      console.log('')
      console.log('📝 Added certs/ to .gitignore')
    }
  }
  
} catch (error) {
  console.error('❌ Failed to generate certificates:', error.message)
  console.log('')
  console.log('Alternative: Generate certificates manually with OpenSSL:')
  console.log('')
  console.log('openssl req -x509 -newkey rsa:4096 -keyout localhost-key.pem \\')
  console.log('  -out localhost.pem -days 365 -nodes -subj "/CN=localhost"')
  console.log('')
  process.exit(1)
}