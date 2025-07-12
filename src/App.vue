<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'

// 终端状态
const terminalInput = ref('')
const currentPath = ref('C:\\Users\\whispin')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const cursorVisible = ref(true)
const isTyping = ref(false)

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
})

// 组件卸载时清理游戏
onUnmounted(() => {
  stopCurrentGame()
  stopResize()
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
  'base64', 'hash', 'json', 'color', 'resize'
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
    case 'resize':
      await resizeWindow(args)
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
        ['theme <name>', 'Change theme (classic|green|amber|blue|purple)'],
        ['resize <w> <h>', 'Resize window or "reset"']
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

// 窗口大小命令
const resizeWindow = async (args: string[]) => {
  if (args.length === 0) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(`Current window size: ${windowSize.value.width}x${windowSize.value.height}`)
    terminalOutput.value.push({ type: 'info', content: 'Usage: resize <width> <height> or resize reset' })
    return
  }

  if (args[0] === 'reset') {
    windowSize.value = { width: 800, height: 600 }
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText('Window size reset to default (800x600)')
    return
  }

  const width = parseInt(args[0])
  const height = parseInt(args[1])

  if (isNaN(width) || isNaN(height)) {
    terminalOutput.value.push({ type: 'error', content: 'Invalid dimensions. Use numbers for width and height.' })
    return
  }

  if (width < 420 || width > 1200 || height < 400 || height > 800) {
    terminalOutput.value.push({ type: 'error', content: 'Size limits: width 420-1200px, height 400-800px' })
    return
  }

  windowSize.value = { width, height }
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(`Window resized to ${width}x${height}`)
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
  <div class="min-h-screen bg-gray-800 flex items-center justify-center p-4">
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
        class="absolute -top-1 -left-1 w-3 h-3 cursor-nwse-resize"
        @mousedown="startResize($event, 'nw')"
      ></div>
      <div 
        class="absolute -top-1 -right-1 w-3 h-3 cursor-nesw-resize"
        @mousedown="startResize($event, 'ne')"
      ></div>
      <div 
        class="absolute -bottom-1 -left-1 w-3 h-3 cursor-nesw-resize"
        @mousedown="startResize($event, 'sw')"
      ></div>
      <div 
        class="absolute -bottom-1 -right-1 w-3 h-3 cursor-nwse-resize"
        @mousedown="startResize($event, 'se')"
      ></div>
      
      <!-- 拖拽句柄 - 边缘 -->
      <div 
        class="absolute -top-1 left-3 right-3 h-2 cursor-ns-resize"
        @mousedown="startResize($event, 'n')"
      ></div>
      <div 
        class="absolute -bottom-1 left-3 right-3 h-2 cursor-ns-resize"
        @mousedown="startResize($event, 's')"
      ></div>
      <div 
        class="absolute -left-1 top-3 bottom-3 w-2 cursor-ew-resize"
        @mousedown="startResize($event, 'w')"
      ></div>
      <div 
        class="absolute -right-1 top-3 bottom-3 w-2 cursor-ew-resize"
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
  <audio ref="audioPlayer" hidden></audio>
</template>

<style scoped>
.terminal-window {
  position: relative;
  margin: 0;
  font-family: Arial, sans-serif;
  transition: none;
}

.terminal-content {
  font-family: 'Courier New', Courier, monospace;
  min-width: 420px;
}

/* 拖拽句柄样式 */
.terminal-window > div[class*="absolute"] {
  background: transparent;
  z-index: 10;
}

.terminal-window > div[class*="absolute"]:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 角落拖拽句柄更明显 */
.terminal-window > div[class*="cursor-nwse-resize"],
.terminal-window > div[class*="cursor-nesw-resize"] {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* 边缘拖拽句柄 */
.terminal-window > div[class*="cursor-ns-resize"] {
  height: 4px;
}

.terminal-window > div[class*="cursor-ew-resize"] {
  width: 4px;
}

/* 防止用户选择 */
.terminal-window.resizing * {
  user-select: none;
  pointer-events: none;
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
  
  /* 移动设备上隐藏拖拽句柄 */
  .terminal-window > div[class*="absolute"] {
    display: none;
  }
}
</style>
