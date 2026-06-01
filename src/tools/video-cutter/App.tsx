import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

const RESOLUTIONS = [
  { label: '原始', w: 0, h: 0 },
  { label: '1080p', w: 1920, h: 1080 },
  { label: '720p', w: 1280, h: 720 },
  { label: '480p', w: 854, h: 480 },
  { label: '360p', w: 640, h: 360 },
]

function App() {
  const { t } = useTranslation();
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [resolutionIdx, setResolutionIdx] = useState(0)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('webm')
  const [previewLoop, setPreviewLoop] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('video/')) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (exportUrl) URL.revokeObjectURL(exportUrl)
    setVideoFile(file)
    setExportUrl(null)
    setErrorMsg(null)
    setDuration(0)
    setVideoUrl(URL.createObjectURL(file))
    setStartTime(0)
    setEndTime(0)
  }

  const onLoadedMetadata = () => {
    if (!videoRef.current) return
    const dur = videoRef.current.duration
    setDuration(dur)
    setEndTime(dur)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      if (previewLoop && v.currentTime >= endTime) v.currentTime = startTime
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  const setStart = () => setStartTime(videoRef.current?.currentTime ?? 0)
  const setEnd = () => setEndTime(videoRef.current?.currentTime ?? duration)

  const seekToStart = () => { if (videoRef.current) videoRef.current.currentTime = startTime }
  const seekToEnd = () => { if (videoRef.current) videoRef.current.currentTime = endTime }

  const onTimeUpdate = () => {
    if (!videoRef.current) return
    const t = videoRef.current.currentTime
    setCurrentTime(t)
    if (previewLoop && t >= endTime) videoRef.current.currentTime = startTime
  }

  useEffect(() => { /* cleanup handled by component unmount */ }, [])

  const process = useCallback(async () => {
    const video = videoRef.current
    if (!video || startTime >= endTime) return
    setProcessing(true)
    setProgress(0)
    setExportUrl(null)
    setErrorMsg(null)

    try {
      const res = RESOLUTIONS[resolutionIdx]
      const outW = res.w || video.videoWidth
      const outH = res.h || video.videoHeight

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!

      const fps = 30
      const totalFrames = Math.ceil((endTime - startTime) * fps)
      const stream = canvas.captureStream(fps)
      const mimeType = exportFormat === 'mp4'
        ? (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm')
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm')

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 })
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      const exportPromise = new Promise<string>(resolve => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType })
          resolve(URL.createObjectURL(blob))
        }
      })

      recorder.start()

      for (let frame = 0; frame < totalFrames; frame++) {
        video.currentTime = startTime + frame / fps
        await new Promise<void>(r => { video.onseeked = () => r() })
        ctx.drawImage(video, 0, 0, outW, outH)
        setProgress(Math.round(((frame + 1) / totalFrames) * 100))
      }

      recorder.stop()
      const url = await exportPromise
      setExportUrl(url)
    } catch (e) { console.error(e); setErrorMsg('视频处理失败: ' + (e instanceof Error ? e.message : '未知错误')) }
    finally { setProcessing(false) }
  }, [startTime, endTime, resolutionIdx, exportFormat])

  const download = () => {
    if (exportUrl) {
      const a = document.createElement('a')
      a.href = exportUrl
      a.download = `cut-${Date.now()}.${exportFormat}`
      a.click()
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="app">
      <header><h1>{t('tools.video-cutter.title')}</h1><span>{t('tools.video-cutter.desc')}</span></header>
      <main>
        {!videoFile ? (
          <div className="drop-zone" onClick={() => {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*'
            inp.onchange = e => handleFile((e.target as HTMLInputElement).files![0]); inp.click()
          }}>
            <span className="drop-icon">+</span>
            <p>上传视频文件</p>
            <span className="hint">支持 MP4 / WebM / MOV</span>
          </div>
        ) : (
          <>
            <div className="file-bar">
              <span className="file-name">{videoFile.name}</span>
              <button className="btn sm" onClick={() => { setVideoFile(null); setVideoUrl(null); setExportUrl(null) }}>更换文件</button>
            </div>

            <div className="player-section">
              <video
                ref={videoRef}
                src={videoUrl!}
                className="video-player"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setPlaying(false)}
              />
              <div className="player-controls">
                <button className="btn sm" onClick={togglePlay}>{playing ? '暂停' : '播放'}</button>
                <button className="btn sm" onClick={seekToStart}>跳转起始</button>
                <button className="btn sm" onClick={setStart}>设为起始</button>
                <button className="btn sm" onClick={setEnd}>设为结束</button>
                <button className="btn sm" onClick={seekToEnd}>跳转结束</button>
                <label className="loop-label">
                  <input type="checkbox" checked={previewLoop} onChange={e => setPreviewLoop(e.target.checked)} />
                  循环预览
                </label>
                <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            </div>

            <div className="settings-row">
              <div className="setting">
                <label>起始</label>
                <input type="number" value={startTime} step="0.1" min="0" max={duration}
                  onChange={e => setStartTime(Math.min(+e.target.value, endTime))} />
                <span>{formatTime(startTime)}</span>
              </div>
              <div className="setting">
                <label>结束</label>
                <input type="number" value={endTime} step="0.1" min={startTime} max={duration}
                  onChange={e => setEndTime(Math.max(+e.target.value, startTime))} />
                <span>{formatTime(endTime)}</span>
              </div>
              <div className="setting">
                <label>分辨率</label>
                <select value={resolutionIdx} onChange={e => setResolutionIdx(+e.target.value)}>
                  {RESOLUTIONS.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
                </select>
              </div>
              <div className="setting">
                <label>格式</label>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'mp4' | 'webm')}>
                  <option value="webm">WebM</option>
                  <option value="mp4">MP4</option>
                </select>
              </div>
            </div>

            <div className="trim-info">
              截取 <strong>{formatTime(startTime)}</strong> - <strong>{formatTime(endTime)}</strong>（{formatTime(endTime - startTime)}）
            </div>

            {processing && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
                <span>{progress}%</span>
              </div>
            )}
            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            {exportUrl && (
              <div className="export-preview">
                <h4>导出预览</h4>
                <video src={exportUrl} controls className="export-video" />
              </div>
            )}

            <div className="actions">
              <button className="btn primary" onClick={process} disabled={processing || startTime >= endTime}>
                {processing ? `处理中 ${progress}%` : '裁剪导出'}
              </button>
              {exportUrl && <button className="btn primary" onClick={download}>下载</button>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App