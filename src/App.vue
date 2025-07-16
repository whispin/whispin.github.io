<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as THREE from 'three'

// 终端状态
const terminalInput = ref('')
const currentPath = ref('C:\\Users\\whispin')
// const commandHistory = ref<string[]>([])
// const historyIndex = ref(-1)
const cursorVisible = ref(true)
const isTyping = ref(false)

// Three.js 相关
const threeContainer = ref<HTMLElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let particleSystem: THREE.Points
// let galaxySpiral: THREE.Points
// let starField: THREE.Points
let animationId: number
// let mouse = { x: 0, y: 0 }
let time = 0

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
  setInterval(() => {
    if (!isTyping.value) {
      cursorVisible.value = !cursorVisible.value
    }
  }, 500)

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
  
  // 初始化CSS粒子特效（作为备用）
  setTimeout(() => {
    initParticles()
  }, 1000) // 延迟1秒确保DOM完全加载
})

// Three.js 初始化
const initThreeJS = () => {
  console.log('Starting Three.js initialization...')
  console.log('threeContainer.value:', threeContainer.value)
  
  if (!threeContainer.value) {
    console.error('Three.js container not found!')
    return
  }

  try {
    // 检查WebGL支持
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS particles only')
      return
    }
    console.log('WebGL supported!')

    // 创建场景
    scene = new THREE.Scene()
    console.log('Scene created')
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5
    console.log('Camera created')

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: window.innerWidth > 640,
      powerPreference: "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    threeContainer.value.appendChild(renderer.domElement)
    console.log('Renderer created and added to DOM')

    // 创建粒子系统
    createParticleSystem()
    console.log('Particle system created')
    
    // 开始动画循环
    animate()
    console.log('Animation started')
    
    // 监听窗口大小变化
    window.addEventListener('resize', onWindowResize)
    
    console.log('Three.js initialized successfully')
  } catch (error) {
    console.error('Three.js initialization failed:', error)
  }
}

// 创建3D粒子系统（简化版）
const createParticleSystem = () => {
  const particleCount = window.innerWidth < 640 ? 1000 : 2000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  // 科技感宇宙色调色板
  const colorPalette = [
    new THREE.Color(0.95, 0.95, 1),      // 纯白星光
    new THREE.Color(0.2, 0.8, 1),        // 电子蓝
    new THREE.Color(0.8, 0.3, 1),        // 霓虹紫
    new THREE.Color(0.1, 0.9, 0.9),      // 青色光芒
    new THREE.Color(0.3, 1, 0.3),        // 矩阵绿
  ]

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3

    // 创建球形分布的粒子
    const radius = Math.random() * 80 + 20
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    // 随机颜色
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b

    // 随机大小
    sizes[i] = Math.random() * 4 + 1
  }

  // 创建几何体
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  // 创建粒子材质
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float time;
      
      void main() {
        vColor = color;
        
        vec3 pos = position;
        
        // 简单的旋转动画
        float angle = time * 0.5;
        float cosA = cos(angle);
        float sinA = sin(angle);
        
        float newX = pos.x * cosA - pos.z * sinA;
        float newZ = pos.x * sinA + pos.z * cosA;
        pos.x = newX;
        pos.z = newZ;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        gl_PointSize = size * (300.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float time;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        // 创建发光效果
        float alpha = 1.0 - (dist * 2.0);
        alpha = pow(alpha, 2.0);
        
        // 闪烁效果
        float twinkle = sin(time * 3.0 + gl_FragCoord.x * 0.1) * 0.3 + 0.7;
        alpha *= twinkle;
        
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  // 创建粒子系统并添加到场景
  particleSystem = new THREE.Points(geometry, material)
  scene.add(particleSystem)
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  time = Date.now() * 0.001
  
  if (particleSystem) {
    (particleSystem.material as THREE.ShaderMaterial).uniforms.time.value = time
  }
  
  renderer.render(scene, camera)
}

// 窗口大小调整
const onWindowResize = () => {
  if (!camera || !renderer) return
  
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// CSS粒子特效初始化
const initParticles = () => {
  console.log('Starting CSS particles initialization...')
  console.log('particlesRef.value:', particlesRef.value)
  
  if (!particlesRef.value) {
    console.error('CSS particles container not found!')
    return
  }

  const particleCount = window.innerWidth < 640 ? 30 : 60
  console.log('Creating', particleCount, 'CSS particles')
  const fragment = document.createDocumentFragment()

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    
    // 随机位置
    particle.style.left = Math.random() * 100 + '%'
    particle.style.top = Math.random() * 100 + '%'
    
    // 随机大小
    const size = Math.random() * 4 + 1
    particle.className = 'particle'
    particle.style.width = size + 'px'
    particle.style.height = size + 'px'
    
    // 随机透明度
    particle.style.opacity = (Math.random() * 0.7 + 0.3).toString()
    
    // 随机动画延迟
    particle.style.animationDelay = Math.random() * 20 + 's'
    particle.style.animationDuration = (Math.random() * 30 + 20) + 's'
    
    // 随机颜色
    const colorType = Math.random()
    if (colorType < 0.4) {
      particle.style.setProperty('--particle-color', '255, 255, 255')
      particle.style.setProperty('--particle-glow', '200, 220, 255')
    } else if (colorType < 0.65) {
      particle.style.setProperty('--particle-color', '0, 255, 255')
      particle.style.setProperty('--particle-glow', '0, 200, 255')
    } else if (colorType < 0.8) {
      particle.style.setProperty('--particle-color', '200, 100, 255')
      particle.style.setProperty('--particle-glow', '150, 50, 255')
    } else {
      particle.style.setProperty('--particle-color', '100, 255, 150')
      particle.style.setProperty('--particle-glow', '50, 255, 100')
    }
    
    fragment.appendChild(particle)
  }
  
  particlesRef.value.appendChild(fragment)
  console.log('CSS particles added to DOM, total particles:', particleCount)
}

// 组件卸载时清理
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (renderer) {
    renderer.dispose()
    if (threeContainer.value && renderer.domElement) {
      threeContainer.value.removeChild(renderer.domElement)
    }
  }
  
  if (particleSystem) {
    if (particleSystem.geometry) {
      particleSystem.geometry.dispose()
    }
    if (particleSystem.material) {
      (particleSystem.material as THREE.Material).dispose()
    }
  }
  
  window.removeEventListener('resize', onWindowResize)
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

// 可用命令列表
const availableCommands = [
  'help', 'clear', 'cls', 'ls', 'cat', 'theme', 'gh', 'about',
  'projects', 'contact', 'echo', 'date', 'time', 'pwd', 'cd',
  'mkdir', 'touch', 'music', 'calc', 'snake', '2048', 'guess',
  'base64', 'hash', 'json', 'color', 'whoami', 'history', 'ping'
]

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

const calculator = async (expression: string) => {
  if (!expression) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: calc <expression>' })
    terminalOutput.value.push({ type: 'info', content: 'Examples: calc 2+2, calc 10*5, calc 100/4' })
    return
  }

  try {
    // 简单的数学表达式计算
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
    const result = Function(`"use strict"; return (${sanitized})`)()
    
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`${expression} = ${result}`)
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid expression. Try: calc 2+2' })
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
  <div class="cosmic-container">
    <!-- 宇宙背景 -->
    <div class="cosmic-background">
      <!-- Three.js 3D粒子容器 -->
      <div class="three-container" ref="threeContainer"></div>
      
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
    <div class="terminal-container">
      <!-- 终端窗口 -->
      <div class="terminal-window">
        <!-- 标题栏 -->
        <div class="terminal-header">
          <span>whispin Terminal v2.0</span>
          <div class="window-controls">
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 宇宙背景 */
.cosmic-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(ellipse at 15% 25%, rgba(20, 40, 80, 0.7) 0%, transparent 60%),
    radial-gradient(ellipse at 85% 75%, rgba(40, 20, 80, 0.8) 0%, transparent 55%),
    radial-gradient(circle at 50% 50%, rgba(5, 10, 25, 0.9) 0%, rgba(0, 0, 0, 1) 70%),
    linear-gradient(135deg, #000000 0%, #0a0515 25%, #1a1535 50%, #0f0520 75%, #000000 100%);
  z-index: 0;
}

/* Three.js 3D粒子容器 */
.three-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.three-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
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
}

.window-controls {
  display: flex;
  gap: 8px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
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