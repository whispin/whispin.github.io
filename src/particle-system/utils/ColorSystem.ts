import * as THREE from 'three'

export interface ColorPalette {
  name: string
  colors: THREE.Color[]
  description: string
}

export class ColorSystem {
  private static palettes: { [key: string]: ColorPalette } = {}

  /**
   * 初始化所有颜色调色板
   */
  static initialize(): void {
    // 深空星系调色板
    this.palettes.deepSpace = {
      name: 'Deep Space',
      description: '深邃的宇宙色彩',
      colors: [
        new THREE.Color(0x1e3a8a), // 深蓝
        new THREE.Color(0x3b82f6), // 亮蓝
        new THREE.Color(0x60a5fa), // 天蓝
        new THREE.Color(0x93c5fd), // 淡蓝
        new THREE.Color(0x1e1b4b), // 深紫蓝
        new THREE.Color(0x4c1d95), // 深紫
        new THREE.Color(0x7c3aed), // 紫色
        new THREE.Color(0xa855f7), // 亮紫
      ]
    }

    // 星云调色板
    this.palettes.nebula = {
      name: 'Nebula',
      description: '星云般的绚烂色彩',
      colors: [
        new THREE.Color(0xff006e), // 品红
        new THREE.Color(0x8338ec), // 紫色
        new THREE.Color(0x3a86ff), // 蓝色
        new THREE.Color(0x06ffa5), // 青绿
        new THREE.Color(0xffbe0b), // 金色
        new THREE.Color(0xfb5607), // 橙色
        new THREE.Color(0xff4081), // 粉色
        new THREE.Color(0x00bcd4), // 青色
      ]
    }

    // 能量场调色板
    this.palettes.energy = {
      name: 'Energy Field',
      description: '高能量场色彩',
      colors: [
        new THREE.Color(0x00ff41), // 霓虹绿
        new THREE.Color(0x00d4ff), // 电光蓝
        new THREE.Color(0xff0080), // 霓虹粉
        new THREE.Color(0xffff00), // 电光黄
        new THREE.Color(0xff4000), // 能量橙
        new THREE.Color(0x8000ff), // 紫光
        new THREE.Color(0x00ffff), // 青光
        new THREE.Color(0xff8000), // 琥珀色
      ]
    }

    // 恒星调色板
    this.palettes.stellar = {
      name: 'Stellar',
      description: '恒星光谱色彩',
      colors: [
        new THREE.Color(0xffffff), // O型星 - 蓝白
        new THREE.Color(0xadd8e6), // B型星 - 蓝白
        new THREE.Color(0xffffff), // A型星 - 白色
        new THREE.Color(0xfff8dc), // F型星 - 黄白
        new THREE.Color(0xffff99), // G型星 - 黄色
        new THREE.Color(0xffa500), // K型星 - 橙色
        new THREE.Color(0xff6347), // M型星 - 红色
        new THREE.Color(0xff69b4), // 特殊星 - 粉色
      ]
    }

    // 银河系调色板
    this.palettes.galactic = {
      name: 'Galactic',
      description: '银河系色彩',
      colors: [
        new THREE.Color(0x191970), // 深空蓝
        new THREE.Color(0x483d8b), // 深蓝紫
        new THREE.Color(0x6a5acd), // 紫色
        new THREE.Color(0x9370db), // 中紫
        new THREE.Color(0xba55d3), // 兰花紫
        new THREE.Color(0xda70d6), // 兰花色
        new THREE.Color(0xff69b4), // 粉红
        new THREE.Color(0xffd700), // 金色
      ]
    }

    // 彩虹调色板
    this.palettes.rainbow = {
      name: 'Rainbow',
      description: '彩虹光谱',
      colors: [
        new THREE.Color(0xff0000), // 红
        new THREE.Color(0xff7f00), // 橙
        new THREE.Color(0xffff00), // 黄
        new THREE.Color(0x00ff00), // 绿
        new THREE.Color(0x0000ff), // 蓝
        new THREE.Color(0x4b0082), // 靛
        new THREE.Color(0x9400d3), // 紫
        new THREE.Color(0xff1493), // 深粉
      ]
    }

    console.log('Color system initialized with', Object.keys(this.palettes).length, 'palettes')
  }

  /**
   * 获取调色板
   */
  static getPalette(name: string): ColorPalette | null {
    return this.palettes[name] || null
  }

  /**
   * 获取所有调色板名称
   */
  static getPaletteNames(): string[] {
    return Object.keys(this.palettes)
  }

  /**
   * 根据位置生成颜色
   */
  static generatePositionBasedColor(position: THREE.Vector3, palette: ColorPalette): THREE.Color {
    const distance = position.length()
    const angle = Math.atan2(position.y, position.x)
    const height = Math.abs(position.z)
    
    // 根据距离选择基础颜色
    const colorIndex = Math.floor((distance / 100) * palette.colors.length) % palette.colors.length
    const baseColor = palette.colors[colorIndex].clone()
    
    // 根据角度调整色相
    const hueShift = (angle / Math.PI) * 0.1
    baseColor.offsetHSL(hueShift, 0, 0)
    
    // 根据高度调整亮度
    const brightnessAdjust = Math.min(1.0, 0.5 + (height / 50) * 0.5)
    baseColor.multiplyScalar(brightnessAdjust)
    
    return baseColor
  }

  /**
   * 根据类型生成颜色
   */
  static generateTypeBasedColor(type: number, palette: ColorPalette): THREE.Color {
    const colorIndex = Math.floor(type * palette.colors.length) % palette.colors.length
    return palette.colors[colorIndex].clone()
  }

  /**
   * 创建颜色渐变
   */
  static createGradient(color1: THREE.Color, color2: THREE.Color, steps: number): THREE.Color[] {
    const gradient: THREE.Color[] = []
    
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      const color = color1.clone().lerp(color2, t)
      gradient.push(color)
    }
    
    return gradient
  }

  /**
   * 基于时间的颜色变化
   */
  static animateColor(baseColor: THREE.Color, time: number, speed: number = 1.0): THREE.Color {
    const animated = baseColor.clone()
    
    // 色相循环
    const hueShift = Math.sin(time * speed) * 0.1
    animated.offsetHSL(hueShift, 0, 0)
    
    // 亮度脉动
    const brightnessShift = Math.sin(time * speed * 2) * 0.2
    animated.multiplyScalar(1.0 + brightnessShift)
    
    return animated
  }

  /**
   * 生成随机颜色（在调色板范围内）
   */
  static generateRandomColor(palette: ColorPalette, variation: number = 0.3): THREE.Color {
    const baseColor = palette.colors[Math.floor(Math.random() * palette.colors.length)].clone()
    
    // 添加随机变化
    const hueShift = (Math.random() - 0.5) * variation
    const satShift = (Math.random() - 0.5) * variation * 0.5
    const lightShift = (Math.random() - 0.5) * variation * 0.3
    
    baseColor.offsetHSL(hueShift, satShift, lightShift)
    
    return baseColor
  }

  /**
   * 温度映射到颜色
   */
  static temperatureToColor(temperature: number): THREE.Color {
    // 温度范围：1000K - 40000K
    const t = Math.max(1000, Math.min(40000, temperature))
    
    let r, g, b: number
    
    if (t < 6600) {
      // 红色分量
      r = 255
      // 绿色分量
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(t / 100) - 161.1195681661))
      // 蓝色分量
      if (t >= 1900) {
        b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(t / 100 - 10) - 305.0447927307))
      } else {
        b = 0
      }
    } else {
      // 红色分量
      r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(t / 100 - 60, -0.1332047592)))
      // 绿色分量
      g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(t / 100 - 60, -0.0755148492)))
      // 蓝色分量
      b = 255
    }
    
    return new THREE.Color(r / 255, g / 255, b / 255)
  }

  /**
   * 获取粒子类型的默认颜色
   */
  static getParticleTypeColor(type: number): THREE.Color {
    switch (Math.floor(type)) {
      case 0: // 普通恒星
        return new THREE.Color(0xffffff)
      case 1: // 超新星
        return new THREE.Color(0xff4444)
      case 2: // 脉冲星
        return new THREE.Color(0x44ff44)
      case 3: // 星云
        return new THREE.Color(0x4444ff)
      case 4: // 能量场
        return new THREE.Color(0xff44ff)
      default:
        return new THREE.Color(0xffffff)
    }
  }
}