import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { ColorSystem } from '../utils/ColorSystem'

export class MidgroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 1000 : 1500
    const depthRange: [number, number] = [50, 120]
    const sizeRange: [number, number] = [2.0, 8.0]
    
    // 使用真实星云发射线色彩
    const colorPalette = [
      new THREE.Color(0xdc143c),  // H-alpha (656.3nm) - 氢发射线
      new THREE.Color(0x00ff7f),  // [OIII] (500.7nm) - 氧离子
      new THREE.Color(0x4169e1),  // H-beta (486.1nm) - 氢发射线
      new THREE.Color(0xff1493),  // [SII] (671.6nm) - 硫离子
      new THREE.Color(0x008b8b),  // [NII] (658.3nm) - 氮离子
      new THREE.Color(0xffd700),  // [OIII] (495.9nm) - 氧离子
      new THREE.Color(0x800080),  // He II (468.6nm) - 氦离子
      new THREE.Color(0xff6347),  // [ArIII] (713.6nm) - 氩离子
      ColorSystem.stellarClassToColor('G'), // 类太阳恒星
      ColorSystem.stellarClassToColor('A'), // 白色恒星
      ColorSystem.stellarClassToColor('B'), // 蓝白恒星
      ColorSystem.temperatureToColor(3200), // 红巨星
      ColorSystem.temperatureToColor(6000), // 黄色恒星
      ColorSystem.temperatureToColor(12000), // 蓝色恒星
      ColorSystem.temperatureToColor(25000), // 热恒星
    ]
    
    const layerConfig: LayerConfiguration = {
      intensity: 0.8,                    // 中景层中等强度
      depthBase: 0.5,                   // 中等的基础深度
      depthMultiplier: 0.4,             // 中等的深度范围
      orbitalSpeedMultiplier: 0.08,     // 降低轨道速度 (从 0.2 降到 0.08)
      velocityMultiplier: 0.012,        // 降低移动速度 (从 0.03 降到 0.012)
      brightnessBase: 0.6,              // 中等的基础亮度
      brightnessMultiplier: 0.3         // 中等的亮度范围
    }

    super(
      'midground',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.SPIRAL,
      layerConfig
    )
  }


  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.4) return ParticleType.NEBULA        // 40% 星云
    if (random < 0.6) return ParticleType.ENERGY_FIELD  // 20% 能量场
    if (random < 0.65) return ParticleType.SUPERNOVA    // 5% 超新星
    if (random < 0.68) return ParticleType.PULSAR       // 3% 脉冲星
    return ParticleType.STAR // 32% 普通恒星
  }


  // 中景层根据粒子类型使用不同的真实颜色
  protected generateParticleColor(depth: number, distanceFromCenter: number): THREE.Color {
    // 获取当前粒子的类型
    const particleIndex = this.particleData.type?.length || 0
    const particleType = this.particleData.type?.[particleIndex - 1] || ParticleType.STAR
    
    let color: THREE.Color
    
    // 根据粒子类型使用不同的颜色策略
    if (particleType === ParticleType.NEBULA) {
      color = ColorSystem.getRealisticNebulaColor()
      // 星云粒子有发光效果
      color.multiplyScalar(1.2 + depth * 0.3)
    } else if (particleType === ParticleType.ENERGY_FIELD) {
      color = ColorSystem.temperatureToColor(50000) // 高能量场
      color.multiplyScalar(1.5)
    } else {
      // 恒星类型
      color = ColorSystem.getRealisticStellarColor()
      // 中等距离的轻微红化
      const distance = distanceFromCenter * 50
      color = ColorSystem.applyInterstellarReddening(color, distance, 0.005)
    }
    
    // 深度调节亮度
    color.multiplyScalar(0.7 + depth * 0.5)
    
    return color
  }
}