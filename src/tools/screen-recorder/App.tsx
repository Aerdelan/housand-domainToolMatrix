import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [time, setTime] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm')
  const previewRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError('')
      setVideoUrl(null)
      const displayOptions = { video: { displaySurface: 'monitor' } as MediaTrackConstraints, audio: audioEnabled }
      const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions)

      if (audioEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          stream.addTrack(audioStream.getAudioTracks()[0])
        } catch {}
      }

      streamRef.current = stream
      if (previewRef.current) previewRef.current.srcObject = stream

      const mimeType = format === 'mp4'
        ? (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm')
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm')

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setVideoUrl(URL.createObjectURL(blob))
        setRecording(false)
        setPaused(false)
        clearInterval(timerRef.current)
      }

      stream.getVideoTracks()[0].onended = () => stopRecording()

      recorder.start(200)
      setRecording(true)
      setPaused(false)
      setTime(0)
      timerRef.current = window.setInterval(() => setTime(t => t + 1), 1000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '无法开始录制')
    }
  }, [audioEnabled, format])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (previewRef.current) previewRef.current.srcObject = null
    clearInterval(timerRef.current)
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setPaused(true)
      clearInterval(timerRef.current)
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setPaused(false)
      timerRef.current = window.setInterval(() => setTime(t => t + 1), 1000)
    }
  }, [])

  useEffect(() => () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const download = () => {
    if (videoUrl) {
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = `recording-${Date.now()}.${format}`
      a.click()
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.screen-recorder.title')}</h1>
        <span className="subtitle">{t('tools.screen-recorder.desc')}</span>
      </header>
      <main>
        <div className="controls">
          <div className="control-group">
            <label>录制格式</label>
            <select value={format} onChange={e => setFormat(e.target.value as 'webm' | 'mp4')}>
              <option value="webm">WebM</option>
              <option value="mp4">MP4</option>
            </select>
          </div>
          <div className="control-group">
            <label>
              <input type="checkbox" checked={audioEnabled} onChange={e => setAudioEnabled(e.target.checked)} />
              录制系统音频
            </label>
          </div>
        </div>

        <div className="preview-area">
          {!recording && !videoUrl && <div className="placeholder">点击下方按钮开始录制屏幕</div>}
          <video ref={previewRef} autoPlay muted className={`preview ${recording && !videoUrl ? 'active' : ''}`} />
          {videoUrl && <video src={videoUrl} controls className="preview active" />}
        </div>

        {recording && <div className="timer">{formatTime(time)}</div>}

        {error && <div className="error">{error}</div>}

        <div className="actions">
          {!recording ? (
            <button className="btn primary" onClick={startRecording}>开始录制</button>
          ) : paused ? (
            <>
              <button className="btn primary" onClick={resumeRecording}>继续录制</button>
              <button className="btn danger" onClick={stopRecording}>停止</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={pauseRecording}>暂停</button>
              <button className="btn danger" onClick={stopRecording}>停止</button>
            </>
          )}
          {videoUrl && <button className="btn primary" onClick={download}>下载 {format.toUpperCase()}</button>}
        </div>
      </main>
    </div>
  )
}

export default App