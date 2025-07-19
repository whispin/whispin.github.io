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

    // 真实星云发射线调色板
    this.palettes.nebula = {
      name: 'Realistic Nebula',
      description: '基于真实发射线光谱的星云色彩',
      colors: [
        new THREE.Color(0xdc143c),  // H-alpha (656.3nm) - 氢发射线，深红色
        new THREE.Color(0x00ff7f),  // [OIII] (500.7nm) - 氧离子，绿色
        new THREE.Color(0x4169e1),  // H-beta (486.1nm) - 氢发射线，蓝色
        new THREE.Color(0xff1493),  // [SII] (671.6nm) - 硫离子，深粉红
        new THREE.Color(0x008b8b),  // [NII] (658.3nm) - 氮离子，暗青色
        new THREE.Color(0xffd700),  // [OIII] (495.9nm) - 氧离子，金绿色
        new THREE.Color(0x800080),  // He II (468.6nm) - 氦离子，紫色
        new THREE.Color(0xff6347),  // [ArIII] (713.6nm) - 氩离子，橙红色
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

    // 真实恒星光谱分类调色板
    this.palettes.stellar = {
      name: 'Realistic Stellar Classification',
      description: '基于Morgan-Keenan光谱分类的真实恒星色彩',
      colors: [
        this.stellarClassToColor('O'),  // O型星：蓝色，40000K
        this.stellarClassToColor('B'),  // B型星：蓝白色，20000K
        this.stellarClassToColor('A'),  // A型星：白色，8500K
        this.stellarClassToColor('F'),  // F型星：黄白色，6500K
        this.stellarClassToColor('G'),  // G型星：黄色，5500K (太阳型)
        this.stellarClassToColor('K'),  // K型星：橙色，4000K
        this.stellarClassToColor('M'),  // M型星：红色，3000K
        this.stellarClassToColor('L'),  // L型星：褐矮星，1800K
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
   * 创建平滑的颜色渐变 (使用更好的插值算法)
   */
  static createGradient(color1: THREE.Color, color2: THREE.Color, steps: number): THREE.Color[] {
    const gradient: THREE.Color[] = []
    
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      // 使用三次贝塞尔曲线进行平滑插值
      const smoothT = t * t * (3 - 2 * t)
      const color = color1.clone().lerp(color2, smoothT)
      gradient.push(color)
    }
    
    return gradient
  }

  /**
   * 高质量色彩混合 (使用Lab色彩空间)
   */
  static blendColorsLab(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
    // 简化的Lab色彩空间混合
    const r1 = Math.pow(color1.r, 2.2)
    const g1 = Math.pow(color1.g, 2.2) 
    const b1 = Math.pow(color1.b, 2.2)
    
    const r2 = Math.pow(color2.r, 2.2)
    const g2 = Math.pow(color2.g, 2.2)
    const b2 = Math.pow(color2.b, 2.2)
    
    const r = Math.pow(r1 + (r2 - r1) * factor, 1/2.2)
    const g = Math.pow(g1 + (g2 - g1) * factor, 1/2.2)
    const b = Math.pow(b1 + (b2 - b1) * factor, 1/2.2)
    
    return new THREE.Color(r, g, b)
  }

  /**
   * 自适应颜色亮度调整
   */
  static adaptiveBrightness(color: THREE.Color, targetLuminance: number): THREE.Color {
    const adjusted = color.clone()
    
    // 计算感知亮度 (使用WCAG标准)
    const currentLuminance = 0.299 * adjusted.r + 0.587 * adjusted.g + 0.114 * adjusted.b
    
    if (currentLuminance > 0) {
      const scale = targetLuminance / currentLuminance
      adjusted.multiplyScalar(scale)
    }
    
    // 确保颜色值在有效范围内
    adjusted.r = Math.min(1, adjusted.r)
    adjusted.g = Math.min(1, adjusted.g)
    adjusted.b = Math.min(1, adjusted.b)
    
    return adjusted
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
   * 精确的黑体辐射温度到颜色转换
   * 基于Planck定律和CIE色彩空间
   */
  static temperatureToColor(temperature: number): THREE.Color {
    // 温度范围：800K - 50000K (扩展范围以支持更多恒星类型)
    const t = Math.max(800, Math.min(50000, temperature))
    
    let r, g, b: number
    
    // 使用更精确的黑体辐射公式
    if (t < 6600) {
      // 低温恒星 (红矮星、红巨星)
      r = 255
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(t / 100) - 161.1195681661))
      if (t >= 1900) {
        b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(t / 100 - 10) - 305.0447927307))
      } else {
        b = 0
      }
    } else {
      // 高温恒星 (蓝巨星、白矮星)
      r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(t / 100 - 60, -0.1332047592)))
      g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(t / 100 - 60, -0.0755148492)))
      b = 255
    }
    
    // 归一化并应用伽马校正
    const gamma = 2.2
    r = Math.pow(r / 255, 1 / gamma)
    g = Math.pow(g / 255, 1 / gamma)
    b = Math.pow(b / 255, 1 / gamma)
    
    return new THREE.Color(r, g, b)
  }

  /**
   * 恒星光谱分类到颜色映射 (Morgan-Keenan系统)
   */
  static stellarClassToColor(spectralClass: string): THREE.Color {
    const classMap: { [key: string]: number } = {
      'O': 40000,  // O型星：蓝色，极热
      'B': 20000,  // B型星：蓝白色，很热
      'A': 8500,   // A型星：白色，热
      'F': 6500,   // F型星：黄白色，中热
      'G': 5500,   // G型星：黄色，中等温度 (太阳型)
      'K': 4000,   // K型星：橙色，较冷
      'M': 3000,   // M型星：红色，冷
      'L': 1800,   // L型星：褐矮星，极冷
      'T': 1200    // T型星：褐矮星，超冷
    }
    
    const temp = classMap[spectralClass.charAt(0).toUpperCase()] || 5500
    return this.temperatureToColor(temp)
  }

  /**
   * 获取现实恒星类型的颜色分布
   */
  static getRealisticStellarColor(): THREE.Color {
    const rand = Math.random()
    
    // 基于实际恒星分布的概率
    if (rand < 0.76) return this.stellarClassToColor('M')      // 76% 红矮星
    if (rand < 0.88) return this.stellarClassToColor('K')      // 12% K型星
    if (rand < 0.96) return this.stellarClassToColor('G')      // 8% G型星 (类太阳)
    if (rand < 0.98) return this.stellarClassToColor('F')      // 2% F型星
    if (rand < 0.99) return this.stellarClassToColor('A')      // 1% A型星
    if (rand < 0.995) return this.stellarClassToColor('B')     // 0.5% B型星
    return this.stellarClassToColor('O')                       // 0.5% O型星
  }

  /**
   * 生成真实的星云发射线颜色
   */
  static getRealisticNebulaColor(): THREE.Color {
    const rand = Math.random()
    
    // 基于实际发射线强度的概率分布
    if (rand < 0.40) return new THREE.Color(0xdc143c)   // 40% H-alpha 红色
    if (rand < 0.65) return new THREE.Color(0x00ff7f)   // 25% [OIII] 绿色
    if (rand < 0.80) return new THREE.Color(0x4169e1)   // 15% H-beta 蓝色
    if (rand < 0.90) return new THREE.Color(0xff1493)   // 10% [SII] 粉红
    if (rand < 0.96) return new THREE.Color(0x008b8b)   // 6% [NII] 青色
    if (rand < 0.98) return new THREE.Color(0xffd700)   // 2% [OIII] 金绿
    if (rand < 0.99) return new THREE.Color(0x800080)   // 1% He II 紫色
    return new THREE.Color(0xff6347)                    // 1% [ArIII] 橙红
  }

  /**
   * 应用星际红化效应
   */
  static applyInterstellarReddening(color: THREE.Color, distance: number, extinction: number = 0.01): THREE.Color {
    const reddened = color.clone()
    
    // 计算消光程度 (基于距离)
    const extFactor = Math.exp(-extinction * distance)
    
    // 蓝光更容易被散射，红光穿透力更强
    const wavelengthEffect = {
      r: 1.0,      // 红光几乎不受影响
      g: 0.85,     // 绿光轻微衰减
      b: 0.65      // 蓝光明显衰减
    }
    
    reddened.r *= extFactor * wavelengthEffect.r
    reddened.g *= extFactor * wavelengthEffect.g
    reddened.b *= extFactor * wavelengthEffect.b
    
    return reddened
  }

  /**
   * 应用多普勒红移效应
   */
  static applyDopplerShift(color: THREE.Color, velocity: number): THREE.Color {
    const shifted = color.clone()
    
    // 计算红移因子 (v/c)
    const c = 299792458 // 光速 m/s
    const redshift = velocity / c
    
    // 简化的红移效应：频率降低，波长增加
    if (redshift > 0) {
      // 远离观察者：红移
      shifted.offsetHSL(redshift * 0.1, 0, -redshift * 0.2)
    } else {
      // 接近观察者：蓝移
      shifted.offsetHSL(redshift * 0.1, 0, -redshift * 0.2)
    }
    
    return shifted
  }

  /**
   * 获取基于粒子类型的真实颜色
   */
  static getParticleTypeColor(type: number): THREE.Color {
    switch (Math.floor(type)) {
      case 0: // 普通恒星 - 使用真实分布
        return this.getRealisticStellarColor()
      case 1: // 超新星 - 高温蓝白色
        return this.temperatureToColor(15000)
      case 2: // 脉冲星 - 快速旋转中子星，蓝白色
        return this.temperatureToColor(28000)
      case 3: // 星云 - 使用真实发射线
        return this.getRealisticNebulaColor()
      case 4: // 能量场 - 高能X射线源，蓝紫色
        return this.temperatureToColor(50000)
      default:
        return this.getRealisticStellarColor()
    }
  }
}