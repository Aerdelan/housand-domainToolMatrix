const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const BASE_DIR = path.resolve(__dirname, '..', '..')
const HUB_DIR = path.resolve(__dirname, '..')
const TOOLS_DIR = path.join(HUB_DIR, 'public', 'tools')

const TOOLS = [
  'react-image',
  'json-formatter',
  'regex-tester',
  'color-converter',
  'base64-tool',
  'timestamp-converter',
  'unit-converter',
  'password-generator',
  'todo-list',
  'calculator',
  'qr-generator',
  'pdf-toolbox',
  'markdown-editor',
  'mind-map',
  'whiteboard',
  'screen-recorder',
  'gif-maker',
  'audio-editor',
  'video-cutter',
  'watermark-tool',
  'meme-generator',
  'grid-slicer',
  'pixel-painter',
  'poster-designer',
]

function run(cmd, cwd) {
  console.log(`\n[EXEC] ${cmd}`)
  console.log(`[CWD]  ${cwd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function copyDir(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true })
  }
  fs.mkdirSync(dest, { recursive: true })

  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// Step 1: Build all sub-tools
console.log('========================================')
console.log('  Step 1: Building all sub-tools')
console.log('========================================')

const failures = []

for (const tool of TOOLS) {
  const toolDir = path.join(BASE_DIR, tool)
  console.log(`\n--- Building: ${tool} ---`)
  try {
    run('npm run build', toolDir)
    const srcDist = path.join(toolDir, 'dist')
    const destDir = path.join(TOOLS_DIR, tool)
    copyDir(srcDist, destDir)
    console.log(`  [OK] Copied dist -> ${destDir}`)
  } catch (err) {
    console.error(`  [FAIL] ${tool} build failed: ${err.message}`)
    failures.push(tool)
  }
}

// Step 2: Build tool-hub itself
console.log('\n========================================')
console.log('  Step 2: Building tool-hub')
console.log('========================================')

try {
  run('npm run build', HUB_DIR)
} catch (err) {
  console.error(`\n[FAIL] tool-hub build failed: ${err.message}`)
  process.exit(1)
}

// Summary
console.log('\n========================================')
console.log('  Build Summary')
console.log('========================================')
console.log(`Total tools: ${TOOLS.length}`)
console.log(`Succeeded:   ${TOOLS.length - failures.length}`)
console.log(`Failed:      ${failures.length}`)

if (failures.length > 0) {
  console.log(`Failed tools: ${failures.join(', ')}`)
}

console.log('\nOutput: ' + path.join(HUB_DIR, 'dist'))