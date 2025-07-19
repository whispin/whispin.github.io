import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'

export class ForegroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 500 : 800
    const depthRange: [number, number] = [10, 50]
    const sizeRange: [number, number] = [4.0, 15.0]
    
    const colorPalette = [
      new THREE.Color(0xffffff),      // 纯白星光
      new THREE.Color(0x1affff),      // 电子蓝
      new THREE.Color(0xe632ff),      // 霓虹紫
      new THREE.Color(0x00ffcc),      // 青色光芒
      new THREE.Color(0xff6619),      // 能量橙
      new THREE.Color(0xcc19cc),      // 深紫色
      new THREE.Color(0xffcc32),      // 金色
      new THREE.Color(0x32ff66),      // 翠绿色
      new THREE.Color(0xff9932),      // 粉红色
      new THREE.Color(0x66e6ff),      // 天空蓝
      new THREE.Color(0xff3366),      // 珊瑚红
      new THREE.Color(0x9933ff),      // 紫罗兰
      new THREE.Color(0x33ff99),      // 薄荷绿
      new THREE.Color(0xff9933),      // 暖橙
      new THREE.Color(0x3399ff),      // 天蓝
    ]
    
    const layerConfig: LayerConfiguration = {
      intensity: 1.2,                    // 前景层最高强度
      depthBase: 0.8,                   // 最高的基础深度
      depthMultiplier: 0.6,             // 最大的深度范围
      orbitalSpeedMultiplier: 0.3,      // 最快的轨道速度
      velocityMultiplier: 0.05,         // 最大的速度
      brightnessBase: 0.8,              // 最高的基础亮度
      brightnessMultiplier: 0.4         // 最大的亮度范围
    }

    super(
      'foreground',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.GALAXY_ARM,
      layerConfig
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


  // 前景粒子更亮，有更强的颜色饱和度
  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = super.generateParticleColor(depth, _distanceFromCenter)
    
    // 前景层特殊处理：增强饱和度
    const saturation = 1.0 + depth * 0.3
    color.lerp(color.clone().multiplyScalar(saturation), 0.3)
    
    return color
  }
}