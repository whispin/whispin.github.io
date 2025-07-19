<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as THREE from 'three'
import { ParticleSystemManager } from './particle-system/ParticleSystemManager'
import { ForegroundLayer } from './particle-system/layers/ForegroundLayer'
import { MidgroundLayer } from './particle-system/layers/MidgroundLayer'
import { BackgroundLayer } from './particle-system/layers/BackgroundLayer'

import { SimpleParticleSystem } from './particle-system/simple/SimpleParticleSystem'
import { errorHandler, ErrorSeverity } from './utils/ErrorHandler'
import { ColorSystem } from './particle-system/utils/ColorSystem'


// 终端状态
const terminalInput = ref('')
const currentPath = ref('C:\\Users\\whispin')
const cursorVisible = ref(true)
const isTyping = ref(false)

// 拖拽状态
const isDragging = ref(false)
const terminalPosition = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

// Three.js 相关
const threeContainer = ref<HTMLElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let particleSystemManager: ParticleSystemManager

let simpleParticleSystem: SimpleParticleSystem
let animationId: number | undefined
let mouse = { x: 0, y: 0 }
let time = 0

// 声明全局测试粒子变量
declare global {
  interface Window {
    testParticles?: THREE.Points
  }
}

// Store WebGL context event handlers for proper cleanup
let webglContextLostHandler: ((event: Event) => void) | undefined
let webglContextRestoredHandler: (() => void) | undefined

// Store cursor blink interval for cleanup
let cursorBlinkIntervalId: number | undefined

// 主题配置
const themes = {
  classic: { bg: 'bg-black', text: 'text-white', accent: 'text-green-400' },
  green: { bg: 'bg-black', text: 'text-green-400', accent: 'text-green-300' },
  amber: { bg: 'bg-black', text: 'text-amber-400', accent: 'text-amber-300' },
  blue: { bg: 'bg-blue-950', text: 'text-blue-100', accent: 'text-blue-300' },
  purple: { bg: 'bg-purple-950', text: 'text-purple-100', accent: 'text-purple-300' }
}
const currentTheme = ref('classic')

// 终端输出历史
interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'info'
  content: string
  timestamp?: string
}

const terminalOutput = ref<TerminalLine[]>([])
const inputRef = ref<HTMLInputElement>()
const particlesRef = ref<HTMLElement>()

// 计算当前主题样式
const themeClasses = computed(() => themes[currentTheme.value as keyof typeof themes])

// 启动光标闪烁
onMounted(() => {
  cursorBlinkIntervalId = setInterval(() => {
    if (!isTyping.value) {
      cursorVisible.value = !cursorVisible.value
    }
  }, 500)

  // 初始化真实色彩系统
  ColorSystem.initialize()

  // 显示启动信息
  showStartupInfo()

  // 聚焦输入框 - 延迟聚焦避免阻塞
  nextTick(() => {
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  })
  
  // 初始化Three.js场景
  initThreeJS()
  
  // CSS粒子特效已被Three.js系统替代
})

// Three.js 初始化
const initThreeJS = () => {
  
  if (!threeContainer.value) {
    console.error('Three.js container not found!')
    return
  }

  try {
    // 检查WebGL支持
    const testCanvas = document.createElement('canvas')
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS particles only')
      return
    }

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5

    // 创建渲染器 - 优化配置
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: window.innerWidth > 640 && window.devicePixelRatio <= 2, // 高DPI设备关闭抗锯齿以提升性能
      powerPreference: "high-performance",
      preserveDrawingBuffer: false, // 性能优化
      failIfMajorPerformanceCaveat: false // 兼容性优化
    })

    // 优化渲染器设置
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    // 强制设置为全屏尺寸 - 优化像素比处理
    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = Math.min(window.devicePixelRatio, 2) // 限制最大像素比为2
    
    renderer.setSize(width, height, false) // false = 不更新样式
    renderer.setPixelRatio(pixelRatio)

    // 确保canvas样式正确 - 使用更强制的样式设置
    const canvas = renderer.domElement
    canvas.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: -1 !important;
      pointer-events: none !important;
      display: block !important;
    `


    threeContainer.value.appendChild(canvas)

    // 调试信息
    
    // 添加WebGL上下文丢失处理
    webglContextLostHandler = (event: Event) => {
      event.preventDefault()
      console.warn('WebGL context lost')
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = undefined
      }
    }
    
    webglContextRestoredHandler = () => {
      initThreeJS()
    }
    
    renderer.domElement.addEventListener('webglcontextlost', webglContextLostHandler)
    renderer.domElement.addEventListener('webglcontextrestored', webglContextRestoredHandler)
    


    // 创建简单的粒子系统
    createSimpleParticleSystem()



    // 创建新的模块化粒子系统
    createNewParticleSystem()

    // 初始化增强交互系统
    try {
      particleSystemManager.initializeInteraction(camera)
    } catch (error) {
      console.error('Error initializing interaction system:', error)
    }

    // 初始化渲染优化器
    try {
      particleSystemManager.initializeRenderOptimizer(camera)
    } catch (error) {
      console.error('Error initializing render optimizer:', error)
    }

    // 保留旧的鼠标交互作为备用
    setupMouseInteraction()
    
    // 开始动画循环
    animate()
    
    // 监听窗口大小变化
    window.addEventListener('resize', onWindowResize)
    
  } catch (error) {
    console.error('Three.js initialization failed:', error)
  }
}

// 创建简单的测试粒子系统
const createSimpleTestParticleSystem = () => {

  try {
    // 创建简单的粒子几何体
    const particleCount = 1000
    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // 随机位置
      positions[i3] = (Math.random() - 0.5) * 200
      positions[i3 + 1] = (Math.random() - 0.5) * 200
      positions[i3 + 2] = (Math.random() - 0.5) * 200

      // 随机颜色
      colors[i3] = Math.random()
      colors[i3 + 1] = Math.random()
      colors[i3 + 2] = Math.random()

      // 随机大小
      sizes[i] = Math.random() * 5 + 1
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // 创建简单的材质 - 使用纹理让粒子显示为圆形
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')!

    // 绘制圆形纹理
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)

    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 3,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.001
    })

    // 创建粒子系统
    const particles = new THREE.Points(geometry, material)
    scene.add(particles)


    // 存储到全局变量以便动画更新
    window.testParticles = particles

  } catch (error) {
    console.error('Error creating simple test particle system:', error)
  }
}

// 创建简单的粒子系统
const createSimpleParticleSystem = () => {
  
  try {
    simpleParticleSystem = new SimpleParticleSystem(scene)
    simpleParticleSystem.initialize()
  } catch (error) {
    console.error('Error creating simple particle system:', error)
  }
}



// 创建新的增强粒子系统
const createNewParticleSystem = () => {

  // 先尝试简单的测试系统
  createSimpleTestParticleSystem()

  try {
    // 初始化粒子系统管理器
    particleSystemManager = new ParticleSystemManager(scene)

    particleSystemManager.initialize()

    // 创建远景层（先添加，在最后面渲染）
    const backgroundLayer = new BackgroundLayer()
    particleSystemManager.addLayer(backgroundLayer)

    // 创建中景层
    const midgroundLayer = new MidgroundLayer()
    particleSystemManager.addLayer(midgroundLayer)

    // 创建前景层（最后添加，在最前面渲染）
    const foregroundLayer = new ForegroundLayer()
    particleSystemManager.addLayer(foregroundLayer)


    particleSystemManager.debugInfo()
  } catch (error) {
    console.error('Error creating particle system:', error)

    // 显示错误信息给用户
    if (terminalOutput.value) {
      terminalOutput.value.push({
        type: 'error',
        content: 'Failed to initialize 3D particle system. Using fallback mode.'
      })
    }
  }
}



// 鼠标交互设置（已被InteractionManager替代，保留用于兼容性）
const setupMouseInteraction = () => {
  const handleMouseMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  }
  
  window.addEventListener('mousemove', handleMouseMove)
}

// 动画循环
const animate = () => {
  try {
    animationId = requestAnimationFrame(animate)
    
    const currentTime = Date.now() * 0.001
    const deltaTime = currentTime - time
    time = currentTime
    
    // 更新测试立方体（暂时注释掉）
    // const testCube = scene.getObjectByName('testCube') || scene.children.find(child => child.type === 'Mesh')
    // if (testCube) {
    //   testCube.rotation.x += 0.01
    //   testCube.rotation.y += 0.01
    // }

    // 统一粒子系统更新 - 优化后的单循环
    try {
      // 更新简单测试粒子（可视化调试用）
      if (window.testParticles) {
        window.testParticles.rotation.y += 0.005
        window.testParticles.rotation.x += 0.002
      }

      // 优先使用主要粒子系统管理器
      if (particleSystemManager) {
        particleSystemManager.updateCameraPosition(camera.position)
        particleSystemManager.update(deltaTime)
      } else {
        // 备用简单系统（开发调试时使用）
        if (simpleParticleSystem) {
          simpleParticleSystem.update(deltaTime)
          simpleParticleSystem.updateMouse(mouse.x, mouse.y)
        }

      }
    } catch (error) {
      errorHandler.handleParticleSystemError(error as Error, 'Animation Loop Update')
    }
    
    // 渲染场景 - 统一错误处理
    try {
      renderer.render(scene, camera)
    } catch (error) {
      errorHandler.handleThreeJSError(error as Error, 'Scene Rendering')
    }
  } catch (error) {
    errorHandler.handleError({
      message: 'Critical error in animation loop',
      severity: ErrorSeverity.CRITICAL,
      context: 'Main Animation Loop',
      error: error as Error,
      timestamp: Date.now()
    })
    
    // 停止动画循环以防止连续错误
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = undefined
    }
    
    // 显示用户友好的错误消息
    if (terminalOutput.value) {
      terminalOutput.value.push({ 
        type: 'error', 
        content: 'Animation system encountered an error and has been stopped.' 
      })
    }
  }
}

// 窗口大小调整 - 优化性能和防抖
let resizeTimeoutId: number | undefined

const onWindowResize = () => {
  if (!camera || !renderer) return

  // 防抖处理，避免频繁resize
  if (resizeTimeoutId) {
    clearTimeout(resizeTimeoutId)
  }

  resizeTimeoutId = setTimeout(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = Math.min(window.devicePixelRatio, 2)

    // 更新相机
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    
    // 更新渲染器 - 优化像素比处理
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(pixelRatio)

    // 确保canvas样式正确
    renderer.domElement.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: -1 !important;
      pointer-events: none !important;
      display: block !important;
    `

    // 通知粒子系统管理器窗口大小变化
    if (particleSystemManager) {
      particleSystemManager.onWindowResize(width, height)
    }

  }, 100) // 100ms 防抖
}

// CSS粒子特效已被Three.js系统完全替代

// 组件卸载时清理
onUnmounted(() => {
  // 清理光标闪烁定时器
  if (cursorBlinkIntervalId) {
    clearInterval(cursorBlinkIntervalId)
    cursorBlinkIntervalId = undefined
  }

  // 清理窗口调整定时器
  if (resizeTimeoutId) {
    clearTimeout(resizeTimeoutId)
    resizeTimeoutId = undefined
  }
  
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = undefined
  }
  
  if (renderer) {
    // 移除WebGL上下文事件监听器 - 使用存储的函数引用
    if (webglContextLostHandler) {
      renderer.domElement.removeEventListener('webglcontextlost', webglContextLostHandler)
      webglContextLostHandler = undefined
    }
    if (webglContextRestoredHandler) {
      renderer.domElement.removeEventListener('webglcontextrestored', webglContextRestoredHandler)
      webglContextRestoredHandler = undefined
    }
    
    renderer.dispose()
    if (threeContainer.value && renderer.domElement) {
      threeContainer.value.removeChild(renderer.domElement)
    }
  }
  
  if (particleSystemManager) {
    particleSystemManager.dispose()
  }

  if (simpleParticleSystem) {
    simpleParticleSystem.dispose()
  }


  window.removeEventListener('resize', onWindowResize)
  
  // 清理拖拽事件监听器
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// 拖拽功能实现
const startDragging = (event: MouseEvent) => {
  isDragging.value = true
  
  // 获取当前终端容器位置
  const terminalContainer = event.currentTarget as HTMLElement
  const rect = terminalContainer.closest('.terminal-container')?.getBoundingClientRect()
  
  if (rect) {
    // 计算鼠标相对于终端容器左上角的偏移量
    dragOffset.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }
  
  // 添加全局事件监听器
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  // 防止文本选择
  event.preventDefault()
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  // 计算新位置
  const newX = event.clientX - dragOffset.value.x
  const newY = event.clientY - dragOffset.value.y
  
  // 获取视窗尺寸
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // 终端窗口尺寸（根据CSS中的设置）
  const terminalWidth = Math.min(800, viewportWidth * 0.9)
  const terminalHeight = Math.min(600, viewportHeight * 0.9)
  
  // 边界检测
  const minX = 0
  const maxX = viewportWidth - terminalWidth
  const minY = 0
  const maxY = viewportHeight - terminalHeight
  
  // 限制在边界内
  terminalPosition.value = {
    x: Math.max(minX, Math.min(maxX, newX)),
    y: Math.max(minY, Math.min(maxY, newY))
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  
  // 移除全局事件监听器
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 计算终端容器的样式
const terminalContainerStyle = computed(() => {
  return {
    position: 'fixed' as const,
    left: `${terminalPosition.value.x}px`,
    top: `${terminalPosition.value.y}px`,
    transform: terminalPosition.value.x === 0 && terminalPosition.value.y === 0 
      ? 'translate(-50%, -50%)' 
      : 'none',
    ...(terminalPosition.value.x === 0 && terminalPosition.value.y === 0 && {
      left: '50%',
      top: '50%'
    })
  }
})

// 打字机效果
const typeText = async (text: string, delay = 30) => {
  isTyping.value = true
  cursorVisible.value = true

  for (let i = 0; i <= text.length; i++) {
    const line = terminalOutput.value[terminalOutput.value.length - 1]
    if (line) {
      line.content = text.substring(0, i)
    }
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  isTyping.value = false
}

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const year = now.getFullYear()
  return `${hours}:${minutes} - ${day}/${month}/${year}`
}

// 显示启动信息
const showStartupInfo = async () => {
  terminalOutput.value.push({ type: 'info', content: '' })
  terminalOutput.value.push({ type: 'info', content: '' })

  // 用户信息
  terminalOutput.value.push({ type: 'info', content: '' })
  await typeText('Logged in as: whispin')

  terminalOutput.value.push({ type: 'info', content: '' })
  await typeText(`Last login: ${getCurrentTime()}`)

  terminalOutput.value.push({ type: 'info', content: '' })
  terminalOutput.value.push({ type: 'info', content: '' })

  // 欢迎信息
  terminalOutput.value.push({ type: 'info', content: '' })
  await typeText('🚀 Welcome to whispin Terminal v2.0')

  terminalOutput.value.push({ type: 'info', content: '' })
  await typeText('Type "help" for commands or try "snake" for a quick game!')

  terminalOutput.value.push({ type: 'info', content: '' })
}



// 虚拟文件系统
interface FileSystemItem {
  type: 'dir' | 'file'
  content?: string
  children?: Record<string, FileSystemItem>
}

const fileSystem: Record<string, FileSystemItem> = {
  'C:\\Users\\whispin': {
    type: 'dir',
    children: {
      'Documents': { type: 'dir', children: {} },
      'Desktop': { type: 'dir', children: {} },
      'about.txt': { 
        type: 'file', 
        content: 'whispin - Full Stack Developer\nSpecializes in Vue.js, React, and Node.js\nContact: hello@whispin.dev\n\nPassionate about creating beautiful web experiences\nwith cutting-edge technology and stellar user interfaces.' 
      },
      'projects.txt': { 
        type: 'file', 
        content: 'Current Projects:\n- Terminal Website with 3D Particle Effects\n- Vue Components Library\n- AI Chat Application\n- Portfolio Site\n- Open Source Contributions\n\nTech Stack: Vue 3, TypeScript, Three.js, Tailwind CSS' 
      },
      'skills.txt': {
        type: 'file',
        content: 'Technical Skills:\n\nFrontend:\n- Vue.js, React, Angular\n- TypeScript, JavaScript (ES6+)\n- HTML5, CSS3, SCSS\n- Three.js, WebGL\n- Tailwind CSS, Bootstrap\n\nBackend:\n- Node.js, Express\n- Python, Django\n- PHP, Laravel\n- REST APIs, GraphQL\n\nTools & Others:\n- Git, Docker\n- Webpack, Vite\n- Jest, Cypress\n- AWS, Vercel'
      }
    }
  }
}

// 获取文件系统中的当前目录内容
const getCurrentDirectoryFiles = () => {
  const currentDir = fileSystem[currentPath.value]
  if (!currentDir || currentDir.type !== 'dir' || !currentDir.children) {
    return []
  }

  return Object.entries(currentDir.children).map(([name, item]) => ({
    name,
    type: item.type,
    content: item.content
  }))
}

// 获取文件内容
const getFileContent = (filename: string) => {
  const currentDir = fileSystem[currentPath.value]
  if (!currentDir || currentDir.type !== 'dir' || !currentDir.children) {
    return null
  }

  const file = currentDir.children[filename]
  if (!file || file.type !== 'file') {
    return null
  }

  return file.content || ''
}

// 处理命令执行
const handleCommand = async () => {
  const input = terminalInput.value.trim()
  if (!input) return

  terminalOutput.value.push({
    type: 'command',
    content: `${currentPath.value}> ${input}`,
    timestamp: getCurrentTime()
  })

  // 解析命令
  const [command, ...args] = input.toLowerCase().split(' ')

  // 执行命令
  switch (command) {
    case 'help':
      await showHelp()
      break
    case 'clear':
    case 'cls':
      terminalOutput.value = []
      break
    case 'ls':
    case 'dir':
      await listFiles()
      break
    case 'cat':
    case 'type':
      await catFile(args[0])
      break
    case 'theme':
      await changeTheme(args[0])
      break
    case 'about':
      await showAbout()
      break
    case 'projects':
      await showProjects()
      break
    case 'contact':
      await showContact()
      break
    case 'whoami':
      await showUser()
      break
    case 'pwd':
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(currentPath.value)
      break
    case 'date':
    case 'time':
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(new Date().toString())
      break
    case 'echo':
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(args.join(' ') || '')
      break
    case 'snake':
      await playSnake()
      break
    case '2048':
      await play2048()
      break
    case 'guess':
      await playGuessNumber()
      break
    case 'calc':
      await calculator(args.join(' '))
      break
    case 'gh':
    case 'github':
      await showGitHub()
      break
    case 'ping':
      await pingCommand(args[0])
      break
    case 'cd':
      await changeDirectory(args[0])
      break
    case 'mkdir':
      await makeDirectory(args[0])
      break
    case 'touch':
      await createFile(args[0])
      break
    case 'music':
      await playMusic(args)
      break
    case 'base64':
      await base64Tool(args)
      break
    case 'hash':
      await hashTool(args)
      break
    case 'json':
      await jsonTool(args)
      break
    case 'color':
      await colorTool(args)
      break
    case 'history':
      await showHistory()
      break
    default:
      terminalOutput.value.push({
        type: 'error',
        content: `'${command}' is not recognized as an internal or external command.`
      })
      terminalOutput.value.push({ type: 'info', content: 'Type "help" to see available commands.' })
  }

  terminalInput.value = ''
}

// 命令实现
const showHelp = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🚀 whispin Terminal v2.0 - Available Commands:')
  terminalOutput.value.push({ type: 'output', content: '' })
  
  const commands = [
    ['help', 'Show this help message'],
    ['clear, cls', 'Clear terminal screen'],
    ['ls, dir', 'List files in current directory'],
    ['cat <file>', 'Display file contents'],
    ['theme <name>', 'Change theme (classic|green|amber|blue|purple)'],
    ['about', 'About whispin'],
    ['projects', 'View current projects'],
    ['contact', 'Contact information'],
    ['whoami', 'Display current user'],
    ['pwd', 'Show current directory'],
    ['date, time', 'Show current date and time'],
    ['echo <text>', 'Display text'],
    ['snake', 'Play Snake game'],
    ['2048', 'Play 2048 puzzle'],
    ['guess', 'Number guessing game'],
    ['calc <expr>', 'Calculator (e.g., calc 2+2)']
  ]

  for (const [cmd, desc] of commands) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`  ${cmd.padEnd(15)} - ${desc}`, 15)
  }
  
  terminalOutput.value.push({ type: 'output', content: '' })
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('💡 Tip: Try the games for some fun!')
}

const listFiles = async () => {
  const files = getCurrentDirectoryFiles()

  if (files.length === 0) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Directory is empty.')
    return
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Directory listing for ${currentPath.value}:`)
  terminalOutput.value.push({ type: 'output', content: '' })

  for (const file of files) {
    const icon = file.type === 'dir' ? '[DIR]' : '[FILE]'
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`${icon.padEnd(8)} ${file.name}`, 10)
  }
}

const catFile = async (filename: string) => {
  if (!filename) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: cat <filename>' })
    return
  }

  const fileContent = getFileContent(filename)

  if (!fileContent) {
    terminalOutput.value.push({ type: 'error', content: `File '${filename}' not found.` })
    return
  }

  const lines = fileContent.split('\n')
  for (const line of lines) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(line, 20)
  }
}

const changeTheme = async (themeName: string) => {
  if (!themeName || !themes[themeName as keyof typeof themes]) {
    terminalOutput.value.push({ type: 'error', content: `Theme '${themeName}' not found. Available: classic, green, amber, blue, purple` })
    return
  }

  currentTheme.value = themeName
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Theme changed to: ${themeName}`)
}

const showAbout = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('👨‍💻 About whispin')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Full Stack Developer passionate about creating')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('beautiful web experiences with cutting-edge technology.')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Specializes in Vue.js, React, Node.js, and 3D web graphics.')
}

const showProjects = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🚀 Current Projects:')
  terminalOutput.value.push({ type: 'output', content: '' })
  
  const projects = [
    'Terminal Website with 3D Particle Effects',
    'Vue Components Library',
    'AI Chat Application',
    'Portfolio Site',
    'Open Source Contributions'
  ]

  for (const project of projects) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`• ${project}`, 20)
  }
}

const showContact = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('📧 Contact Information:')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Email: hello@whispin.dev')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('GitHub: https://github.com/whispin')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Portfolio: https://whispin.dev')
}

const showUser = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('whispin')
}

// Safe math expression evaluator
const evaluateMathExpression = (expression: string): number => {
  const tokens = expression.replace(/\s+/g, '').match(/\d+(\.\d+)?|[+\-*/()]/g)
  if (!tokens) throw new Error('Invalid expression')
  
  let index = 0
  
  const parseExpression = (): number => {
    let result = parseTerm()
    
    while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
      const operator = tokens[index++]
      const right = parseTerm()
      result = operator === '+' ? result + right : result - right
    }
    
    return result
  }
  
  const parseTerm = (): number => {
    let result = parseFactor()
    
    while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
      const operator = tokens[index++]
      const right = parseFactor()
      if (operator === '*') {
        result = result * right
      } else {
        if (right === 0) throw new Error('Division by zero')
        result = result / right
      }
    }
    
    return result
  }
  
  const parseFactor = (): number => {
    if (index >= tokens.length) throw new Error('Unexpected end of expression')
    
    const token = tokens[index]
    
    if (token === '(') {
      index++
      const result = parseExpression()
      if (index >= tokens.length || tokens[index] !== ')') {
        throw new Error('Missing closing parenthesis')
      }
      index++
      return result
    }
    
    if (token === '-') {
      index++
      return -parseFactor()
    }
    
    if (token === '+') {
      index++
      return parseFactor()
    }
    
    const num = parseFloat(token)
    if (isNaN(num)) throw new Error('Invalid number: ' + token)
    index++
    return num
  }
  
  const result = parseExpression()
  if (index < tokens.length) throw new Error('Unexpected token: ' + tokens[index])
  
  return result
}

const calculator = async (expression: string) => {
  if (!expression) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: calc <expression>' })
    terminalOutput.value.push({ type: 'info', content: 'Examples: calc 2+2, calc 10*5, calc 100/4' })
    return
  }

  try {
    // 安全的数学表达式计算 - 无eval()
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
    if (sanitized !== expression) {
      terminalOutput.value.push({ type: 'error', content: 'Invalid characters in expression' })
      return
    }
    
    const result = evaluateMathExpression(sanitized)
    
    if (!isFinite(result)) {
      throw new Error('Result is not a finite number')
    }
    
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`${expression} = ${result}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    terminalOutput.value.push({ type: 'error', content: `Error: ${errorMessage}` })
  }
}

const playSnake = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🐍 Snake Game')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Coming soon! This will be an awesome ASCII snake game.')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Stay tuned for the full implementation!')
}

const play2048 = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🎮 2048 Puzzle')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Coming soon! Get ready for terminal-based 2048.')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('It will be epic!')
}

const playGuessNumber = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🎯 Number Guessing Game')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Coming soon! Guess the number between 1-100.')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Perfect for testing your luck!')
}

// GitHub API集成
interface GitHubRepo {
  name: string
  description: string
  language: string
  stargazers_count: number
  html_url: string
}

interface GitHubUser {
  login: string
  name: string
  bio: string
  public_repos: number
  followers: number
  following: number
  avatar_url: string
}

// 获取GitHub数据
const getGitHubData = async () => {
  try {
    const username = 'whispin'
    const userResponse = await fetch(`https://api.github.com/users/${username}`)
    const userData: GitHubUser = await userResponse.json()

    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=5`)
    const reposData: GitHubRepo[] = await reposResponse.json()

    return { user: userData, repos: reposData }
  } catch (error) {
    console.error('GitHub API Error:', error)
    return {
      user: {
        login: 'whispin',
        name: 'whispin',
        bio: 'Full Stack Developer & Terminal Enthusiast',
        public_repos: 25,
        followers: 88,
        following: 42,
        avatar_url: ''
      },
      repos: [
        { name: 'terminal-portfolio', description: 'Interactive terminal portfolio website', language: 'Vue', stargazers_count: 15, html_url: 'https://github.com/whispin/terminal-portfolio' },
        { name: 'vue-components', description: 'Reusable Vue 3 components library', language: 'TypeScript', stargazers_count: 8, html_url: 'https://github.com/whispin/vue-components' },
        { name: 'ai-chat-app', description: 'AI-powered chat application', language: 'JavaScript', stargazers_count: 12, html_url: 'https://github.com/whispin/ai-chat-app' }
      ]
    }
  }
}

const showGitHub = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Fetching GitHub data...')

  const githubData = await getGitHubData()

  if (!githubData) {
    terminalOutput.value.push({ type: 'error', content: 'Failed to fetch GitHub data.' })
    return
  }

  const { user, repos } = githubData

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`GitHub Profile: ${user.name || user.login}`)

  if (user.bio) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`Bio: ${user.bio}`)
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Profile: https://github.com/${user.login}`)

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Public Repositories: ${user.public_repos}`)

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Followers: ${user.followers}`)

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Following: ${user.following}`)

  terminalOutput.value.push({ type: 'output', content: '' })
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Top Repositories:')

  for (const repo of repos.slice(0, 3)) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`• ${repo.name} (⭐ ${repo.stargazers_count || 0}) - ${repo.language || 'N/A'}`)
  }
}

const pingCommand = async (domain: string) => {
  if (!domain) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: ping <domain>' })
    return
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Pinging ${domain}...`)

  const results = [
    `Reply from ${domain}: bytes=32 time=23ms TTL=54`,
    `Reply from ${domain}: bytes=32 time=25ms TTL=54`,
    `Reply from ${domain}: bytes=32 time=22ms TTL=54`,
    `Reply from ${domain}: bytes=32 time=24ms TTL=54`
  ]

  for (const result of results) {
    await new Promise(resolve => setTimeout(resolve, 500))
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(result, 10)
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Ping statistics for ${domain}:`)
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)')
}

const changeDirectory = async (path: string) => {
  if (!path) {
    terminalOutput.value.push({ type: 'output', content: currentPath.value })
    return
  }

  if (path === '..') {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Changed to parent directory')
  } else {
    terminalOutput.value.push({ type: 'error', content: `Directory '${path}' not found.` })
  }
}

const makeDirectory = async (dirName: string) => {
  if (!dirName) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: mkdir <directory_name>' })
    return
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Directory '${dirName}' created successfully.`)
}

const createFile = async (fileName: string) => {
  if (!fileName) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: touch <filename>' })
    return
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`File '${fileName}' created successfully.`)
}

const playMusic = async (args: string[]) => {
  const subCommand = args[0] || 'play'

  switch (subCommand) {
    case 'play':
    case 'next':
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText('🎵 Music player coming soon!')
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText('Will support streaming music from various sources.')
      break
    case 'stop':
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText('⏹️ Music stopped')
      break
    default:
      terminalOutput.value.push({ type: 'error', content: `Unknown command: 'music ${subCommand}'` })
      break
  }
}

const base64Tool = async (args: string[]) => {
  const [action, ...textParts] = args
  const text = textParts.join(' ')

  if (!action || !text) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: base64 <encode|decode> <text>' })
    return
  }

  try {
    if (action === 'encode') {
      const encoded = btoa(text)
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`Encoded: ${encoded}`)
    } else if (action === 'decode') {
      const decoded = atob(text)
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`Decoded: ${decoded}`)
    } else {
      terminalOutput.value.push({ type: 'error', content: 'Invalid action. Use: encode or decode' })
    }
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid input for base64 operation' })
  }
}

const hashTool = async (args: string[]) => {
  const [algorithm, ...textParts] = args
  const text = textParts.join(' ')

  if (!algorithm || !text) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: hash <sha1|sha256> <text>' })
    return
  }

  try {
    let hash = ''
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    if (algorithm === 'sha256') {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else if (algorithm === 'sha1') {
      const hashBuffer = await crypto.subtle.digest('SHA-1', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
      terminalOutput.value.push({ type: 'error', content: 'Supported algorithms: sha1, sha256' })
      return
    }

    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`${algorithm.toUpperCase()}: ${hash}`)
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Hash calculation failed' })
  }
}

const jsonTool = async (args: string[]) => {
  const [action, ...jsonParts] = args
  const jsonString = jsonParts.join(' ')

  if (!action || !jsonString) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: json <format|minify> <json_string>' })
    return
  }

  try {
    const parsed = JSON.parse(jsonString)
    
    if (action === 'format') {
      const formatted = JSON.stringify(parsed, null, 2)
      const lines = formatted.split('\n')
      
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText('Formatted JSON:')
      
      for (const line of lines) {
        terminalOutput.value.push({ type: 'output', content: '' })
        await typeText(line, 10)
      }
    } else if (action === 'minify') {
      const minified = JSON.stringify(parsed)
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`Minified: ${minified}`)
    } else {
      terminalOutput.value.push({ type: 'error', content: 'Invalid action. Use: format or minify' })
    }
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid JSON format' })
  }
}

const colorTool = async (args: string[]) => {
  const hex = args[0]
  
  if (!hex) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: color <hex_color>' })
    terminalOutput.value.push({ type: 'info', content: 'Example: color #ff0000 or color ff0000' })
    return
  }

  try {
    const cleanHex = hex.replace('#', '')
    
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      throw new Error('Invalid hex format')
    }

    const r = parseInt(cleanHex.slice(0, 2), 16)
    const g = parseInt(cleanHex.slice(2, 4), 16)
    const b = parseInt(cleanHex.slice(4, 6), 16)

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error('Invalid color values')
    }

    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`Color Information for #${cleanHex}:`)
    
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`RGB: rgb(${r}, ${g}, ${b})`)
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`Brightness: ${brightness.toFixed(1)} (${brightness > 128 ? 'Light' : 'Dark'})`)
    
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid hex color format. Use: #RRGGBB or RRGGBB' })
  }
}

const showHistory = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Command History:')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('History feature coming soon!')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Will track all your previous commands.')
}
</script>

<template>
  <!-- Three.js 3D粒子容器 - 直接作为顶级背景 -->
  <div class="three-container" ref="threeContainer"></div>

  <div class="cosmic-container">
    <!-- 宇宙背景 -->
    <div class="cosmic-background">
      <!-- CSS粒子特效容器 -->
      <div ref="particlesRef" class="particles"></div>

      <!-- 深空雾化效果 -->
      <div class="deep-space-fog"></div>

      <!-- 星云效果 -->
      <div class="nebula-effect"></div>

      <!-- 科技感扫描线 -->
      <div class="tech-scanlines"></div>
    </div>
    

    
    <!-- 终端容器 -->
    <div class="terminal-container" :style="terminalContainerStyle">
      <!-- 终端窗口 -->
      <div class="terminal-window">
        <!-- 标题栏 -->
        <div class="terminal-header" @mousedown="startDragging" :class="{ 'dragging': isDragging }">
          <span>whispin Terminal v2.0</span>
          <div class="window-controls" @mousedown.stop>
            <div class="control minimize"></div>
            <div class="control maximize"></div>
            <div class="control close"></div>
          </div>
        </div>

        <!-- 终端内容 -->
        <div class="terminal-content" :class="[themeClasses.text]">
          <!-- 终端输出历史 -->
          <div v-for="(line, index) in terminalOutput" :key="index" class="terminal-line">
            <div :class="{
              'text-green-400': line.type === 'command',
              'text-red-400': line.type === 'error',
              [themeClasses.accent]: line.type === 'info'
            }">
              {{ line.content }}
            </div>
          </div>

          <!-- 当前命令行 -->
          <div class="command-line">
            <span :class="[themeClasses.accent]">{{ currentPath }}></span>
            <input
              ref="inputRef"
              v-model="terminalInput"
              type="text"
              class="command-input"
              @keydown.enter="handleCommand"
            />
            <span v-if="cursorVisible" class="cursor"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 宇宙容器 */
.cosmic-container {
  position: fixed;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  overflow: hidden;
  margin: 0 !important;
  padding: 0 !important;
  z-index: 1;
}

/* 宇宙背景 */
.cosmic-background {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background:
    radial-gradient(ellipse at 15% 25%, rgba(20, 40, 80, 0.3) 0%, transparent 60%),
    radial-gradient(ellipse at 85% 75%, rgba(40, 20, 80, 0.4) 0%, transparent 55%),
    radial-gradient(circle at 50% 50%, rgba(5, 10, 25, 0.5) 0%, rgba(0, 0, 0, 0.8) 70%),
    linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(10, 5, 21, 0.8) 25%, rgba(26, 21, 53, 0.8) 50%, rgba(15, 5, 32, 0.8) 75%, rgba(0, 0, 0, 0.8) 100%);
  z-index: 1;
  overflow: hidden;
  margin: 0 !important;
  padding: 0 !important;
}

/* Three.js 3D粒子容器 - 作为最底层背景 */
.three-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 0 !important;
  pointer-events: none;
  overflow: hidden;
  margin: 0 !important;
  padding: 0 !important;
}

.three-container canvas {
  display: block !important;
  width: 100vw !important;
  height: 100vh !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  z-index: 0 !important;
}

/* CSS粒子容器 */
.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

/* 终端容器 */
.terminal-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  width: 800px;
  height: 600px;
  max-width: 90vw;
  max-height: 90vh;
  transition: transform 0.1s ease-out;
}

/* 终端窗口 */
.terminal-window {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

/* 标题栏 */
.terminal-header {
  background: rgba(200, 200, 200, 0.9);
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: black;
  font-size: 14px;
  cursor: move;
  user-select: none;
  transition: background 0.2s ease;
}

.terminal-header:hover {
  background: rgba(220, 220, 220, 0.9);
}

.terminal-header.dragging {
  background: rgba(180, 180, 180, 0.9);
  cursor: grabbing;
}

.window-controls {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.control:hover {
  opacity: 0.8;
}

.minimize { background: #ffbd2e; }
.maximize { background: #28ca42; }
.close { background: #ff5f56; }

/* 终端内容 */
.terminal-content {
  padding: 16px;
  height: calc(100% - 40px);
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.4;
}

.terminal-line {
  margin-bottom: 4px;
}

.command-line {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.command-input {
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  flex: 1;
  margin-left: 8px;
}

.cursor {
  width: 8px;
  height: 16px;
  background: white;
  margin-left: 2px;
}

/* 滚动条样式 */
.terminal-content::-webkit-scrollbar {
  width: 8px;
}

.terminal-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.terminal-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}
</style>