<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as THREE from 'three'

// 终端状态
const terminalInput = ref('')
const currentPath = ref('C:\\Users\\whispin')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const cursorVisible = ref(true)
const isTyping = ref(false)

// Three.js 相关
const threeContainer = ref<HTMLElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let particleSystem: THREE.Points
let galaxySpiral: THREE.Points
let starField: THREE.Points
let animationId: number
let mouse = { x: 0, y: 0 }
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
const audioPlayer = ref<HTMLAudioElement | null>(null)
const currentTrack = ref<any | null>(null)
const particlesRef = ref<HTMLElement>()

// 窗口大小调节
const windowSize = ref({
  width: 800,
  height: 600
})
const isResizing = ref(false)
const resizeStartPos = ref({ x: 0, y: 0 })
const resizeStartSize = ref({ width: 0, height: 0 })
const resizeDirection = ref('')

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
      'about.txt': { type: 'file', content: 'whispin - Full Stack Developer\nSpecializes in Vue.js, React, and Node.js\nContact: hello@whispin.dev' },
      'projects.txt': { type: 'file', content: 'Current Projects:\n- Terminal Website\n- Vue Components Library\n- AI Chat Application\n- Portfolio Site' }
    }
  }
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

// 获取GitHub数据
const getGitHubData = async () => {
  try {
    // 使用一个真实的GitHub用户名，或者whispin如果存在的话
    const username = 'whispin'

    // 获取用户信息
    const userResponse = await fetch(`https://api.github.com/users/${username}`)
    const userData: GitHubUser = await userResponse.json()

    // 获取仓库信息
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=5`)
    const reposData: GitHubRepo[] = await reposResponse.json()

    return { user: userData, repos: reposData }
  } catch (error) {
    console.error('GitHub API Error:', error)
    // 如果API失败，返回模拟数据
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

// 启动光标闪烁
onMounted(() => {
  setInterval(() => {
    if (!isTyping.value) {
      cursorVisible.value = !cursorVisible.value
    }
  }, 500)

  // 显示启动信息
  showStartupInfo()

  // 聚焦输入框
  nextTick(() => {
    inputRef.value?.focus()
  })
  
  // 初始化Three.js场景
  initThreeJS()
  
  // 初始化CSS粒子特效（作为备用）
  initParticles()
})

// Three.js 初始化
const initThreeJS = () => {
  if (!threeContainer.value) return

  try {
    // 检查WebGL支持
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS particles only')
      return
    }

    // 创建场景
    scene = new THREE.Scene()
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: window.innerWidth > 640, // 移动设备禁用抗锯齿
      powerPreference: "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    threeContainer.value.appendChild(renderer.domElement)

    // 创建粒子系统
    createParticleSystem()
    
    // 创建星系螺旋
    createGalaxySpiral()
    
    // 创建远景星场
    createStarField()
    
    // 添加环境光照
    setupLighting()
    
    // 添加鼠标交互
    setupMouseInteraction()
    
    // 开始动画循环
    animate()
    
    // 监听窗口大小变化
    window.addEventListener('resize', onWindowResize)
    
    console.log('Three.js initialized successfully')
  } catch (error) {
    console.warn('Three.js initialization failed, using CSS particles only:', error)
  }
}

// 创建3D粒子系统（微光粒子）
const createParticleSystem = () => {
  const particleCount = window.innerWidth < 640 ? 800 : 1500 // 减少粒子数量
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const velocities = new Float32Array(particleCount * 3)

  // 宇宙蓝紫色调色板
  const colorPalette = [
    new THREE.Color(0.9, 0.9, 1),        // 微蓝白色
    new THREE.Color(0.4, 0.7, 1),        // 天蓝色
    new THREE.Color(0.7, 0.5, 1),        // 浅紫色
    new THREE.Color(0.5, 0.4, 1),        // 深紫色
    new THREE.Color(0.3, 0.6, 1),        // 深蓝色
    new THREE.Color(0.8, 0.7, 1),        // 淡紫白
  ]

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3

    // 创建球形分布的粒子
    const radius = Math.random() * 50 + 10
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

    // 随机大小 - 增加大小差异
    const sizeType = Math.random()
    if (sizeType < 0.3) {
      // 30% 小粒子 - 增大最小尺寸
      sizes[i] = Math.random() * 1.5 + 2.0  // 从 0.5-1.5 增加到 1.0-2.5
    } else if (sizeType < 0.7) {
      // 40% 中等粒子
      sizes[i] = Math.random() * 3 + 3.0  // 从 1.5-4.5 增加到 2.0-5.0
    } else if (sizeType < 0.9) {
      // 20% 大粒子
      sizes[i] = Math.random() * 5 + 5.5  // 从 3-8 增加到 3.5-8.5
    } else {
      // 10% 超大粒子
      sizes[i] = Math.random() * 8 + 8  // 从 6-14 增加到 7-15
    }

    // 随机速度
    velocities[i3] = (Math.random() - 0.5) * 0.02
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
  }

  // 创建几何体
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))

  // 添加随机相位用于闪烁效果
  const phases = new Float32Array(particleCount)
  for (let i = 0; i < particleCount; i++) {
    phases[i] = Math.random() * Math.PI * 2
  }
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))

  // 创建粒子材质
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      mouse: { value: new THREE.Vector2() }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 velocity;
      attribute float phase;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float time;
      uniform vec2 mouse;
      
      void main() {
        vColor = color;
        
        vec3 pos = position;
        
        // 粒子运动
        pos += velocity * time * 10.0;
        
        // 鼠标交互
        vec2 mouseInfluence = mouse * 0.5;
        pos.x += sin(time * 0.5 + position.y * 0.01) * mouseInfluence.x;
        pos.y += cos(time * 0.5 + position.x * 0.01) * mouseInfluence.y;
        
        // 呼吸效果
        float pulse = sin(time * 2.0 + length(position) * 0.05) * 0.5 + 0.5;
        pos += normalize(position) * pulse * 2.0;
        
        // 星星闪烁效果 - 增强闪烁强度
        float twinkleSpeed = 1.5 + sin(phase) * 2.0; // 更大的速度变化
        float twinkleCycle = sin(time * twinkleSpeed + phase) * 0.7 + 0.3; // 增加变化幅度
        
        // 增强随机的强闪烁频率和强度
        float strongTwinkle = step(0.9, sin(time * 0.5 + phase * 2.0)) * 3.0; // 更频繁更强的闪烁
        
        // 添加超强闪烁效果
        float superTwinkle = step(0.98, sin(time * 0.2 + phase * 5.0)) * 5.0;
        
        vTwinkle = twinkleCycle + strongTwinkle + superTwinkle;
        vTwinkle = clamp(vTwinkle, 0.1, 6.0); // 扩大范围，允许更强的发光
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // 动态大小，结合闪烁效果
        float finalSize = size * (1.0 + pulse * 0.5) * vTwinkle;
        gl_PointSize = finalSize * (300.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float time;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        // 创建发光效果 - 增强边缘柔和度
        float alpha = 1.0 - (dist * 2.0);
        alpha = pow(alpha, 2.0); // 减少指数，让边缘更柔和
        
        // 增强发光效果
        float glowCore = 1.0 - smoothstep(0.0, 0.3, dist);
        float glowHalo = 1.0 - smoothstep(0.0, 0.5, dist) * 0.5;
        alpha = glowCore + glowHalo * 0.6;
        
        // 结合星星闪烁效果 - 更强的变化
        alpha *= vTwinkle;
        
        // 增强额外的闪烁变化
        float extraTwinkle = sin(time * 6.0 + length(vColor) * 15.0) * 0.3 + 0.7;
        alpha *= extraTwinkle;
        
        // 额外的发光效果层
        vec3 glowColor = vColor * (1.0 + vTwinkle * 0.5);
        
        gl_FragColor = vec4(glowColor, alpha * 1.2); // 增强整体亮度
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


// 创建星系螺旋
const createGalaxySpiral = () => {
  const particleCount = 15000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  const arms = 4
  const armSpread = 0.3
  const spiralTightness = 2

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3

    // 螺旋臂参数
    const armIndex = i % arms
    const progress = Math.pow(Math.random(), 2)
    const radius = progress * 100

    // 螺旋角度
    const baseAngle = (armIndex / arms) * Math.PI * 2
    const spiralAngle = baseAngle + radius * spiralTightness * 0.01

    // 添加随机扩散
    const randomAngle = (Math.random() - 0.5) * armSpread
    const randomRadius = (Math.random() - 0.5) * 5

    const x = (radius + randomRadius) * Math.cos(spiralAngle + randomAngle)
    const z = (radius + randomRadius) * Math.sin(spiralAngle + randomAngle)
    const y = (Math.random() - 0.5) * 10 * (1 - progress) // 中心厚，边缘薄

    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z - 120 // 放在远处

    // 颜色：中心偏黄，边缘偏蓝
    const centerDistance = progress
    if (centerDistance < 0.3) {
      // 中心区域 - 黄白色
      colors[i3] = 1.0
      colors[i3 + 1] = 0.9 + Math.random() * 0.1
      colors[i3 + 2] = 0.6 + Math.random() * 0.2
    } else if (centerDistance < 0.7) {
      // 中间区域 - 白色
      colors[i3] = 0.9 + Math.random() * 0.1
      colors[i3 + 1] = 0.9 + Math.random() * 0.1
      colors[i3 + 2] = 0.9 + Math.random() * 0.1
    } else {
      // 外围区域 - 蓝白色
      colors[i3] = 0.7 + Math.random() * 0.2
      colors[i3 + 1] = 0.8 + Math.random() * 0.2
      colors[i3 + 2] = 1.0
    }

    sizes[i] = (1 - centerDistance) * 3 + 0.5
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

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
        
        // 星系旋转
        float angle = time * 0.02;
        float cosA = cos(angle);
        float sinA = sin(angle);
        
        float newX = pos.x * cosA - pos.z * sinA;
        float newZ = pos.x * sinA + pos.z * cosA;
        pos.x = newX;
        pos.z = newZ;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        gl_PointSize = size * (800.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - (dist * 2.0);
        alpha = pow(alpha, 2.0);
        
        gl_FragColor = vec4(vColor, alpha * 0.2);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  galaxySpiral = new THREE.Points(geometry, material)
  scene.add(galaxySpiral)
}

// 创建远景星场
const createStarField = () => {
  const particleCount = 50000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3

    // 创建球形远景星场
    const radius = 200 + Math.random() * 300
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    // 远景星星颜色：蓝紫色调为主
    const colorType = Math.random()
    if (colorType < 0.6) {
      // 60% 蓝白色星星
      const intensity = 0.8 + Math.random() * 0.2
      colors[i3] = intensity * 0.9
      colors[i3 + 1] = intensity * 0.95
      colors[i3 + 2] = intensity
    } else if (colorType < 0.85) {
      // 25% 紫蓝色星星
      colors[i3] = 0.7 + Math.random() * 0.2
      colors[i3 + 1] = 0.5 + Math.random() * 0.3
      colors[i3 + 2] = 1.0
    } else {
      // 15% 紫色星星
      colors[i3] = 0.8 + Math.random() * 0.2
      colors[i3 + 1] = 0.4 + Math.random() * 0.3
      colors[i3 + 2] = 0.9 + Math.random() * 0.1
    }

    sizes[i] = Math.random() * 1.5 + 0.5
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

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
        
        // 非常缓慢的旋转
        float angle = time * 0.001;
        float cosA = cos(angle);
        float sinA = sin(angle);
        
        float newX = pos.x * cosA - pos.z * sinA;
        float newZ = pos.x * sinA + pos.z * cosA;
        pos.x = newX;
        pos.z = newZ;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        gl_PointSize = size * (1000.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float time;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        // 星星闪烁效果
        float twinkle = sin(time * 3.0 + gl_FragCoord.x * 0.1 + gl_FragCoord.y * 0.1) * 0.3 + 0.7;
        
        float alpha = (1.0 - dist * 2.0) * twinkle;
        alpha = pow(alpha, 2.0);
        
        gl_FragColor = vec4(vColor, alpha * 0.4);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  starField = new THREE.Points(geometry, material)
  scene.add(starField)
}

// 设置环境光照
const setupLighting = () => {
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
  scene.add(ambientLight)

  // 添加方向光模拟远处星光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(100, 100, 50)
  scene.add(directionalLight)

  // 添加点光源模拟附近恒星
  const pointLight1 = new THREE.PointLight(0x4080ff, 0.8, 200)
  pointLight1.position.set(50, 30, -20)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xff8040, 0.6, 150)
  pointLight2.position.set(-40, -20, 30)
  scene.add(pointLight2)

  const pointLight3 = new THREE.PointLight(0x40ff80, 0.4, 100)
  pointLight3.position.set(20, -30, -40)
  scene.add(pointLight3)
}

// 鼠标交互设置
const setupMouseInteraction = () => {
  const handleMouseMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  }
  
  window.addEventListener('mousemove', handleMouseMove)
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  time = Date.now() * 0.001
  
  if (particleSystem) {
    // 更新shader uniforms
    ;(particleSystem.material as THREE.ShaderMaterial).uniforms.time.value = time
    ;(particleSystem.material as THREE.ShaderMaterial).uniforms.mouse.value.set(mouse.x, mouse.y)
    
    // 缓慢旋转粒子系统
    particleSystem.rotation.y += 0.001
    particleSystem.rotation.x += 0.0005
  }
  
  // 动画星系螺旋
  if (galaxySpiral && galaxySpiral.material && 'uniforms' in galaxySpiral.material) {
    (galaxySpiral.material as THREE.ShaderMaterial).uniforms.time.value = time
  }
  
  // 动画远景星场
  if (starField && starField.material && 'uniforms' in starField.material) {
    (starField.material as THREE.ShaderMaterial).uniforms.time.value = time
  }
  
  // 相机轻微摆动
  camera.position.x = Math.sin(time * 0.1) * 0.5
  camera.position.y = Math.cos(time * 0.15) * 0.3
  camera.lookAt(scene.position)
  
  renderer.render(scene, camera)
}

// 窗口大小调整
const onWindowResize = () => {
  if (!camera || !renderer) return
  
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// 粒子特效初始化
const initParticles = () => {
  if (!particlesRef.value) return

  // 根据设备性能调整粒子数量
  const isMobile = window.innerWidth <= 640
  const particleCount = isMobile ? 25 : 50
  const fragment = document.createDocumentFragment()

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    
    // 完全随机的位置分布，包括边缘区域
    const distributionType = Math.random()
    let x, y
    
    if (distributionType < 0.7) {
      // 70% 在主要区域随机分布
      x = Math.random() * 100
      y = Math.random() * 100
    } else if (distributionType < 0.85) {
      // 15% 在边缘区域
      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? Math.random() * 10 : Math.random() * 10 + 90
        y = Math.random() * 100
      } else {
        x = Math.random() * 100
        y = Math.random() < 0.5 ? Math.random() * 10 : Math.random() * 10 + 90
      }
    } else {
      // 15% 在角落区域
      x = Math.random() < 0.5 ? Math.random() * 15 : Math.random() * 15 + 85
      y = Math.random() < 0.5 ? Math.random() * 15 : Math.random() * 15 + 85
    }
    
    particle.style.left = x + '%'
    particle.style.top = y + '%'
    
    // 更大的随机大小范围，创造更明显的大小差异
    const sizeType = Math.random()
    let size, className
    if (sizeType < 0.5) {
      // 50% 小粒子
      size = Math.random() * 2.5 + 0.5
      className = 'particle particle-small'
    } else if (sizeType < 0.8) {
      // 30% 中等粒子  
      size = Math.random() * 4 + 2.5
      className = 'particle particle-medium'
    } else {
      // 20% 大粒子
      size = Math.random() * 6 + 4
      className = 'particle particle-large'
    }
    
    particle.className = className
    particle.style.width = size + 'px'
    particle.style.height = size + 'px'
    
    // 随机透明度，让粒子更有层次感
    const opacity = Math.random() * 0.7 + 0.3
    particle.style.opacity = opacity.toString()
    
    // 更大范围的随机动画延迟
    particle.style.animationDelay = Math.random() * 20 + 's'
    
    // 更大范围的随机动画持续时间
    const baseDuration = isMobile ? 40 : 20 // 移动设备动画更慢
    particle.style.animationDuration = (Math.random() * 30 + baseDuration) + 's'
    
    // 随机动画方向
    const direction = Math.random() > 0.5 ? 'normal' : 'reverse'
    particle.style.animationDirection = direction
    
    // 随机发光动画延迟和持续时间
    const glowDelay = Math.random() * 15 + 's'
    const glowDuration = (Math.random() * 12 + 6) + 's'
    const pulseDuration = (Math.random() * 8 + 4) + 's'
    const scaleDuration = (Math.random() * 10 + 8) + 's'
    
    particle.style.setProperty('--glow-delay', glowDelay)
    particle.style.setProperty('--glow-duration', glowDuration)
    particle.style.setProperty('--pulse-duration', pulseDuration)
    particle.style.setProperty('--scale-duration', scaleDuration)
    
    // 随机粒子颜色类型（科技感配色）
    const colorType = Math.random()
    if (colorType < 0.4) {
      // 40% 蓝白色（经典星光）
      particle.style.setProperty('--particle-color', '255, 255, 255')
      particle.style.setProperty('--particle-glow', '200, 220, 255')
    } else if (colorType < 0.65) {
      // 25% 青色（科技感）
      particle.style.setProperty('--particle-color', '0, 255, 255')
      particle.style.setProperty('--particle-glow', '0, 200, 255')
    } else if (colorType < 0.8) {
      // 15% 紫色（神秘感）
      particle.style.setProperty('--particle-color', '200, 100, 255')
      particle.style.setProperty('--particle-glow', '150, 50, 255')
    } else if (colorType < 0.95) {
      // 15% 绿色（科技矩阵感）
      particle.style.setProperty('--particle-color', '100, 255, 150')
      particle.style.setProperty('--particle-glow', '50, 255, 100')
    } else {
      // 5% 橙红色（能量核心感）
      particle.style.setProperty('--particle-color', '255, 120, 50')
      particle.style.setProperty('--particle-glow', '255, 80, 20')
    }
    
    fragment.appendChild(particle)
  }
  
  particlesRef.value.appendChild(fragment)
}

// 组件卸载时清理游戏和Three.js
onUnmounted(() => {
  stopCurrentGame()
  stopResize()
  
  // 清理Three.js资源
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (renderer) {
    renderer.dispose()
    if (threeContainer.value && renderer.domElement) {
      threeContainer.value.removeChild(renderer.domElement)
    }
  }
  
  // 清理主粒子系统
  if (particleSystem) {
    if (particleSystem.geometry) {
      particleSystem.geometry.dispose()
    }
    if (particleSystem.material) {
      (particleSystem.material as THREE.Material).dispose()
    }
  }
  
  // 清理星系螺旋
  if (galaxySpiral) {
    if (galaxySpiral.geometry) {
      galaxySpiral.geometry.dispose()
    }
    if (galaxySpiral.material) {
      (galaxySpiral.material as THREE.Material).dispose()
    }
  }
  
  // 清理远景星场
  if (starField) {
    if (starField.geometry) {
      starField.geometry.dispose()
    }
    if (starField.material) {
      (starField.material as THREE.Material).dispose()
    }
  }
  
  window.removeEventListener('resize', onWindowResize)
})

// 计算当前主题样式
const themeClasses = computed(() => themes[currentTheme.value as keyof typeof themes])



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

// 可用命令列表
const availableCommands = [
  'help', 'clear', 'cls', 'ls', 'cat', 'theme', 'gh', 'about',
  'projects', 'contact', 'echo', 'date', 'time', 'pwd', 'cd',
  'mkdir', 'touch', 'music', 'calc', 'snake', '2048', 'guess',
  'base64', 'hash', 'json', 'color'
]

// Tab自动补全处理
const handleTabCompletion = () => {
  const input = terminalInput.value.trim()
  if (!input) return

  const parts = input.split(' ').filter(p => p !== '')
  const currentWord = parts[parts.length - 1]

  let suggestions: string[] = []

  if (parts.length <= 1) {
    // 命令补全
    suggestions = availableCommands.filter(cmd => cmd.startsWith(currentWord))
  } else {
    const command = parts[0].toLowerCase()
    const arg = parts.length > 1 ? currentWord : ''

    // 参数补全
    if (command === 'ls' || command === 'cat' || command === 'cd') {
      const filesAndDirs = getCurrentDirectoryFiles().map(f => f.name)
      suggestions = filesAndDirs.filter(item => item.toLowerCase().startsWith(arg.toLowerCase()))
    } else if (command === 'theme') {
      suggestions = Object.keys(themes).filter(theme => theme.startsWith(arg))
    } else if (command === 'help') {
      const helpCategories = ['basic', 'games', 'tools', 'system', 'all']
      suggestions = helpCategories.filter(cat => cat.startsWith(arg))
    }
  }

  if (suggestions.length === 1) {
    const suggestion = suggestions[0]
    const completedInput = [...parts.slice(0, parts.length - 1), suggestion].join(' ') + ' '
    terminalInput.value = completedInput
  } else if (suggestions.length > 1) {
    terminalOutput.value.push({
      type: 'info',
      content: suggestions.join('  ')
    })
  }
}

// 命令处理
const executeCommand = async (input: string) => {
  const trimmedInput = input.trim()
  if (!trimmedInput) return

  // 添加到历史记录
  commandHistory.value.push(trimmedInput)
  historyIndex.value = -1

  // 显示命令行
  terminalOutput.value.push({
    type: 'command',
    content: `${currentPath.value}> ${trimmedInput}`,
    timestamp: getCurrentTime()
  })

  // 解析命令
  const [command, ...args] = trimmedInput.toLowerCase().split(' ')

  // 执行命令
  switch (command) {
    case 'help':
      await showHelp(args[0])
      break
    case 'clear':
    case 'cls':
      terminalOutput.value = []
      break
    case 'ping':
      await pingCommand(args[0])
      break
    case 'ls':
    case 'dir':
      await listFiles()
      break
    case 'cd':
      await changeDirectory(args[0])
      break
    case 'cat':
    case 'type':
      await catFile(args[0])
      break
    case 'github':
      await showGitHub()
      break
    case 'theme':
      await changeTheme(args[0])
      break
    case 'history':
      await showHistory()
      break
    case 'whoami':
      await showUser()
      break
    case 'date':
      await showDate()
      break
    case 'echo':
      await echoText(args.join(' '))
      break
    case 'music':
      await playMusic(args)
      break
    case 'calc':
      await calculator(args.join(' '))
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
    default:
      terminalOutput.value.push({
        type: 'error',
        content: `'${command}' is not recognized as an internal or external command.`
      })
  }
}

// 命令实现
const showHelp = async (category?: string) => {
  const commands = {
    basic: {
      title: '📝 Basic Commands',
      items: [
        ['help [category]', 'Show help (basic|games|tools|all)'],
        ['clear, cls', 'Clear terminal screen'],
        ['echo <text>', 'Display text'],
        ['date', 'Show current date and time'],
        ['theme <name>', 'Change theme (classic|green|amber|blue|purple)']
      ]
    },
    games: {
      title: '🎮 Games',
      items: [
        ['snake', 'Play Snake game (WASD to move, Q to quit)'],
        ['2048', 'Play 2048 puzzle (WASD to move, Q to quit)'],
        ['guess', 'Number guessing game (use echo <number>)']
      ]
    },
    tools: {
      title: '🔧 Developer Tools',
      items: [
        ['calc <expr>', 'Calculator (e.g., calc 2+2, calc sqrt(16))'],
        ['base64 encode|decode <text>', 'Base64 encoding/decoding'],
        ['hash sha1|sha256 <text>', 'Generate hash'],
        ['json format|minify <json>', 'Format or minify JSON'],
        ['color <hex>', 'Color info (e.g., color #ff0000)']
      ]
    },
    system: {
      title: '💻 System Commands',
      items: [
        ['ls, dir', 'List files in directory'],
        ['cat <file>', 'Display file contents'],
        ['cd <path>', 'Change directory'],
        ['whoami', 'Display current user'],
        ['history', 'Show command history'],
        ['github', 'Show GitHub profile'],
        ['music play|stop|next', 'Music player controls']
      ]
    }
  }

  if (!category) {
    // 显示简洁的总览
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('🚀 Welcome to whispin Terminal v2.0')
    terminalOutput.value.push({ type: 'output', content: '' })
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('📚 Available command categories:')
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('  help basic   - Basic terminal commands')
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('  help games   - Interactive games')
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('  help tools   - Developer tools')
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('  help system  - System commands')
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('  help all     - Show all commands')
    terminalOutput.value.push({ type: 'output', content: '' })
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('💡 Tip: Try "snake" for a quick game or "calc 2+2" for calculation!')
    return
  }

  if (category === 'all') {
    // 显示所有命令
    for (const [, section] of Object.entries(commands)) {
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(section.title)
      terminalOutput.value.push({ type: 'output', content: '' })
      
      for (const [cmd, desc] of section.items) {
        terminalOutput.value.push({ type: 'output', content: '' })
        await typeText(`  ${cmd.padEnd(20)} - ${desc}`, 10)
      }
      terminalOutput.value.push({ type: 'output', content: '' })
    }
    return
  }

  // 显示特定分类
  const section = commands[category as keyof typeof commands]
  if (!section) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid category. Use: basic, games, tools, system, or all' })
    return
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(section.title)
  terminalOutput.value.push({ type: 'output', content: '' })
  
  for (const [cmd, desc] of section.items) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`  ${cmd.padEnd(25)} - ${desc}`, 15)
  }
  
  terminalOutput.value.push({ type: 'output', content: '' })
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('💡 Use "help" to see all categories or "help all" for everything.')
}

const pingCommand = async (domain: string) => {
  if (!domain) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: ping <domain>' })
    return
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Pinging ${domain}...`)

  // 模拟ping结果
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

const listFiles = async () => {
  const files = getCurrentDirectoryFiles()

  if (files.length === 0) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Directory is empty or does not exist.')
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

const showGitHub = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Fetching GitHub data...')

  const githubData = await getGitHubData()

  if (!githubData) {
    terminalOutput.value.push({ type: 'error', content: 'Failed to fetch GitHub data. Showing fallback info...' })
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('GitHub Profile: whispin')
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Profile: https://github.com/whispin')
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

    if (repo.description) {
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`  ${repo.description}`)
    }
  }

  // 打开GitHub页面
  setTimeout(() => {
    window.open(`https://github.com/${user.login}`, '_blank')
  }, 1000)
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

const showHistory = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Command History:')

  commandHistory.value.forEach(async (cmd, index) => {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`${index + 1}. ${cmd}`, 10)
  })
}

const showUser = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('whispin')
}

const showDate = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(new Date().toString())
}

const echoText = async (text: string) => {
  // 检查是否在猜数字游戏中
  if (gameState.value && gameState.value.type === 'guess') {
    const guess = parseInt(text)
    
    if (isNaN(guess)) {
      terminalOutput.value.push({ type: 'error', content: 'Please enter a valid number!' })
      return
    }
    
    gameState.value.attempts++
    const { number, attempts, maxAttempts } = gameState.value
    
    if (guess === number) {
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`🎉 Congratulations! You guessed it in ${attempts} attempts!`)
      gameState.value = null
    } else if (attempts >= maxAttempts) {
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`💀 Game Over! The number was ${number}`)
      gameState.value = null
    } else {
      const hint = guess < number ? 'Too low!' : 'Too high!'
      const remaining = maxAttempts - attempts
      terminalOutput.value.push({ type: 'output', content: '' })
      await typeText(`${hint} ${remaining} attempts remaining.`)
    }
    return
  }
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(text || '')
}

const fetchAndPlayRandomTrack = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Fetching music...', 20)

  try {
    const clientId = '3e247de8'
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=50&tags=lounge,chillout&order=popularity_month`)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const track = data.results[Math.floor(Math.random() * data.results.length)]
      currentTrack.value = track
      if (audioPlayer.value) {
        audioPlayer.value.src = track.audio
        await audioPlayer.value.play()
        terminalOutput.value.push({ type: 'output', content: '' })
        await typeText(`🎵 Now playing: ${track.name} - ${track.artist_name}`, 20)
      }
    } else {
      terminalOutput.value.push({ type: 'error', content: 'Could not find any suitable music, please try again later.' })
    }
  } catch (error) {
    console.error('Error fetching music:', error)
    terminalOutput.value.push({ type: 'error', content: 'Failed to fetch music. Please check your network connection.' })
  }
}

const playMusic = async (args: string[]) => {
  const subCommand = args[0] || 'play'

  switch (subCommand) {
    case 'play':
    case 'next':
      await fetchAndPlayRandomTrack()
      break
    case 'stop':
      if (audioPlayer.value && audioPlayer.value.src) {
        audioPlayer.value.pause()
        audioPlayer.value.src = ''
        currentTrack.value = null
        terminalOutput.value.push({ type: 'output', content: '⏹️ Music stopped' })
      } else {
        terminalOutput.value.push({ type: 'error', content: 'No music is playing' })
      }
      break
    case 'volume':
      if (!audioPlayer.value || !audioPlayer.value.src) {
        terminalOutput.value.push({ type: 'error', content: 'No music is playing' })
        return
      }
      const volume = parseInt(args[1], 10)
      if (!isNaN(volume) && volume >= 0 && volume <= 100) {
        audioPlayer.value.volume = volume / 100
        terminalOutput.value.push({ type: 'output', content: `🔊 Volume set to: ${volume}%` })
      } else {
        terminalOutput.value.push({ type: 'error', content: 'Usage: music volume <0-100>' })
      }
      break
    default:
      terminalOutput.value.push({ type: 'error', content: `Unknown command: 'music ${subCommand}'` })
      break
  }
}



const changeDirectory = async (path: string) => {
  if (!path) {
    terminalOutput.value.push({ type: 'output', content: currentPath.value })
    return
  }

  if (path === '..') {
    // 简单的上级目录处理
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Changed to parent directory')
  } else {
    terminalOutput.value.push({ type: 'error', content: `Directory '${path}' not found.` })
  }
}

// 处理命令执行
const handleCommand = () => {
  executeCommand(terminalInput.value)
  terminalInput.value = ''
}

// 历史记录导航
const navigateHistory = (direction: number) => {
  if (direction === -1) {
    // 向上箭头 - 显示更早的命令
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++
      terminalInput.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value]
    }
  } else if (direction === 1) {
    // 向下箭头 - 显示更新的命令
    if (historyIndex.value > 0) {
      historyIndex.value--
      terminalInput.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value]
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      terminalInput.value = ''
    }
  }
}

// 处理输入事件
const handleInput = () => {
  // 重置历史记录索引当用户开始输入时
  historyIndex.value = -1
}

// 保持输入框聚焦
const handleTerminalClick = () => {
  if (!isResizing.value) {
    inputRef.value?.focus()
  }
}

// 窗口调节功能
const startResize = (event: MouseEvent, direction: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  isResizing.value = true
  resizeDirection.value = direction
  resizeStartPos.value = { x: event.clientX, y: event.clientY }
  resizeStartSize.value = { ...windowSize.value }
  
  // 添加resizing类到窗口
  const terminalWindow = (event.target as HTMLElement)?.closest('.terminal-window') as HTMLElement
  if (terminalWindow) {
    terminalWindow.classList.add('resizing')
  }
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = getResizeCursor(direction)
  document.body.style.userSelect = 'none'
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return
  
  const deltaX = event.clientX - resizeStartPos.value.x
  const deltaY = event.clientY - resizeStartPos.value.y
  
  let newWidth = resizeStartSize.value.width
  let newHeight = resizeStartSize.value.height
  
  const direction = resizeDirection.value
  
  if (direction.includes('e')) newWidth += deltaX
  if (direction.includes('w')) newWidth -= deltaX
  if (direction.includes('s')) newHeight += deltaY
  if (direction.includes('n')) newHeight -= deltaY
  
  // 应用最小和最大限制
  newWidth = Math.max(420, Math.min(1200, newWidth))
  newHeight = Math.max(400, Math.min(800, newHeight))
  
  windowSize.value = { width: newWidth, height: newHeight }
}

const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = ''
  
  // 移除resizing类
  const terminalWindow = document.querySelector('.terminal-window')
  if (terminalWindow) {
    terminalWindow.classList.remove('resizing')
  }
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = 'default'
  document.body.style.userSelect = 'auto'
}

const getResizeCursor = (direction: string) => {
  const cursors: Record<string, string> = {
    'n': 'ns-resize',
    's': 'ns-resize',
    'e': 'ew-resize',
    'w': 'ew-resize',
    'ne': 'nesw-resize',
    'nw': 'nwse-resize',
    'se': 'nwse-resize',
    'sw': 'nesw-resize'
  }
  return cursors[direction] || 'default'
}

// 🔧 开发者工具
const calculator = async (expression: string) => {
  if (!expression) {
    terminalOutput.value.push({ type: 'error', content: 'Usage: calc <expression>' })
    terminalOutput.value.push({ type: 'info', content: 'Examples: calc 2+2, calc sqrt(16), calc sin(30)' })
    return
  }

  try {
    const sanitized = expression.replace(/[^0-9+\-*/().\s\w]/g, '')
    let result = sanitized
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/sin\(([^)]+)\)/g, 'Math.sin($1 * Math.PI / 180)')
      .replace(/cos\(([^)]+)\)/g, 'Math.cos($1 * Math.PI / 180)')
      .replace(/tan\(([^)]+)\)/g, 'Math.tan($1 * Math.PI / 180)')
      .replace(/pi/g, 'Math.PI')
      .replace(/e/g, 'Math.E')

    const calculated = Function(`"use strict"; return (${result})`)()
    
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`${expression} = ${calculated}`)
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid expression. Try: calc 2+2' })
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
    terminalOutput.value.push({ type: 'error', content: 'Usage: hash <md5|sha1|sha256> <text>' })
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
    
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`HSL: ${rgbToHsl(r, g, b)}`)

    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`Brightness: ${brightness.toFixed(1)} (${brightness > 128 ? 'Light' : 'Dark'})`)
    
  } catch (error) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid hex color format. Use: #RRGGBB or RRGGBB' })
  }
}

const rgbToHsl = (r: number, g: number, b: number): string => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

// 🎮 游戏功能
let gameState = ref<any>(null)
let gameInterval = ref<any>(null)
let gameKeyListener = ref<any>(null)

const playSnake = async () => {
  // 清理之前的游戏
  stopCurrentGame()
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🐍 Starting Snake Game...')
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Use WASD keys to control the snake. Press Q to quit.')
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Press SPACE to start!')

  // 初始化游戏状态
  gameState.value = {
    type: 'snake',
    snake: [[7, 15]],
    food: generateFood([[7, 15]]),
    direction: 'right',
    score: 0,
    gameOver: false,
    started: false
  }

  // 添加键盘监听
  gameKeyListener.value = (event: KeyboardEvent) => {
    if (!gameState.value || gameState.value.type !== 'snake') return
    
    event.preventDefault()
    
    if (!gameState.value.started && event.code === 'Space') {
      startSnakeGame()
      return
    }
    
    if (!gameState.value.started) return
    
    const { direction } = gameState.value
    
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        if (direction !== 'down') gameState.value.direction = 'up'
        break
      case 'KeyS':
      case 'ArrowDown':
        if (direction !== 'up') gameState.value.direction = 'down'
        break
      case 'KeyA':
      case 'ArrowLeft':
        if (direction !== 'right') gameState.value.direction = 'left'
        break
      case 'KeyD':
      case 'ArrowRight':
        if (direction !== 'left') gameState.value.direction = 'right'
        break
      case 'KeyQ':
        stopCurrentGame()
        terminalOutput.value.push({ type: 'output', content: '' })
        typeText('Game quit. Type any command to continue.')
        break
    }
  }
  
  document.addEventListener('keydown', gameKeyListener.value)
  
  await renderSnakeGame()
}

const generateFood = (snake: number[][]) => {
  let food: number[]
  do {
    food = [Math.floor(Math.random() * 15), Math.floor(Math.random() * 30)]
  } while (snake.some(([x, y]) => x === food[0] && y === food[1]))
  return food
}

const startSnakeGame = () => {
  if (!gameState.value) return
  
  gameState.value.started = true
  
  gameInterval.value = setInterval(() => {
    if (!gameState.value || gameState.value.gameOver) return
    
    updateSnakeGame()
  }, 200)
}

const updateSnakeGame = async () => {
  if (!gameState.value || gameState.value.type !== 'snake') return
  
  const { snake, food, direction } = gameState.value
  const head = [...snake[0]]
  
  // 移动蛇头
  switch (direction) {
    case 'up': head[0]--; break
    case 'down': head[0]++; break
    case 'left': head[1]--; break
    case 'right': head[1]++; break
  }
  
  // 检查碰撞
  if (head[0] < 0 || head[0] >= 15 || head[1] < 0 || head[1] >= 30 ||
      snake.some(([x, y]: [number, number]) => x === head[0] && y === head[1])) {
    gameState.value.gameOver = true
    stopCurrentGame()
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`💀 Game Over! Final Score: ${gameState.value.score}`)
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Type "snake" to play again or any other command to continue.')
    return
  }
  
  snake.unshift(head)
  
  // 检查是否吃到食物
  if (head[0] === food[0] && head[1] === food[1]) {
    gameState.value.score += 10
    gameState.value.food = generateFood(snake)
  } else {
    snake.pop()
  }
  
  await renderSnakeGame()
}

const renderSnakeGame = async () => {
  if (!gameState.value || gameState.value.type !== 'snake') return

  const { snake, food, score, started } = gameState.value
  
  // 清除之前的游戏画面（保留最近几行输出）
  const keepLines = terminalOutput.value.slice(0, -20)
  terminalOutput.value.splice(0, terminalOutput.value.length, ...keepLines)
  
  let board = Array(15).fill(null).map(() => Array(30).fill('·'))

  snake.forEach(([x, y]: [number, number], index: number) => {
    if (x >= 0 && x < 15 && y >= 0 && y < 30) {
      board[x][y] = index === 0 ? '●' : '█'
    }
  })

  if (food[0] >= 0 && food[0] < 15 && food[1] >= 0 && food[1] < 30) {
    board[food[0]][food[1]] = '🍎'
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  terminalOutput.value.push({ type: 'output', content: `Score: ${score} | ${started ? 'Use WASD to move, Q to quit' : 'Press SPACE to start'}` })
  terminalOutput.value.push({ type: 'output', content: '┌' + '─'.repeat(30) + '┐' })
  
  for (const row of board) {
    terminalOutput.value.push({ type: 'output', content: '│' + row.join('') + '│' })
  }
  
  terminalOutput.value.push({ type: 'output', content: '└' + '─'.repeat(30) + '┘' })
}

const stopCurrentGame = () => {
  if (gameInterval.value) {
    clearInterval(gameInterval.value)
    gameInterval.value = null
  }
  
  if (gameKeyListener.value) {
    document.removeEventListener('keydown', gameKeyListener.value)
    gameKeyListener.value = null
  }
  
  gameState.value = null
}

const play2048 = async () => {
  // 清理之前的游戏
  stopCurrentGame()
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🎮 Starting 2048 Game...')
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Use WASD keys to move tiles. Press Q to quit.')
  
  const board = Array(4).fill(null).map(() => Array(4).fill(0))
  
  gameState.value = {
    type: '2048',
    board,
    score: 0,
    gameOver: false
  }

  // 添加两个初始数字
  addNewTile()
  addNewTile()

  // 添加键盘监听
  gameKeyListener.value = (event: KeyboardEvent) => {
    if (!gameState.value || gameState.value.type !== '2048') return
    
    event.preventDefault()
    
    let moved = false
    const newBoard = gameState.value.board.map((row: number[]) => [...row])
    
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        moved = move2048Up(newBoard)
        break
      case 'KeyS':
      case 'ArrowDown':
        moved = move2048Down(newBoard)
        break
      case 'KeyA':
      case 'ArrowLeft':
        moved = move2048Left(newBoard)
        break
      case 'KeyD':
      case 'ArrowRight':
        moved = move2048Right(newBoard)
        break
      case 'KeyQ':
        stopCurrentGame()
        terminalOutput.value.push({ type: 'output', content: '' })
        typeText('Game quit. Type any command to continue.')
        return
    }
    
    if (moved) {
      gameState.value.board = newBoard
      addNewTile()
      
      if (checkGameOver2048()) {
        gameState.value.gameOver = true
        stopCurrentGame()
        terminalOutput.value.push({ type: 'output', content: '' })
        typeText(`🎮 Game Over! Final Score: ${gameState.value.score}`)
        terminalOutput.value.push({ type: 'output', content: '' })
        typeText('Type "2048" to play again or any other command to continue.')
      } else {
        render2048Game()
      }
    }
  }
  
  document.addEventListener('keydown', gameKeyListener.value)

  await render2048Game()
}

const addNewTile = () => {
  if (!gameState.value) return
  
  const emptyCells: number[][] = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (gameState.value.board[i][j] === 0) {
        emptyCells.push([i, j])
      }
    }
  }
  
  if (emptyCells.length > 0) {
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    gameState.value.board[randomCell[0]][randomCell[1]] = Math.random() < 0.9 ? 2 : 4
  }
}

const move2048Left = (board: number[][]) => {
  let moved = false
  for (let i = 0; i < 4; i++) {
    const row = board[i].filter(val => val !== 0)
    for (let j = 0; j < row.length - 1; j++) {
      if (row[j] === row[j + 1]) {
        row[j] *= 2
        gameState.value.score += row[j]
        row.splice(j + 1, 1)
      }
    }
    while (row.length < 4) row.push(0)
    
    for (let j = 0; j < 4; j++) {
      if (board[i][j] !== row[j]) moved = true
      board[i][j] = row[j]
    }
  }
  return moved
}

const move2048Right = (board: number[][]) => {
  let moved = false
  for (let i = 0; i < 4; i++) {
    const row = board[i].filter(val => val !== 0)
    for (let j = row.length - 1; j > 0; j--) {
      if (row[j] === row[j - 1]) {
        row[j] *= 2
        gameState.value.score += row[j]
        row.splice(j - 1, 1)
        j--
      }
    }
    while (row.length < 4) row.unshift(0)
    
    for (let j = 0; j < 4; j++) {
      if (board[i][j] !== row[j]) moved = true
      board[i][j] = row[j]
    }
  }
  return moved
}

const move2048Up = (board: number[][]) => {
  let moved = false
  for (let j = 0; j < 4; j++) {
    const column = []
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== 0) column.push(board[i][j])
    }
    
    for (let i = 0; i < column.length - 1; i++) {
      if (column[i] === column[i + 1]) {
        column[i] *= 2
        gameState.value.score += column[i]
        column.splice(i + 1, 1)
      }
    }
    
    while (column.length < 4) column.push(0)
    
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== column[i]) moved = true
      board[i][j] = column[i]
    }
  }
  return moved
}

const move2048Down = (board: number[][]) => {
  let moved = false
  for (let j = 0; j < 4; j++) {
    const column = []
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== 0) column.push(board[i][j])
    }
    
    for (let i = column.length - 1; i > 0; i--) {
      if (column[i] === column[i - 1]) {
        column[i] *= 2
        gameState.value.score += column[i]
        column.splice(i - 1, 1)
        i--
      }
    }
    
    while (column.length < 4) column.unshift(0)
    
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== column[i]) moved = true
      board[i][j] = column[i]
    }
  }
  return moved
}

const checkGameOver2048 = () => {
  if (!gameState.value) return true
  
  const board = gameState.value.board
  
  // 检查是否有空格
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) return false
    }
  }
  
  // 检查是否可以合并
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i < 3 && board[i][j] === board[i + 1][j]) ||
          (j < 3 && board[i][j] === board[i][j + 1])) {
        return false
      }
    }
  }
  
  return true
}

const render2048Game = async () => {
  if (!gameState.value || gameState.value.type !== '2048') return

  const { board, score } = gameState.value
  
  // 清除之前的游戏画面
  const keepLines = terminalOutput.value.slice(0, -10)
  terminalOutput.value.splice(0, terminalOutput.value.length, ...keepLines)
  
  terminalOutput.value.push({ type: 'output', content: '' })
  terminalOutput.value.push({ type: 'output', content: `Score: ${score} | Use WASD to move, Q to quit` })
  terminalOutput.value.push({ type: 'output', content: '┌────┬────┬────┬────┐' })
  
  for (let i = 0; i < 4; i++) {
    let row = '│'
    for (let j = 0; j < 4; j++) {
      const val = board[i][j] || ''
      row += val.toString().padStart(4, ' ') + '│'
    }
    terminalOutput.value.push({ type: 'output', content: row })
    
    if (i < 3) {
      terminalOutput.value.push({ type: 'output', content: '├────┼────┼────┼────┤' })
    }
  }
  
  terminalOutput.value.push({ type: 'output', content: '└────┴────┴────┴────┘' })
}

const playGuessNumber = async () => {
  const randomNumber = Math.floor(Math.random() * 100) + 1
  
  gameState.value = {
    type: 'guess',
    number: randomNumber,
    attempts: 0,
    maxAttempts: 7
  }

  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🎯 Number Guessing Game!')
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('I\'m thinking of a number between 1 and 100.')
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('You have 7 attempts. Type your guess as a command!')
  
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Example: echo 42')
}
</script>

<template>
  <div class="cosmic-container">
    <!-- 宇宙背景 -->
    <div class="cosmic-background">
      <!-- Three.js 3D粒子容器 -->
      <div class="three-container" ref="threeContainer"></div>
    </div>
    
    <!-- 终端容器 -->
    <div class="terminal-container">
      <!-- 终端窗口 -->
      <div
          class="terminal-window border border-white font-arial relative"
          :style="{
            width: windowSize.width + 'px',
            height: windowSize.height + 'px',
            minWidth: '420px',
            minHeight: '400px',
            maxWidth: '1200px',
            maxHeight: '800px'
          }"
          @click="handleTerminalClick"
      >
      <!-- 拖拽句柄 - 角落 -->
      <div 
        class="resize-handle resize-corner resize-nw"
        @mousedown="startResize($event, 'nw')"
      ></div>
      <div 
        class="resize-handle resize-corner resize-ne"
        @mousedown="startResize($event, 'ne')"
      ></div>
      <div 
        class="resize-handle resize-corner resize-sw"
        @mousedown="startResize($event, 'sw')"
      ></div>
      <div 
        class="resize-handle resize-corner resize-se"
        @mousedown="startResize($event, 'se')"
      ></div>
      
      <!-- 拖拽句柄 - 边缘 -->
      <div 
        class="resize-handle resize-edge resize-n"
        @mousedown="startResize($event, 'n')"
      ></div>
      <div 
        class="resize-handle resize-edge resize-s"
        @mousedown="startResize($event, 's')"
      ></div>
      <div 
        class="resize-handle resize-edge resize-w"
        @mousedown="startResize($event, 'w')"
      ></div>
      <div 
        class="resize-handle resize-edge resize-e"
        @mousedown="startResize($event, 'e')"
      ></div>

      <!-- 标题栏 -->
      <div class="terminal-header bg-[#c8c8c8] px-2 py-1.5 flex justify-between items-center">
        <span class="text-black pointer-events-none text-sm">C:\Windows\system32\cmd.exe</span>
        <div class="flex space-x-1">
          <div class="w-3 h-3 bg-yellow-400 rounded-full"/>
          <div class="w-3 h-3 bg-green-400 rounded-full"/>
          <div class="w-3 h-3 bg-red-400 rounded-full"/>
        </div>
      </div>

      <!-- 终端内容 -->
      <div
          :class="[
          'terminal-content font-mono p-3 overflow-y-auto',
          themeClasses.bg,
          themeClasses.text
        ]"
        :style="{
          height: (windowSize.height - 40) + 'px'
        }"
      >
        <!-- 终端输出历史 -->
        <div v-for="(line, index) in terminalOutput" :key="index" class="leading-tight">
          <div
              :class="{
              'text-green-400': line.type === 'command',
              'text-red-400': line.type === 'error',
              [themeClasses.accent]: line.type === 'info'
            }"
          >
            {{ line.content }}
          </div>
        </div>

        <!-- 当前命令行 -->
        <div class="flex items-center leading-tight mt-2">
          <span :class="[themeClasses.accent]">{{ currentPath }}></span>
          <input
              ref="inputRef"
              v-model="terminalInput"
              type="text"
              class="bg-transparent border-none outline-none w-full ml-2"
              autofocus
              @keydown.enter="handleCommand"
              @keydown.up="navigateHistory(-1)"
              @keydown.down="navigateHistory(1)"
              @keydown.tab.prevent="handleTabCompletion"
              @input="handleInput"
          />
          <span v-if="cursorVisible" class="w-2 h-5 bg-white"></span>
        </div>
      </div>
    </div>
    </div>
  </div>
  <audio ref="audioPlayer" hidden></audio>
</template>

<style scoped>
/* 宇宙容器 */
.cosmic-container {
  position: relative;
  min-height: 100vh;
  width: 100vw;
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
    /* 深邃的宇宙渐变 - 增强蓝紫色调 */
    radial-gradient(ellipse at 15% 25%, rgba(20, 40, 80, 0.7) 0%, transparent 60%),
    radial-gradient(ellipse at 85% 75%, rgba(40, 20, 80, 0.8) 0%, transparent 55%),
    radial-gradient(ellipse at 35% 85%, rgba(10, 30, 70, 0.6) 0%, transparent 65%),
    radial-gradient(ellipse at 65% 15%, rgba(30, 10, 60, 0.5) 0%, transparent 70%),
    /* 主背景渐变 - 深邃的太空 */
    radial-gradient(circle at 50% 50%, rgba(5, 10, 25, 0.9) 0%, rgba(0, 0, 0, 1) 70%),
    linear-gradient(135deg, #000000 0%, #0a0515 25%, #1a1535 50%, #0f0520 75%, #000000 100%);
  z-index: -1;
}

/* 添加深邃的宇宙噪点纹理 - 蓝紫色调 */
.cosmic-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    /* 蓝紫色微光点 */
    radial-gradient(1px 1px at 25px 35px, rgba(100, 150, 255, 0.12), transparent),
    radial-gradient(1px 1px at 45px 75px, rgba(150, 100, 255, 0.10), transparent),
    radial-gradient(1px 1px at 85px 45px, rgba(80, 120, 255, 0.08), transparent),
    radial-gradient(1px 1px at 125px 85px, rgba(120, 80, 255, 0.06), transparent),
    radial-gradient(1px 1px at 165px 25px, rgba(60, 100, 255, 0.07), transparent),
    /* 更远的微光 */
    radial-gradient(0.5px 0.5px at 180px 60px, rgba(200, 150, 255, 0.04), transparent),
    radial-gradient(0.5px 0.5px at 220px 90px, rgba(150, 200, 255, 0.03), transparent);
  background-repeat: repeat;
  background-size: 250px 180px;
  opacity: 0.4;
  animation: cosmicNoise 120s linear infinite;
}

@keyframes cosmicNoise {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-250px, -180px); }
}

/* 添加深度感后景 */
.cosmic-background::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 30% 40%, rgba(20, 60, 120, 0.15) 0%, transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(60, 20, 120, 0.18) 0%, transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(40, 40, 100, 0.12) 0%, transparent 50%);
  opacity: 0.6;
  animation: cosmicBreathing 40s ease-in-out infinite alternate;
  z-index: -1;
}

@keyframes cosmicBreathing {
  0% { 
    opacity: 0.4;
    transform: scale(1.0);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
  100% { 
    opacity: 0.5;
    transform: scale(1.02);
  }
}

/* Three.js 3D粒子容器 */
.three-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -10;
  pointer-events: none;
}

.three-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* 粒子容器 */
.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -8; /* 在Three.js之上，星云之下 */
  opacity: 0.15; /* 降低透明度，作为补充效果 */
}

/* 单个粒子 */
.particle {
  position: absolute;
  background: radial-gradient(circle, 
    rgba(var(--particle-color, 255, 255, 255), 1) 0%, 
    rgba(var(--particle-color, 255, 255, 255), 0.8) 30%, 
    rgba(var(--particle-color, 255, 255, 255), 0.4) 60%, 
    transparent 100%);
  border-radius: 50%;
  animation: 
    particleFloat linear infinite,
    particleGlow var(--glow-duration, 6s) ease-in-out infinite var(--glow-delay, 0s),
    particlePulse var(--pulse-duration, 4s) ease-in-out infinite,
    particleScale var(--scale-duration, 8s) ease-in-out infinite,
    particleFadeInOut calc(var(--glow-duration, 6s) * 1.5) ease-in-out infinite;
}

/* 小粒子 */
.particle-small {
  box-shadow: 
    0 0 2px rgba(var(--particle-glow, 255, 255, 255), 0.3),
    0 0 4px rgba(var(--particle-glow, 255, 255, 255), 0.2),
    0 0 6px rgba(var(--particle-glow, 255, 255, 255), 0.1);
}

/* 中等粒子 */
.particle-medium {
  box-shadow: 
    0 0 4px rgba(var(--particle-glow, 255, 255, 255), 0.4),
    0 0 8px rgba(var(--particle-glow, 255, 255, 255), 0.3),
    0 0 12px rgba(var(--particle-glow, 255, 255, 255), 0.2),
    0 0 16px rgba(var(--particle-glow, 255, 255, 255), 0.1);
}

/* 大粒子专属强化发光效果 */
.particle-large {
  box-shadow: 
    0 0 6px rgba(var(--particle-glow, 255, 255, 255), 0.5),
    0 0 12px rgba(var(--particle-glow, 255, 255, 255), 0.4),
    0 0 18px rgba(var(--particle-glow, 255, 255, 255), 0.3),
    0 0 24px rgba(var(--particle-glow, 255, 255, 255), 0.2),
    0 0 30px rgba(var(--particle-glow, 255, 255, 255), 0.1);
  animation: 
    particleFloat linear infinite,
    particleGlow var(--glow-duration, 6s) ease-in-out infinite var(--glow-delay, 0s),
    particleFadeInOut calc(var(--glow-duration, 6s) * 1.5) ease-in-out infinite;
}

/* 淡入淡出动画 */
@keyframes particleFadeInOut {
  0% {
    opacity: 0.3;
  }
  25% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  75% {
    opacity: 0.6;
  }
  100% {
    opacity: 0.3;
  }
}

/* 尺寸变化动画 */
@keyframes particleScale {
  0% {
    transform: scale(0.6);
  }
  20% {
    transform: scale(1.0);
  }
  40% {
    transform: scale(1.3);
  }
  60% {
    transform: scale(0.9);
  }
  80% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(0.6);
  }
}

/* 脉冲呼吸动画 */
@keyframes particlePulse {
  0%, 100% {
    filter: brightness(1) saturate(1);
  }
  25% {
    filter: brightness(1.5) saturate(1.2);
  }
  50% {
    filter: brightness(2.5) saturate(1.5);
  }
  75% {
    filter: brightness(1.8) saturate(1.3);
  }
}

/* 大粒子强化发光动画 */
@keyframes particleIntenseGlow {
  0%, 70% {
    box-shadow: 
      0 0 12px rgba(var(--particle-glow, 255, 255, 255), 0.9),
      0 0 24px rgba(var(--particle-glow, 255, 255, 255), 0.7),
      0 0 36px rgba(var(--particle-glow, 255, 255, 255), 0.5),
      0 0 48px rgba(var(--particle-glow, 255, 255, 255), 0.3),
      0 0 60px rgba(var(--particle-glow, 255, 255, 255), 0.2);
  }
  85% {
    box-shadow: 
      0 0 20px rgba(var(--particle-glow, 255, 255, 255), 1),
      0 0 40px rgba(var(--particle-glow, 255, 255, 255), 0.9),
      0 0 60px rgba(var(--particle-glow, 255, 255, 255), 0.8),
      0 0 80px rgba(var(--particle-glow, 255, 255, 255), 0.6),
      0 0 100px rgba(var(--particle-glow, 255, 255, 255), 0.4),
      0 0 120px rgba(var(--particle-glow, 255, 255, 255), 0.3),
      0 0 150px rgba(var(--particle-glow, 255, 255, 255), 0.2);
  }
  100% {
    box-shadow: 
      0 0 12px rgba(var(--particle-glow, 255, 255, 255), 0.9),
      0 0 24px rgba(var(--particle-glow, 255, 255, 255), 0.7),
      0 0 36px rgba(var(--particle-glow, 255, 255, 255), 0.5),
      0 0 48px rgba(var(--particle-glow, 255, 255, 255), 0.3),
      0 0 60px rgba(var(--particle-glow, 255, 255, 255), 0.2);
  }
}

/* 基础发光动画（增强版） */
@keyframes particleGlow {
  0% {
    filter: brightness(1) drop-shadow(0 0 2px rgba(var(--particle-glow, 255, 255, 255), 0.3));
  }
  20% {
    filter: brightness(1.3) drop-shadow(0 0 6px rgba(var(--particle-glow, 255, 255, 255), 0.5));
  }
  40% {
    filter: brightness(1.8) drop-shadow(0 0 12px rgba(var(--particle-glow, 255, 255, 255), 0.7));
  }
  60% {
    filter: brightness(2.5) drop-shadow(0 0 18px rgba(var(--particle-glow, 255, 255, 255), 0.9)) drop-shadow(0 0 36px rgba(var(--particle-glow, 255, 255, 255), 0.5));
  }
  80% {
    filter: brightness(1.8) drop-shadow(0 0 12px rgba(var(--particle-glow, 255, 255, 255), 0.7));
  }
  100% {
    filter: brightness(1) drop-shadow(0 0 2px rgba(var(--particle-glow, 255, 255, 255), 0.3));
  }
}

@keyframes particleLargeGlow {
  0%, 80% {
    box-shadow: 
      0 0 12px rgba(255, 255, 255, 0.9),
      0 0 24px rgba(255, 255, 255, 0.7),
      0 0 36px rgba(255, 255, 255, 0.5),
      0 0 48px rgba(200, 200, 255, 0.3),
      0 0 60px rgba(150, 150, 255, 0.2);
  }
  90% {
    box-shadow: 
      0 0 20px rgba(255, 255, 255, 1),
      0 0 40px rgba(255, 255, 255, 0.9),
      0 0 60px rgba(255, 255, 255, 0.7),
      0 0 80px rgba(200, 200, 255, 0.5),
      0 0 100px rgba(150, 150, 255, 0.3),
      0 0 120px rgba(100, 100, 255, 0.2);
  }
  100% {
    box-shadow: 
      0 0 12px rgba(255, 255, 255, 0.9),
      0 0 24px rgba(255, 255, 255, 0.7),
      0 0 36px rgba(255, 255, 255, 0.5),
      0 0 48px rgba(200, 200, 255, 0.3),
      0 0 60px rgba(150, 150, 255, 0.2);
  }
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) translateX(0) rotate(0deg) scale(0);
    opacity: 0;
  }
  5% {
    opacity: 0.3;
    transform: translateY(95vh) translateX(5px) rotate(18deg) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateY(85vh) translateX(15px) rotate(54deg) scale(1);
  }
  50% {
    transform: translateY(50vh) translateX(35px) rotate(180deg) scale(1.1);
  }
  85% {
    opacity: 1;
    transform: translateY(15vh) translateX(55px) rotate(306deg) scale(0.9);
  }
  95% {
    opacity: 0.3;
    transform: translateY(5vh) translateX(65px) rotate(342deg) scale(0.6);
  }
  100% {
    transform: translateY(-5vh) translateX(70px) rotate(360deg) scale(0);
    opacity: 0;
  }
}


/* 终端容器 */
.terminal-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1;
}

/* 终端窗口样式 */
.terminal-window {
  position: relative;
  margin: 0;
  font-family: Arial, sans-serif;
  transition: none;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.terminal-content {
  font-family: 'Courier New', Courier, monospace;
  min-width: 420px;
  background: rgba(0, 0, 0, 0.2);
}

/* 拖拽句柄基础样式 */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
  transition: all 0.2s ease;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 角落拖拽句柄 */
.resize-corner {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.resize-nw {
  top: -8px;
  left: -8px;
  cursor: nwse-resize;
}

.resize-ne {
  top: -8px;
  right: -8px;
  cursor: nesw-resize;
}

.resize-sw {
  bottom: -8px;
  left: -8px;
  cursor: nesw-resize;
}

.resize-se {
  bottom: -8px;
  right: -8px;
  cursor: nwse-resize;
}

/* 边缘拖拽句柄 */
.resize-edge {
  background: transparent;
}

.resize-n {
  top: -6px;
  left: 16px;
  right: 16px;
  height: 12px;
  cursor: ns-resize;
}

.resize-s {
  bottom: -6px;
  left: 16px;
  right: 16px;
  height: 12px;
  cursor: ns-resize;
}

.resize-w {
  left: -6px;
  top: 16px;
  bottom: 16px;
  width: 12px;
  cursor: ew-resize;
}

.resize-e {
  right: -6px;
  top: 16px;
  bottom: 16px;
  width: 12px;
  cursor: ew-resize;
}

/* 拖拽手柄悬停效果 */
.resize-corner:hover {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
}

.resize-edge:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* 拖拽时的视觉反馈 */
.terminal-window.resizing .resize-handle {
  background: rgba(255, 255, 255, 0.4);
}

/* 防止用户选择 */
.terminal-window.resizing * {
  user-select: none;
  pointer-events: none;
}

/* 标题栏半透明 */
.terminal-header {
  background: rgba(200, 200, 200, 0.9) !important;
  backdrop-filter: blur(5px);
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

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 禁用输入框的默认样式 */
input {
  font-family: 'Courier New', Courier, monospace;
  color: inherit;
}

input:focus {
  outline: none;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .terminal-window {
    width: calc(100vw - 2rem) !important;
    max-width: calc(100vw - 2rem) !important;
    min-width: 320px !important;
  }
  
  .terminal-content {
    min-width: 320px;
  }
  
  /* 移动设备上简化拖拽句柄 */
  .resize-edge {
    display: none;
  }
  
  .resize-corner {
    width: 20px;
    height: 20px;
  }
  
  .resize-nw {
    top: -10px;
    left: -10px;
  }
  
  .resize-ne {
    top: -10px;
    right: -10px;
  }
  
  .resize-sw {
    bottom: -10px;
    left: -10px;
  }
  
  .resize-se {
    bottom: -10px;
    right: -10px;
  }
  
  /* 移动设备粒子效果性能优化 */
  .three-container {
    opacity: 0.7; /* 降低Three.js粒子透明度 */
  }
  
  .particles {
    opacity: 0.2; /* 进一步降低CSS粒子透明度 */
  }
  
  .particle {
    /* 简化动画，提高性能 */
    animation: 
      particleFloat linear infinite,
      particleGlow var(--glow-duration, 8s) ease-in-out infinite var(--glow-delay, 0s) !important;
  }
  
  .particle-large {
    /* 大粒子也简化动画 */
    animation: 
      particleFloat linear infinite,
      particleGlow var(--glow-duration, 8s) ease-in-out infinite var(--glow-delay, 0s),
      particleFadeInOut calc(var(--glow-duration, 8s) * 1.5) ease-in-out infinite !important;
  }
}

/* 性能优化 */
@media (prefers-reduced-motion: reduce) {
  .particle {
    animation: particleFloat linear infinite !important;
  }
  
  .particle-large {
    animation: particleFloat linear infinite !important;
  }
}
</style>
