import * as THREE from 'three'
import { TextureGenerator } from '../utils/TextureGenerator'
import { ColorSystem } from '../utils/ColorSystem'
import type { ColorPalette } from '../utils/ColorSystem'

export class SimpleParticleSystem {
  private scene: THREE.Scene
  private particles: THREE.Points[] = []
  private time: number = 0
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private textures: { [key: string]: THREE.Texture } = {}
  private palettes: { [key: string]: ColorPalette } = {}

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initializeColorSystem()
    this.initializeTextures()
  }

  private initializeColorSystem(): void {
    // 初始化颜色系统
    ColorSystem.initialize()
    
    // 获取调色板
    this.palettes.stellar = ColorSystem.getPalette('stellar')!
    this.palettes.nebula = ColorSystem.getPalette('nebula')!
    this.palettes.energy = ColorSystem.getPalette('energy')!
    this.palettes.galactic = ColorSystem.getPalette('galactic')!
    this.palettes.deepSpace = ColorSystem.getPalette('deepSpace')!
    
    console.log('Color system initialized with', Object.keys(this.palettes).length, 'palettes')
  }

  private initializeTextures(): void {
    // 创建不同类型的粒子纹理
    this.textures.circle = TextureGenerator.createCircleTexture(64, 0.2, 0.5)
    this.textures.star = TextureGenerator.createStarTexture(64)
    this.textures.glow = TextureGenerator.createGlowTexture(64, 1.0)
    this.textures.energy = TextureGenerator.createEnergyTexture(64)
    
    console.log('Particle textures initialized')
  }

  public initialize(): void {
    this.createParticleLayer('stars', 2000, 200, 'stellar', 'star')
    this.createParticleLayer('nebula', 1000, 150, 'nebula', 'glow')
    this.createParticleLayer('energy', 500, 100, 'energy', 'energy')
    this.createParticleLayer('galactic', 800, 180, 'galactic', 'circle')
    this.createParticleLayer('deepSpace', 1200, 250, 'deepSpace', 'glow')
    
    console.log('Simple particle system initialized with', this.particles.length, 'layers')
  }

  private createParticleLayer(name: string, count: number, range: number, paletteName: string, textureType: string = 'circle'): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const particleTypes = new Float32Array(count)

    const palette = this.palettes[paletteName]
    if (!palette) {
      console.error(`Palette ${paletteName} not found`)
      return
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // 随机位置
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * range,
        (Math.random() - 0.5) * range,
        (Math.random() - 0.5) * range
      )
      
      positions[i3] = position.x
      positions[i3 + 1] = position.y
      positions[i3 + 2] = position.z

      // 根据位置和类型生成丰富的颜色
      const particleType = Math.random()
      particleTypes[i] = particleType
      
      let finalColor: THREE.Color
      
      if (name === 'stars') {
        // 恒星：使用温度映射
        const temperature = 2000 + Math.random() * 30000
        finalColor = ColorSystem.temperatureToColor(temperature)
      } else if (name === 'nebula') {
        // 星云：使用位置基础颜色
        finalColor = ColorSystem.generatePositionBasedColor(position, palette)
      } else if (name === 'energy') {
        // 能量场：使用动态颜色
        const baseColor = ColorSystem.generateRandomColor(palette, 0.4)
        finalColor = ColorSystem.animateColor(baseColor, Math.random() * 10)
      } else {
        // 其他：使用随机颜色
        finalColor = ColorSystem.generateRandomColor(palette, 0.3)
      }
      
      // 添加距离基础的亮度调整 - 增强明亮度
      const distance = position.length()
      const brightness = Math.max(0.6, Math.min(1.5, 1.2 - distance / (range * 1.2)))
      finalColor.multiplyScalar(brightness)
      
      colors[i3] = finalColor.r
      colors[i3 + 1] = finalColor.g
      colors[i3 + 2] = finalColor.b

      // 大小变化
      let sizeMultiplier = 1.0
      if (name === 'stars') {
        sizeMultiplier = 0.5 + Math.random() * 2.0 // 恒星大小变化大
      } else if (name === 'nebula') {
        sizeMultiplier = 1.0 + Math.random() * 1.5 // 星云中等大小
      } else if (name === 'energy') {
        sizeMultiplier = 0.8 + Math.random() * 1.2 // 能量场较小
      }
      
      sizes[i] = (Math.random() * 3 + 1) * sizeMultiplier
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('particleType', new THREE.BufferAttribute(particleTypes, 1))

    // 获取相应的纹理
    const texture = this.textures[textureType] || this.textures.circle

    const material = new THREE.PointsMaterial({
      size: 3,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.3,
      sizeAttenuation: true
    })

    const points = new THREE.Points(geometry, material)
    points.name = name
    this.scene.add(points)
    this.particles.push(points)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    this.particles.forEach((particle, index) => {
      const rotationSpeed = 0.0004 * (index + 1)  // 从 0.001 降低到 0.0004
      particle.rotation.y += rotationSpeed
      particle.rotation.x += rotationSpeed * 0.5
      
      // 简单的鼠标交互 - 降低移动幅度
      particle.position.x += this.mouse.x * 0.04  // 从 0.1 降低到 0.04
      particle.position.y += this.mouse.y * 0.04  // 从 0.1 降低到 0.04
      
      // 动态颜色更新（每隔一段时间更新一次以提高性能）
      if (Math.floor(this.time * 10) % 10 === 0) {
        this.updateParticleColors(particle)
      }
    })
  }

  private updateParticleColors(particle: THREE.Points): void {
    const colorAttribute = particle.geometry.getAttribute('color') as THREE.BufferAttribute
    const positionAttribute = particle.geometry.getAttribute('position') as THREE.BufferAttribute
    const particleTypeAttribute = particle.geometry.getAttribute('particleType') as THREE.BufferAttribute
    
    if (!colorAttribute || !positionAttribute || !particleTypeAttribute) return
    
    const particleName = particle.name
    // const palette = this.palettes[particleName] || this.palettes.stellar
    
    for (let i = 0; i < colorAttribute.count; i++) {
      // const i3 = i * 3 // Not used in current implementation
      
      // 获取当前颜色
      const currentColor = new THREE.Color(
        colorAttribute.getX(i),
        colorAttribute.getY(i),
        colorAttribute.getZ(i)
      )
      
      // 根据时间添加颜色动画
      let animatedColor = currentColor
      
      if (particleName === 'energy') {
        // 能量场粒子有更强的颜色动画 - 降低速度
        animatedColor = ColorSystem.animateColor(currentColor, this.time, 0.8)  // 从 2.0 降到 0.8
      } else if (particleName === 'stars') {
        // 恒星有微弱的闪烁 - 降低速度
        animatedColor = ColorSystem.animateColor(currentColor, this.time, 0.2)  // 从 0.5 降到 0.2
      } else if (particleName === 'nebula') {
        // 星云有慢速的颜色变化 - 进一步降低速度
        animatedColor = ColorSystem.animateColor(currentColor, this.time, 0.12) // 从 0.3 降到 0.12
      }
      
      // 应用鼠标交互的颜色增强
      const mouseDistance = Math.sqrt(this.mouse.x * this.mouse.x + this.mouse.y * this.mouse.y)
      if (mouseDistance > 0.1) {
        const enhancement = Math.min(1.5, 1.0 + mouseDistance * 0.3)
        animatedColor.multiplyScalar(enhancement)
      }
      
      // 更新颜色
      colorAttribute.setXYZ(i, animatedColor.r, animatedColor.g, animatedColor.b)
    }
    
    colorAttribute.needsUpdate = true
  }

  public updateMouse(x: number, y: number): void {
    this.mouse.set(x, y)
  }

  public dispose(): void {
    this.particles.forEach(particle => {
      this.scene.remove(particle)
      particle.geometry.dispose()
      if (particle.material instanceof THREE.Material) {
        particle.material.dispose()
      }
    })
    this.particles = []
    
    // 释放纹理
    Object.values(this.textures).forEach(texture => {
      texture.dispose()
    })
    this.textures = {}
  }

  public getParticleCount(): number {
    return this.particles.reduce((total, particle) => {
      return total + (particle.geometry.attributes.position.count || 0)
    }, 0)
  }
}