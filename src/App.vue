<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'

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

// 计算当前主题样式
const themeClasses = computed(() => themes[currentTheme.value as keyof typeof themes])

// ASCII艺术字
const asciiArt = [
  "██╗███╗   ██╗██████╗ ███████╗██╗  ██╗",
  "██║████╗  ██║██╔══██╗██╔════╝╚██╗██╔╝",
  "██║██╔██╗ ██║██║  ██║█████╗   ╚███╔╝ ",
  "██║██║╚██╗██║██║  ██║██╔══╝   ██╔██╗ ",
  "██║██║ ╚████║██████╔╝███████╗██╔╝ ██╗",
  "╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝"
]

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
  // ASCII艺术字
  for (const line of asciiArt) {
    terminalOutput.value.push({ type: 'info', content: '' })
    await typeText(line, 20)
  }

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
  await typeText('Welcome to whispin Terminal v2.0')

  terminalOutput.value.push({ type: 'info', content: '' })
  await typeText('Type "help" to see available commands.')

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
  'mkdir', 'touch'
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
      await showHelp()
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
      await playMusic()
      break
    case 'tools':
      await showTools()
      break
    default:
      terminalOutput.value.push({
        type: 'error',
        content: `'${command}' is not recognized as an internal or external command.`
      })
  }
}

// 命令实现
const showHelp = async () => {
  const helpText = [
    'Available commands:',
    '',
    '  help       - Show this help message',
    '  clear/cls  - Clear the terminal screen',
    '  ping <url> - Ping a domain or IP address',
    '  ls/dir     - List files in current directory',
    '  cd <path>  - Change directory',
    '  cat <file> - Display file contents',
    '  github     - Show GitHub profile information',
    '  theme <name> - Change terminal theme (classic, green, amber, blue, purple)',
    '  history    - Show command history',
    '  whoami     - Display current user',
    '  date       - Show current date and time',
    '  echo <text> - Display text',
    '  music      - Play a playlist',
    '  tools      - Open tools page'
  ]

  for (const line of helpText) {
    terminalOutput.value.push({ type: 'output', content: '' })
    await typeText(line, 15)
  }
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
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText(text || '')
}

const playMusic = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('🎵 Now playing: Coding Beats Playlist')
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('♪ Track: "Smooth Operator" - Lo-fi Hip Hop')
}

const showTools = async () => {
  terminalOutput.value.push({ type: 'output', content: '' })
  await typeText('Opening tools page...')
  setTimeout(() => {
    window.open('https://coley.software/tools', '_blank')
  }, 1000)
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
  inputRef.value?.focus()
}
</script>

<template>
  <div class="min-h-screen bg-gray-800 flex items-center justify-center p-4">
    <!-- 终端窗口 -->
    <div
        class="terminal-window border border-white font-arial min-w-[420px] max-w-4xl w-full"
        @click="handleTerminalClick"
    >
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
          'terminal-content font-mono p-3 h-96 overflow-y-auto',
          themeClasses.bg,
          themeClasses.text
        ]"
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
</template>

<style scoped>
.terminal-window {
  position: relative;
  margin: 0;
  font-family: Arial, sans-serif;
}

.terminal-content {
  font-family: 'Courier New', Courier, monospace;
  min-width: 420px;
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
</style>
