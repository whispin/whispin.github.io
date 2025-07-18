import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { EnhancedShaders } from '../shaders/EnhancedShaders'

export class MidgroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 1000 : 1500
    const depthRange: [number, number] = [50, 120]
    const sizeRange: [number, number] = [2.0, 8.0]
    
    const colorPalette = [
      new THREE.Color(0.2, 0.6, 1.0),      // 深蓝星云
      new THREE.Color(1.0, 0.3, 0.6),      // 洋红星云
      new THREE.Color(0.4, 1.0, 0.3),      // 绿色星云
      new THREE.Color(1.0, 0.7, 0.2),      // 橙色星云
      new THREE.Color(0.6, 0.2, 1.0),      // 紫色星云
      new THREE.Color(0.3, 1.0, 0.9),      // 青色星云
      new THREE.Color(1.0, 0.4, 0.4),      // 红色星云
      new THREE.Color(0.8, 0.8, 0.2),      // 黄色星云
      new THREE.Color(0.5, 0.3, 0.8),      // 深紫星云
      new THREE.Color(0.2, 0.8, 0.5),      // 翠绿星云
    ]
    
    super(
      'midground',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.SPIRAL
    )
  }

  protected generateParticles(): void {
    console.log('Generating midground particles...')
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      
      // 生成3D空间位置
      const position = this.generateSpatialPosition(i)
      this.particleData.position[i3] = position.x
      this.particleData.position[i3 + 1] = position.y
      this.particleData.position[i3 + 2] = position.z
      
      // 计算深度因子
      const distanceFromCenter = position.length()
      const normalizedDistance = (distanceFromCenter - this.depthRange[0]) / (this.depthRange[1] - this.depthRange[0])
      const depthFactor = 1.0 - Math.max(0, Math.min(1, normalizedDistance))
      this.particleData.depth[i] = 0.5 + depthFactor * 0.4
      
      // 生成颜色 - 中景层有更多彩色星云
      const color = this.generateParticleColor(this.particleData.depth[i], normalizedDistance)
      this.particleData.color[i3] = color.r
      this.particleData.color[i3 + 1] = color.g
      this.particleData.color[i3 + 2] = color.b
      
      // 生成大小 - 中景粒子中等大小
      this.particleData.size[i] = this.generateParticleSize(this.particleData.depth[i], normalizedDistance)
      
      // 生成轨道运动参数
      const orbitalSpeed = (0.3 + Math.random() * 0.4) * (1.5 - this.particleData.depth[i])
      this.particleData.orbitalSpeed[i] = orbitalSpeed * 0.2
      
      // 生成速度
      this.particleData.velocity[i3] = (Math.random() - 0.5) * 0.03
      this.particleData.velocity[i3 + 1] = (Math.random() - 0.5) * 0.015
      this.particleData.velocity[i3 + 2] = (Math.random() - 0.5) * 0.03
      
      // 随机相位
      this.particleData.phase[i] = Math.random() * Math.PI * 2
      
      // 粒子类型 - 中景主要是星云和能量场
      const particleType = this.generateParticleType()
      this.particleData.type[i] = particleType
    }
    
    console.log(`Generated ${this.particleCount} midground particles`)
  }

  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.4) return ParticleType.NEBULA        // 40% 星云
    if (random < 0.6) return ParticleType.ENERGY_FIELD  // 20% 能量场
    if (random < 0.65) return ParticleType.SUPERNOVA    // 5% 超新星
    if (random < 0.68) return ParticleType.PULSAR       // 3% 脉冲星
    return ParticleType.STAR // 32% 普通恒星
  }

  protected createMaterial(): void {
    // 直接使用简化着色器，确保稳定性
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        cameraPosition: { value: new THREE.Vector3() },
        intensity: { value: 0.8 } // 中景层中等强度
      },
      vertexShader: EnhancedShaders.getSimpleVertexShader(),
      fragmentShader: EnhancedShaders.getSimpleFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    console.log('Created simple material for midground layer')
  }

  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = new THREE.Color()
    
    // 根据深度选择颜色
    const colorIndex = Math.floor(Math.random() * this.colorPalette.length)
    color.copy(this.colorPalette[colorIndex])
    
    // 中景层有更丰富的颜色变化
    const brightness = 0.6 + depth * 0.3
    
    color.multiplyScalar(brightness)
    
    // 添加颜色变化
    const hue = Math.random() * 0.1 - 0.05
    color.offsetHSL(hue, 0, 0)
    
    return color
  }

  protected generateParticleSize(depth: number, _distanceFromCenter: number): number {
    const baseSize = this.sizeRange[0] + (this.sizeRange[1] - this.sizeRange[0]) * Math.random()
    const depthFactor = 0.6 + depth * 0.4
    const randomVariation = 0.7 + Math.random() * 0.6
    
    return baseSize * depthFactor * randomVariation
  }
}