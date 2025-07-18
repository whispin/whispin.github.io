import * as THREE from 'three'
import { TextureGenerator } from '../utils/TextureGenerator'

export class SimpleParticleSystem {
  private scene: THREE.Scene
  private particles: THREE.Points[] = []
  private time: number = 0
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private textures: { [key: string]: THREE.Texture } = {}

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initializeTextures()
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
    this.createParticleLayer('stars', 2000, 200, [1, 1, 1], 'star')
    this.createParticleLayer('nebula', 1000, 150, [0.2, 0.8, 1.0], 'glow')
    this.createParticleLayer('energy', 500, 100, [1.0, 0.3, 0.7], 'energy')
    
    console.log('Simple particle system initialized with', this.particles.length, 'layers')
  }

  private createParticleLayer(name: string, count: number, range: number, color: number[], textureType: string = 'circle'): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // 随机位置
      positions[i3] = (Math.random() - 0.5) * range
      positions[i3 + 1] = (Math.random() - 0.5) * range
      positions[i3 + 2] = (Math.random() - 0.5) * range

      // 颜色变化
      colors[i3] = color[0] * (0.5 + Math.random() * 0.5)
      colors[i3 + 1] = color[1] * (0.5 + Math.random() * 0.5)
      colors[i3 + 2] = color[2] * (0.5 + Math.random() * 0.5)

      // 大小
      sizes[i] = Math.random() * 3 + 1
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // 获取相应的纹理
    const texture = this.textures[textureType] || this.textures.circle

    const material = new THREE.PointsMaterial({
      size: 2,
      map: texture,  // 添加纹理
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.001,  // 提高透明度测试
      sizeAttenuation: true  // 启用距离衰减
    })

    const points = new THREE.Points(geometry, material)
    points.name = name
    this.scene.add(points)
    this.particles.push(points)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    this.particles.forEach((particle, index) => {
      const rotationSpeed = 0.001 * (index + 1)
      particle.rotation.y += rotationSpeed
      particle.rotation.x += rotationSpeed * 0.5
      
      // 简单的鼠标交互
      particle.position.x += this.mouse.x * 0.1
      particle.position.y += this.mouse.y * 0.1
    })
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