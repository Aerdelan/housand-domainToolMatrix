import { useState, useRef, useCallback, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import './App.css'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation();
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [exportFormat, setExportFormat] = useState<'mp3' | 'wav'>('mp3')
  const [playing, setPlaying] = useState(false)
  const [trimming, setTrimming] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4a6cf7',
      progressColor: '#7b5cf7',
      cursorColor: '#ff6b6b',
      height: 120,
      barWidth: 3,
      barGap: 1,
      barRadius: 3,
      backend: 'WebAudio',
    })

    ws.on('ready', () => {
      const dur = ws.getDuration()
      setDuration(dur)
      setEndTime(dur)
    })
    ws.on('audioprocess', (t) => setCurrentTime(t))
    ws.on('finish', () => setPlaying(false))

    wavesurferRef.current = ws
    return () => ws.destroy()
  }, [])

  useEffect(() => {
    if (audioUrl && wavesurferRef.current) {
      wavesurferRef.current.load(audioUrl)
    }
  }, [audioUrl])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/')) return
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (exportUrl) URL.revokeObjectURL(exportUrl)
    setAudioFile(file)
    setExportUrl(null)
    setErrorMsg(null)
    setAudioUrl(URL.createObjectURL(file))
  }

  const togglePlay = () => {
    if (!wavesurferRef.current) return
    wavesurferRef.current.playPause()
    setPlaying(!playing)
  }

  const setStart = () => { setStartTime(currentTime); wavesurferRef.current?.setTime(currentTime) }
  const setEnd = () => { setEndTime(currentTime); wavesurferRef.current?.setTime(currentTime) }

  const trim = useCallback(async () => {
    if (!audioFile || startTime >= endTime) return
    setTrimming(true)
    setExportUrl(null)
    setErrorMsg(null)

    try {
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(startTime * sampleRate)
      const endSample = Math.floor(endTime * sampleRate)
      const length = endSample - startSample
      const trimmed = audioCtx.createBuffer(audioBuffer.numberOfChannels, length, sampleRate)

      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        trimmed.getChannelData(ch).set(audioBuffer.getChannelData(ch).subarray(startSample, endSample))
      }

      if (exportFormat === 'wav') {
        const wav = encodeWAV(trimmed)
        setExportUrl(URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })))
      } else {
        const wav = encodeWAV(trimmed)
        const mp3Blob = await encodeMP3(wav, sampleRate)
        setExportUrl(URL.createObjectURL(mp3Blob))
      }

      audioCtx.close()
    } catch (e) { console.error(e); setErrorMsg('音频处理失败: ' + (e instanceof Error ? e.message : '未知错误')) }
    finally { setTrimming(false) }
  }, [audioFile, startTime, endTime, exportFormat])

  const download = () => {
    if (exportUrl) {
      const a = document.createElement('a')
      a.href = exportUrl
      a.download = `trimmed-${Date.now()}.${exportFormat}`
      a.click()
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
    const ms = Math.floor((s % 1) * 1000)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  }

  return (
    <div className="app">
      <header><h1>{t('tools.audio-editor.title')}</h1><span>{t('tools.audio-editor.desc')}</span></header>
      <main>
        <div className="upload-area">
          {!audioFile ? (
            <div className="drop-zone" onClick={() => {
              const inp = document.createElement('input')
              inp.type = 'file'; inp.accept = 'audio/*'
              inp.onchange = e => handleFile((e.target as HTMLInputElement).files![0])
              inp.click()
            }}>
              <span className="drop-icon">+</span>
              <p>上传音频文件</p>
              <span className="hint">支持 MP3 / WAV / OGG</span>
            </div>
          ) : (
            <div className="file-info">
              <span className="file-name">{audioFile.name}</span>
              <button className="btn sm" onClick={() => { setAudioFile(null); setAudioUrl(null); setExportUrl(null) }}>更换文件</button>
            </div>
          )}
        </div>

        {audioUrl && (
          <>
            <div className="waveform-container">
              <div ref={waveformRef} className="waveform" />
              <div className="wave-controls">
                <button className="btn sm" onClick={togglePlay}>{playing ? '暂停' : '播放'}</button>
                <button className="btn sm" onClick={setStart}>设为起始</button>
                <button className="btn sm" onClick={setEnd}>设为结束</button>
              </div>
            </div>

            <div className="trim-settings">
              <div className="setting-row">
                <label>起始时间</label>
                <input type="number" value={startTime} step="0.001" min="0" max={duration}
                  onChange={e => setStartTime(Math.min(+e.target.value, endTime))} />
                <span>{formatTime(startTime)}</span>
              </div>
              <div className="setting-row">
                <label>结束时间</label>
                <input type="number" value={endTime} step="0.001" min={startTime} max={duration}
                  onChange={e => setEndTime(Math.max(+e.target.value, startTime))} />
                <span>{formatTime(endTime)}</span>
              </div>
              <div className="setting-row">
                <label>导出格式</label>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'mp3' | 'wav')}>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                </select>
              </div>
            </div>

            <div className="trim-summary">
              将截取 <strong>{formatTime(startTime)}</strong> 至 <strong>{formatTime(endTime)}</strong>（时长 {formatTime(endTime - startTime)}）
            </div>
            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            <div className="actions">
              <button className="btn primary" onClick={trim} disabled={trimming || startTime >= endTime}>
                {trimming ? '处理中...' : '裁剪并导出'}
              </button>
              {exportUrl && <button className="btn primary" onClick={download}>下载 {exportFormat.toUpperCase()}</button>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function encodeWAV(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitsPerSample = 16
  const data = buffer.getChannelData(0)
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8
  const dataSize = data.length * numChannels * bitsPerSample / 8
  const headerSize = 44
  const totalSize = headerSize + dataSize
  const buf = new ArrayBuffer(totalSize)
  const view = new DataView(buf)

  writeString(view, 0, 'RIFF'); view.setUint32(4, totalSize - 8, true); writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data'); view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]))
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    view.setInt16(offset, intSample, true)
    offset += 2
    if (numChannels === 2 && i < buffer.getChannelData(1).length) {
      const s2 = Math.max(-1, Math.min(1, buffer.getChannelData(1)[i]))
      view.setInt16(offset, s2 < 0 ? s2 * 0x8000 : s2 * 0x7FFF, true)
      offset += 2
    }
  }
  return buf
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

async function encodeMP3(wavData: ArrayBuffer, sampleRate: number): Promise<Blob> {
  const { Mp3Encoder } = await import('lamejs')
  const wav = new Int16Array(wavData, 44)
  const left: number[] = []
  for (let i = 0; i < wav.length; i++) left.push(wav[i] / 32768.0)
  const encoder = new Mp3Encoder(1, sampleRate, 128)
  const mp3buf = encoder.encodeBuffer(...left.map(s => s))
  const end = encoder.flush()
  const final = new Uint8Array(mp3buf.length + end.length)
  final.set(mp3buf)
  final.set(end, mp3buf.length)
  return new Blob([final], { type: 'audio/mp3' })
}

export default App