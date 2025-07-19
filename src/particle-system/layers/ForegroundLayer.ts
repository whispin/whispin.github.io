import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { ColorSystem } from '../utils/ColorSystem'

export class ForegroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 500 : 800
    const depthRange: [number, number] = [10, 50]
    const sizeRange: [number, number] = [4.0, 15.0]
    
    // 前景层使用最亮的恒星和高能天体色彩
    const colorPalette = [
      ColorSystem.temperatureToColor(50000),  // 极热O型星 - 蓝色
      ColorSystem.temperatureToColor(30000),  // 蓝巨星
      ColorSystem.temperatureToColor(20000),  // B型超巨星 - 蓝白
      ColorSystem.temperatureToColor(15000),  // 热A型星 - 白色
      ColorSystem.temperatureToColor(12000),  // 明亮恒星
      ColorSystem.temperatureToColor(8000),   // 白色恒星
      ColorSystem.temperatureToColor(25000),  // 超新星前身星
      ColorSystem.temperatureToColor(100000), // 白矮星
      new THREE.Color(0x9370db),     // 脉冲星 - 紫色高能辐射
      new THREE.Color(0x00bfff),     // X射线源 - 深天蓝
      new THREE.Color(0xff4500),     // 伽马射线暴 - 橙红
      new THREE.Color(0x1e90ff),     // 高能粒子流 - 道奇蓝
      new THREE.Color(0xff69b4),     // 活跃星系核 - 热粉
      new THREE.Color(0x00ff00),     // 快速射电暴 - 亮绿
      new THREE.Color(0xffd700),     // 变星 - 金色
    ]
    
    const layerConfig: LayerConfiguration = {
      intensity: 1.5,                    // 进一步增强前景层强度
      depthBase: 0.9,                   // 更高的基础深度
      depthMultiplier: 0.7,             // 更大的深度范围
      orbitalSpeedMultiplier: 0.12,     // 大幅降低轨道速度 (从 0.3 降到 0.12)
      velocityMultiplier: 0.02,         // 大幅降低移动速度 (从 0.05 降到 0.02)
      brightnessBase: 1.0,              // 最大的基础亮度
      brightnessMultiplier: 0.5         // 更大的亮度范围
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
      
      // 生成轨道运动参数 - 降低速度
      const orbitalSpeed = (0.5 + Math.random() * 0.5) * (2.0 - this.particleData.depth[i])
      this.particleData.orbitalSpeed[i] = orbitalSpeed * 0.12  // 从 0.3 降到 0.12
      
      // 生成速度 - 降低各方向的移动速度
      this.particleData.velocity[i3] = (Math.random() - 0.5) * 0.02      // 从 0.05 降到 0.02
      this.particleData.velocity[i3 + 1] = (Math.random() - 0.5) * 0.008  // 从 0.02 降到 0.008
      this.particleData.velocity[i3 + 2] = (Math.random() - 0.5) * 0.02   // 从 0.05 降到 0.02
      
      // 随机相位
      this.particleData.phase[i] = Math.random() * Math.PI * 2
      
      // 粒子类型 - 前景有更多特殊类型
      const particleType = this.generateParticleType()
      this.particleData.type[i] = particleType
    }
  }

  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.1) return ParticleType.SUPERNOVA   // 10% 超新星
    if (random < 0.15) return ParticleType.PULSAR     // 5% 脉冲星
    if (random < 0.25) return ParticleType.ENERGY_FIELD // 10% 能量场
    return ParticleType.STAR // 75% 普通恒星
  }


  // 前景层使用高能天体的真实颜色
  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    // 获取当前粒子的类型  
    const particleIndex = this.particleData.type?.length || 0
    const particleType = this.particleData.type?.[particleIndex - 1] || ParticleType.STAR
    
    let color: THREE.Color
    
    // 根据粒子类型使用真实的高能天体颜色
    switch (particleType) {
      case ParticleType.SUPERNOVA:
        // 超新星：极高温度蓝白色
        color = ColorSystem.temperatureToColor(15000 + Math.random() * 10000)
        color.multiplyScalar(2.0) // 超新星极亮
        break
        
      case ParticleType.PULSAR:
        // 脉冲星：高能辐射，蓝紫色
        color = new THREE.Color(0x9370db)
        color.multiplyScalar(1.8)
        break
        
      case ParticleType.ENERGY_FIELD:
        // 高能场：X射线/伽马射线源
        const energyColors = [
          new THREE.Color(0x00bfff), // X射线蓝
          new THREE.Color(0xff4500), // 伽马射线橙
          new THREE.Color(0x00ff00), // 高能绿
          new THREE.Color(0xff69b4)  // 活跃星系核粉
        ]
        color = energyColors[Math.floor(Math.random() * energyColors.length)]
        color.multiplyScalar(1.5)
        break
        
      default: // ParticleType.STAR
        // 明亮的近距离恒星：热恒星为主
        const stellarTemp = 8000 + Math.random() * 20000 // 偏向热恒星
        color = ColorSystem.temperatureToColor(stellarTemp)
        color.multiplyScalar(1.2 + depth * 0.3)
        break
    }
    
    // 前景天体距离近，几乎无星际红化
    // 但可能有轻微的多普勒效应
    const velocity = (Math.random() - 0.5) * 10000 // ±10km/s
    color = ColorSystem.applyDopplerShift(color, velocity)
    
    // 深度增强亮度 - 前景更加明亮
    color.multiplyScalar(1.1 + depth * 0.8)
    
    return color
  }
}