import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'

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

    const layerConfig: LayerConfiguration = {
      intensity: 0.4,                    // 背景层较低强度
      depthBase: 0.2,                   // 较低的基础深度
      depthMultiplier: 0.3,             // 较小的深度范围
      orbitalSpeedMultiplier: 0.1,      // 较慢的轨道速度
      velocityMultiplier: 0.01,         // 较小的速度
      brightnessBase: 0.3,              // 较低的基础亮度
      brightnessMultiplier: 0.2         // 较小的亮度范围
    }
    
    super(
      'background',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.SPHERICAL,
      layerConfig
    )
  }

  // 背景层的粒子类型分布与默认不同
  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.02) return ParticleType.NEBULA        // 2% 微弱星云
    if (random < 0.04) return ParticleType.ENERGY_FIELD  // 2% 能量场
    if (random < 0.045) return ParticleType.SUPERNOVA    // 0.5% 超新星
    if (random < 0.05) return ParticleType.PULSAR        // 0.5% 脉冲星
    return ParticleType.STAR // 95% 普通恒星
  }

  // 背景层需要特殊的颜色处理 - 更接近白色
  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = super.generateParticleColor(depth, _distanceFromCenter)
    // 背景层特殊处理：更接近白色
    color.lerp(new THREE.Color(1, 1, 1), 0.7)
    return color
  }
}