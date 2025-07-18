import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { EnhancedShaders } from '../shaders/EnhancedShaders'

export class ForegroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 500 : 800
    const depthRange: [number, number] = [10, 50]
    const sizeRange: [number, number] = [4.0, 15.0]
    
    const colorPalette = [
      new THREE.Color(1.0, 1.0, 1.0),      // 纯白星光
      new THREE.Color(0.1, 0.8, 1.0),      // 电子蓝
      new THREE.Color(0.9, 0.2, 1.0),      // 霓虹紫
      new THREE.Color(0.0, 1.0, 0.8),      // 青色光芒
      new THREE.Color(1.0, 0.4, 0.1),      // 能量橙
      new THREE.Color(0.8, 0.1, 0.8),      // 深紫色
      new THREE.Color(1.0, 0.8, 0.2),      // 金色
      new THREE.Color(0.2, 1.0, 0.4),      // 翠绿色
      new THREE.Color(1.0, 0.6, 0.8),      // 粉红色
      new THREE.Color(0.4, 0.9, 1.0),      // 天空蓝
    ]
    
    super(
      'foreground',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.GALAXY_ARM
    )
  }

  protected generateParticles(): void {
    console.log('Generating foreground particles...')
    
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
      this.particleData.depth[i] = 0.7 + depthFactor * 0.3
      
      // 生成颜色
      const color = this.generateParticleColor(this.particleData.depth[i], normalizedDistance)
      this.particleData.color[i3] = color.r
      this.particleData.color[i3 + 1] = color.g
      this.particleData.color[i3 + 2] = color.b
      
      // 生成大小 - 前景粒子更大更亮
      this.particleData.size[i] = this.generateParticleSize(this.particleData.depth[i], normalizedDistance)
      
      // 生成轨道运动参数
      const orbitalSpeed = (0.5 + Math.random() * 0.5) * (2.0 - this.particleData.depth[i])
      this.particleData.orbitalSpeed[i] = orbitalSpeed * 0.3
      
      // 生成速度
      this.particleData.velocity[i3] = (Math.random() - 0.5) * 0.05
      this.particleData.velocity[i3 + 1] = (Math.random() - 0.5) * 0.02
      this.particleData.velocity[i3 + 2] = (Math.random() - 0.5) * 0.05
      
      // 随机相位
      this.particleData.phase[i] = Math.random() * Math.PI * 2
      
      // 粒子类型 - 前景有更多特殊类型
      const particleType = this.generateParticleType()
      this.particleData.type[i] = particleType
    }
    
    console.log(`Generated ${this.particleCount} foreground particles`)
  }

  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.1) return ParticleType.SUPERNOVA   // 10% 超新星
    if (random < 0.15) return ParticleType.PULSAR     // 5% 脉冲星
    if (random < 0.25) return ParticleType.ENERGY_FIELD // 10% 能量场
    return ParticleType.STAR // 75% 普通恒星
  }

  protected createMaterial(): void {
    // 直接使用简化着色器，确保稳定性
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        cameraPosition: { value: new THREE.Vector3() },
        intensity: { value: 1.2 }
      },
      vertexShader: EnhancedShaders.getSimpleVertexShader(),
      fragmentShader: EnhancedShaders.getSimpleFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    console.log('Created simple material for foreground layer')
  }

  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = new THREE.Color()
    
    // 根据深度选择颜色
    const colorIndex = Math.floor(Math.random() * this.colorPalette.length)
    color.copy(this.colorPalette[colorIndex])
    
    // 前景粒子更亮，有更强的颜色饱和度
    const brightness = 0.8 + depth * 0.4
    const saturation = 1.0 + depth * 0.3
    
    color.multiplyScalar(brightness)
    color.lerp(color.clone().multiplyScalar(saturation), 0.3)
    
    return color
  }

  protected generateParticleSize(depth: number, _distanceFromCenter: number): number {
    const baseSize = this.sizeRange[0] + (this.sizeRange[1] - this.sizeRange[0]) * Math.random()
    const depthFactor = 0.7 + depth * 0.6  // 前景粒子基础更大
    const randomVariation = 0.8 + Math.random() * 0.4
    
    return baseSize * depthFactor * randomVariation
  }
}