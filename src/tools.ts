export interface Tool {
  id: string
  name: string
  emoji: string
  description: string
  category: string
}

export interface ToolCategory {
  id: string
  name: string
  color: string
  tools: Tool[]
}

const tools: Tool[] = [
  // ===== 图片媒体 =====
  { id: 'react-image', name: '图片编辑器', emoji: '🖼️', description: '图片裁剪/旋转/格式转换/压缩', category: '图片媒体' },
  { id: 'meme-generator', name: '表情包生成器', emoji: '🤣', description: '上传底图添加经典表情包文字', category: '图片媒体' },
  { id: 'grid-slicer', name: '九宫格切图', emoji: '🔲', description: '上传图片切成 2×2/3×3/4×4 网格', category: '图片媒体' },
  { id: 'pixel-painter', name: '像素画绘制', emoji: '🎨', description: '像素网格绘制，调色板选色导出 PNG', category: '图片媒体' },
  { id: 'poster-designer', name: '简易海报设计', emoji: '📜', description: '拖拽添加文字/图片/形状设计海报', category: '图片媒体' },
  { id: 'watermark-tool', name: '水印工具', emoji: '💧', description: '文字/图片水印批量处理', category: '图片媒体' },

  // ===== 音视频 =====
  { id: 'screen-recorder', name: '屏幕录制', emoji: '🎥', description: '录制屏幕区域生成视频文件', category: '音视频' },
  { id: 'gif-maker', name: 'GIF 制作', emoji: '🎞️', description: '图片/视频转 GIF 动图', category: '音视频' },
  { id: 'audio-editor', name: '音频剪辑', emoji: '🎵', description: '音频裁剪/合并/淡入淡出', category: '音视频' },
  { id: 'video-cutter', name: '视频裁剪', emoji: '✂️', description: '快速裁剪视频片段', category: '音视频' },

  // ===== 文档办公 =====
  { id: 'pdf-toolbox', name: 'PDF 工具箱', emoji: '📄', description: 'PDF 合并/拆分/压缩/水印', category: '文档办公' },
  { id: 'markdown-editor', name: 'Markdown 编辑器', emoji: '📝', description: 'Markdown 实时预览编辑', category: '文档办公' },
  { id: 'mind-map', name: '思维导图', emoji: '🧠', description: '可视化思维导图创建与编辑', category: '文档办公' },
  { id: 'whiteboard', name: '白板/画板', emoji: '🖌️', description: '自由涂鸦、标注与协作白板', category: '文档办公' },

  // ===== 开发辅助 =====
  { id: 'json-formatter', name: 'JSON 格式化', emoji: '📋', description: 'JSON 美化/压缩/JWT 解析', category: '开发辅助' },
  { id: 'regex-tester', name: '正则测试器', emoji: '🔍', description: '正则表达式在线测试与调试', category: '开发辅助' },
  { id: 'color-converter', name: '颜色转换器', emoji: '🌈', description: 'HEX/RGB/HSL/HWB 互转', category: '开发辅助' },
  { id: 'base64-tool', name: 'Base64 编解码', emoji: '🔐', description: 'Base64 编码/解码文本与文件', category: '开发辅助' },
  { id: 'timestamp-converter', name: '时间戳转换', emoji: '⏱️', description: 'Unix 时间戳与日期互转', category: '开发辅助' },
  { id: 'qr-generator', name: '二维码生成器', emoji: '📱', description: '文本/链接转二维码图片', category: '开发辅助' },
  { id: 'xlsx-to-sql', name: 'Excel转SQL', emoji: '📊', description: 'Excel转SQL', category: '开发辅助' },

  // ===== 效率工具 =====
  { id: 'unit-converter', name: '单位换算器', emoji: '📐', description: '长度/重量/温度/面积等换算', category: '效率工具' },
  { id: 'password-generator', name: '密码生成器', emoji: '🔑', description: '随机安全密码批量生成', category: '效率工具' },
  { id: 'todo-list', name: '待办清单', emoji: '✅', description: '本地待办事项管理与提醒', category: '效率工具' },
  { id: 'calculator', name: '多功能计算器', emoji: '🧮', description: '标准计算/科学计算', category: '效率工具' },
]

export const categories: ToolCategory[] = [
  {
    id: '图片媒体',
    name: '图片媒体',
    color: 'var(--cat-media)',
    tools: tools.filter((t) => t.category === '图片媒体'),
  },
  {
    id: '音视频',
    name: '音视频',
    color: 'var(--cat-video)',
    tools: tools.filter((t) => t.category === '音视频'),
  },
  {
    id: '文档办公',
    name: '文档办公',
    color: 'var(--cat-doc)',
    tools: tools.filter((t) => t.category === '文档办公'),
  },
  {
    id: '开发辅助',
    name: '开发辅助',
    color: 'var(--cat-dev)',
    tools: tools.filter((t) => t.category === '开发辅助'),
  },
  {
    id: '效率工具',
    name: '效率工具',
    color: 'var(--cat-util)',
    tools: tools.filter((t) => t.category === '效率工具'),
  },
]

export default tools