import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { EnhancedShaders } from '../shaders/EnhancedShaders'

export class BackgroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 2000 : 3000
    const depthRange: [number, number] = [120, 300]
    const sizeRange: [number, number] = [0.5, 3.0]
    
    const colorPalette = [
      new THREE.Color(0xccccff),      // 淡蓝白
      new THREE.Color(0xffe6cc),      // 暖白
      new THREE.Color(0xe6ccff),      // 淡紫白
      new THREE.Color(0xccffe6),      // 淡绿白
      new THREE.Color(0xffcce6),      // 淡粉白
      new THREE.Color(0xe6ffcc),      // 淡黄白
      new THREE.Color(0xcce6ff),      // 天蓝白
      new THREE.Color(0xffcccc),      // 淡红白
      new THREE.Color(0xe6e6cc),      // 米白
      new THREE.Color(0xcccce6),      // 银白
      new THREE.Color(0xffd9cc),      // 桃色
      new THREE.Color(0xccffd9),      // 薄荷
      new THREE.Color(0xd9ccff),      // 薰衣草
      new THREE.Color(0xffffff),      // 纯白
      new THREE.Color(0xf0f0f0),      // 银灰
    ]
    
    super(
      'background',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.SPHERICAL
    )
  }

  protected generateParticles(): void {
    console.log('Generating background particles...')
    
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
      this.particleData.depth[i] = 0.2 + depthFactor * 0.3
      
      // 生成颜色 - 背景层主要是微弱的星光
      const color = this.generateParticleColor(this.particleData.depth[i], normalizedDistance)
      this.particleData.color[i3] = color.r
      this.particleData.color[i3 + 1] = color.g
      this.particleData.color[i3 + 2] = color.b
      
      // 生成大小 - 背景粒子最小
      this.particleData.size[i] = this.generateParticleSize(this.particleData.depth[i], normalizedDistance)
      
      // 生成轨道运动参数
      const orbitalSpeed = (0.1 + Math.random() * 0.2) * (1.0 - this.particleData.depth[i])
      this.particleData.orbitalSpeed[i] = orbitalSpeed * 0.1
      
      // 生成速度
      this.particleData.velocity[i3] = (Math.random() - 0.5) * 0.01
      this.particleData.velocity[i3 + 1] = (Math.random() - 0.5) * 0.005
      this.particleData.velocity[i3 + 2] = (Math.random() - 0.5) * 0.01
      
      // 随机相位
      this.particleData.phase[i] = Math.random() * Math.PI * 2
      
      // 粒子类型 - 背景主要是普通星星
      const particleType = this.generateParticleType()
      this.particleData.type[i] = particleType
    }
    
    console.log(`Generated ${this.particleCount} background particles`)
  }

  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.02) return ParticleType.NEBULA        // 2% 微弱星云
    if (random < 0.04) return ParticleType.ENERGY_FIELD  // 2% 能量场
    if (random < 0.045) return ParticleType.SUPERNOVA    // 0.5% 超新星
    if (random < 0.05) return ParticleType.PULSAR        // 0.5% 脉冲星
    return ParticleType.STAR // 95% 普通恒星
  }

  protected createMaterial(): void {
    // 直接使用简化着色器，确保稳定性
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        cameraPosition: { value: new THREE.Vector3() },
        intensity: { value: 0.4 } // 背景层较低强度
      },
      vertexShader: EnhancedShaders.getSimpleVertexShader(),
      fragmentShader: EnhancedShaders.getSimpleFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    console.log('Created simple material for background layer')
  }

  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = new THREE.Color()
    
    // 根据深度选择颜色
    const colorIndex = Math.floor(Math.random() * this.colorPalette.length)
    color.copy(this.colorPalette[colorIndex])
    
    // 背景层颜色更微弱，更接近白色
    const brightness = 0.3 + depth * 0.2
    
    color.multiplyScalar(brightness)
    color.lerp(new THREE.Color(1, 1, 1), 0.7) // 更接近白色
    
    return color
  }

  protected generateParticleSize(depth: number, _distanceFromCenter: number): number {
    const baseSize = this.sizeRange[0] + (this.sizeRange[1] - this.sizeRange[0]) * Math.random()
    const depthFactor = 0.4 + depth * 0.3
    const randomVariation = 0.5 + Math.random() * 0.8
    
    return baseSize * depthFactor * randomVariation
  }
}