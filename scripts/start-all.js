import { concurrently } from 'concurrently'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_DIR = path.resolve(__dirname, '..', '..')

const COLORS = [
  'cyan', 'yellow', 'green', 'blue', 'magenta',
  'red', 'white', 'gray', 'cyanBright', 'yellowBright',
  'greenBright', 'blueBright', 'magentaBright', 'redBright',
  'cyan', 'yellow', 'green', 'blue', 'magenta',
  'red', 'white', 'gray', 'cyanBright', 'yellowBright',
]

const tools = [
  { name: 'tool-hub',         dir: 'tool-hub' },
  { name: 'react-image',      dir: 'react-image' },
  { name: 'json-formatter',   dir: 'json-formatter' },
  { name: 'regex-tester',     dir: 'regex-tester' },
  { name: 'color-converter',  dir: 'color-converter' },
  { name: 'base64-tool',      dir: 'base64-tool' },
  { name: 'timestamp-converter', dir: 'timestamp-converter' },
  { name: 'unit-converter',   dir: 'unit-converter' },
  { name: 'password-generator', dir: 'password-generator' },
  { name: 'todo-list',        dir: 'todo-list' },
  { name: 'calculator',       dir: 'calculator' },
  { name: 'qr-generator',     dir: 'qr-generator' },
  { name: 'pdf-toolbox',      dir: 'pdf-toolbox' },
  { name: 'markdown-editor',  dir: 'markdown-editor' },
  { name: 'mind-map',         dir: 'mind-map' },
  { name: 'whiteboard',       dir: 'whiteboard' },
  { name: 'screen-recorder',  dir: 'screen-recorder' },
  { name: 'gif-maker',        dir: 'gif-maker' },
  { name: 'audio-editor',     dir: 'audio-editor' },
  { name: 'video-cutter',     dir: 'video-cutter' },
  { name: 'watermark-tool',   dir: 'watermark-tool' },
  { name: 'meme-generator',   dir: 'meme-generator' },
  { name: 'grid-slicer',      dir: 'grid-slicer' },
  { name: 'pixel-painter',    dir: 'pixel-painter' },
  { name: 'poster-designer',  dir: 'poster-designer' },
]

const commands = tools.map((t, i) => ({
  command: 'npm run dev',
  name: t.name,
  cwd: path.join(BASE_DIR, t.dir),
  prefixColor: COLORS[i % COLORS.length],
}))

console.log(`Starting ${commands.length} dev servers (max 10 concurrent)...\n`)

concurrently(commands, {
  maxProcesses: 10,
  prefix: 'name',
  timestampFormat: 'HH:mm:ss',
  killOthers: ['failure'],
}).catch(() => {
  process.exit(1)
})