import * as THREE from 'three'

export interface ColorPalette {
  primary: THREE.Color
  secondary: THREE.Color
  accent: THREE.Color
  background: THREE.Color
  foreground: THREE.Color
  glow: THREE.Color
}

export interface ThemeConfig {
  name: string
  colors: ColorPalette
  particleOpacity: number
  glowIntensity: number
  animationSpeed: number
}

export interface ThemeTransition {
  duration: number
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  startTime: number
  fromTheme: ThemeConfig
  toTheme: ThemeConfig
}

export class ThemeManager {
  private themes: Map<string, ThemeConfig> = new Map()
  private currentTheme: ThemeConfig
  private activeTransition?: ThemeTransition
  private transitionCallbacks: Array<(progress: number, currentColors: ColorPalette) => void> = []

  // 预定义主题
  private static readonly DEFAULT_THEMES: Record<string, ThemeConfig> = {
    matrix: {
      name: 'matrix',
      colors: {
        primary: new THREE.Color(0x00ff00),
        secondary: new THREE.Color(0x008800),
        accent: new THREE.Color(0x00ff88),
        background: new THREE.Color(0x000000),
        foreground: new THREE.Color(0x00ff00),
        glow: new THREE.Color(0x00ff00)
      },
      particleOpacity: 0.8,
      glowIntensity: 1.2,
      animationSpeed: 1.0
    },
    cyberpunk: {
      name: 'cyberpunk',
      colors: {
        primary: new THREE.Color(0xff0080),
        secondary: new THREE.Color(0x00ffff),
        accent: new THREE.Color(0xffff00),
        background: new THREE.Color(0x0a0a0a),
        foreground: new THREE.Color(0xff0080),
        glow: new THREE.Color(0xff0080)
      },
      particleOpacity: 0.9,
      glowIntensity: 1.5,
      animationSpeed: 1.2
    },
    ocean: {
      name: 'ocean',
      colors: {
        primary: new THREE.Color(0x0066cc),
        secondary: new THREE.Color(0x0099ff),
        accent: new THREE.Color(0x00ccff),
        background: new THREE.Color(0x001122),
        foreground: new THREE.Color(0x0099ff),
        glow: new THREE.Color(0x00ccff)
      },
      particleOpacity: 0.7,
      glowIntensity: 1.0,
      animationSpeed: 0.8
    },
    sunset: {
      name: 'sunset',
      colors: {
        primary: new THREE.Color(0xff6600),
        secondary: new THREE.Color(0xff9900),
        accent: new THREE.Color(0xffcc00),
        background: new THREE.Color(0x220011),
        foreground: new THREE.Color(0xff6600),
        glow: new THREE.Color(0xff9900)
      },
      particleOpacity: 0.8,
      glowIntensity: 1.3,
      animationSpeed: 0.9
    },
    monochrome: {
      name: 'monochrome',
      colors: {
        primary: new THREE.Color(0xffffff),
        secondary: new THREE.Color(0xcccccc),
        accent: new THREE.Color(0x888888),
        background: new THREE.Color(0x000000),
        foreground: new THREE.Color(0xffffff),
        glow: new THREE.Color(0xffffff)
      },
      particleOpacity: 0.6,
      glowIntensity: 0.8,
      animationSpeed: 1.0
    }
  }

  constructor(initialTheme: string = 'matrix') {
    // 注册默认主题
    for (const [name, theme] of Object.entries(ThemeManager.DEFAULT_THEMES)) {
      this.themes.set(name, theme)
    }

    // 设置初始主题
    this.currentTheme = this.themes.get(initialTheme) || ThemeManager.DEFAULT_THEMES.matrix

    console.log(`Theme Manager initialized with theme: ${this.currentTheme.name}`)
  }

  public registerTheme(theme: ThemeConfig): void {
    this.themes.set(theme.name, theme)
    console.log(`Theme registered: ${theme.name}`)
  }

  public setTheme(themeName: string, transitionDuration: number = 1000): boolean {
    const newTheme = this.themes.get(themeName)
    if (!newTheme) {
      console.warn(`Theme not found: ${themeName}`)
      return false
    }

    if (newTheme === this.currentTheme) {
      return true
    }

    // 开始主题过渡
    this.startTransition(this.currentTheme, newTheme, transitionDuration)
    return true
  }

  private startTransition(fromTheme: ThemeConfig, toTheme: ThemeConfig, duration: number): void {
    this.activeTransition = {
      duration,
      easing: 'easeInOut',
      startTime: Date.now(),
      fromTheme,
      toTheme
    }

    console.log(`Starting theme transition from ${fromTheme.name} to ${toTheme.name}`)
  }

  public update(): void {
    if (!this.activeTransition) return

    const elapsed = Date.now() - this.activeTransition.startTime
    const progress = Math.min(elapsed / this.activeTransition.duration, 1)

    // 应用缓动函数
    const easedProgress = this.applyEasing(progress, this.activeTransition.easing)

    // 插值颜色
    const currentColors = this.interpolateColors(
      this.activeTransition.fromTheme.colors,
      this.activeTransition.toTheme.colors,
      easedProgress
    )

    // 通知回调
    this.transitionCallbacks.forEach(callback => {
      callback(easedProgress, currentColors)
    })

    // 检查过渡是否完成
    if (progress >= 1) {
      this.currentTheme = this.activeTransition.toTheme
      this.activeTransition = undefined
      console.log(`Theme transition completed: ${this.currentTheme.name}`)
    }
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t
      case 'easeIn':
        return t * t
      case 'easeOut':
        return 1 - (1 - t) * (1 - t)
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      default:
        return t
    }
  }

  private interpolateColors(from: ColorPalette, to: ColorPalette, t: number): ColorPalette {
    return {
      primary: from.primary.clone().lerp(to.primary, t),
      secondary: from.secondary.clone().lerp(to.secondary, t),
      accent: from.accent.clone().lerp(to.accent, t),
      background: from.background.clone().lerp(to.background, t),
      foreground: from.foreground.clone().lerp(to.foreground, t),
      glow: from.glow.clone().lerp(to.glow, t)
    }
  }

  // 公共方法
  public getCurrentTheme(): ThemeConfig {
    return this.currentTheme
  }

  public getCurrentColors(): ColorPalette {
    if (this.activeTransition) {
      const elapsed = Date.now() - this.activeTransition.startTime
      const progress = Math.min(elapsed / this.activeTransition.duration, 1)
      const easedProgress = this.applyEasing(progress, this.activeTransition.easing)

      return this.interpolateColors(
        this.activeTransition.fromTheme.colors,
        this.activeTransition.toTheme.colors,
        easedProgress
      )
    }

    return this.currentTheme.colors
  }

  public getAvailableThemes(): string[] {
    return Array.from(this.themes.keys())
  }

  public isTransitioning(): boolean {
    return this.activeTransition !== undefined
  }

  public getTransitionProgress(): number {
    if (!this.activeTransition) return 1

    const elapsed = Date.now() - this.activeTransition.startTime
    return Math.min(elapsed / this.activeTransition.duration, 1)
  }

  public addTransitionCallback(callback: (progress: number, currentColors: ColorPalette) => void): void {
    this.transitionCallbacks.push(callback)
  }

  public removeTransitionCallback(callback: (progress: number, currentColors: ColorPalette) => void): void {
    const index = this.transitionCallbacks.indexOf(callback)
    if (index > -1) {
      this.transitionCallbacks.splice(index, 1)
    }
  }

  public createCustomTheme(name: string, baseTheme: string, colorOverrides: Partial<ColorPalette>): ThemeConfig | null {
    const base = this.themes.get(baseTheme)
    if (!base) {
      console.warn(`Base theme not found: ${baseTheme}`)
      return null
    }

    const customTheme: ThemeConfig = {
      name,
      colors: {
        primary: colorOverrides.primary || base.colors.primary.clone(),
        secondary: colorOverrides.secondary || base.colors.secondary.clone(),
        accent: colorOverrides.accent || base.colors.accent.clone(),
        background: colorOverrides.background || base.colors.background.clone(),
        foreground: colorOverrides.foreground || base.colors.foreground.clone(),
        glow: colorOverrides.glow || base.colors.glow.clone()
      },
      particleOpacity: base.particleOpacity,
      glowIntensity: base.glowIntensity,
      animationSpeed: base.animationSpeed
    }

    this.registerTheme(customTheme)
    return customTheme
  }

  public exportTheme(themeName: string): string | null {
    const theme = this.themes.get(themeName)
    if (!theme) return null

    const exportData = {
      name: theme.name,
      colors: {
        primary: theme.colors.primary.getHex(),
        secondary: theme.colors.secondary.getHex(),
        accent: theme.colors.accent.getHex(),
        background: theme.colors.background.getHex(),
        foreground: theme.colors.foreground.getHex(),
        glow: theme.colors.glow.getHex()
      },
      particleOpacity: theme.particleOpacity,
      glowIntensity: theme.glowIntensity,
      animationSpeed: theme.animationSpeed
    }

    return JSON.stringify(exportData, null, 2)
  }

  public importTheme(themeData: string): boolean {
    try {
      const data = JSON.parse(themeData)

      const theme: ThemeConfig = {
        name: data.name,
        colors: {
          primary: new THREE.Color(data.colors.primary),
          secondary: new THREE.Color(data.colors.secondary),
          accent: new THREE.Color(data.colors.accent),
          background: new THREE.Color(data.colors.background),
          foreground: new THREE.Color(data.colors.foreground),
          glow: new THREE.Color(data.colors.glow)
        },
        particleOpacity: data.particleOpacity,
        glowIntensity: data.glowIntensity,
        animationSpeed: data.animationSpeed
      }

      this.registerTheme(theme)
      return true
    } catch (error) {
      console.error('Failed to import theme:', error)
      return false
    }
  }

  public dispose(): void {
    this.activeTransition = undefined
    this.transitionCallbacks = []
  }
}