import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'

export class MidgroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 1000 : 1500
    const depthRange: [number, number] = [50, 120]
    const sizeRange: [number, number] = [2.0, 8.0]
    
    const colorPalette = [
      new THREE.Color(0x3399ff),      // 深蓝星云
      new THREE.Color(0xff4d99),      // 洋红星云
      new THREE.Color(0x66ff4d),      // 绿色星云
      new THREE.Color(0xffb333),      // 橙色星云
      new THREE.Color(0x9933ff),      // 紫色星云
      new THREE.Color(0x4dffe6),      // 青色星云
      new THREE.Color(0xff6666),      // 红色星云
      new THREE.Color(0xcccc33),      // 黄色星云
      new THREE.Color(0x804dcc),      // 深紫星云
      new THREE.Color(0x33cc80),      // 翠绿星云
      new THREE.Color(0xff8033),      // 珊瑚橙
      new THREE.Color(0x8033ff),      // 深紫蓝
      new THREE.Color(0x33ff80),      // 春绿
      new THREE.Color(0xff3380),      // 玫瑰红
      new THREE.Color(0x3380ff),      // 钴蓝
    ]
    
    const layerConfig: LayerConfiguration = {
      intensity: 0.8,                    // 中景层中等强度
      depthBase: 0.5,                   // 中等的基础深度
      depthMultiplier: 0.4,             // 中等的深度范围
      orbitalSpeedMultiplier: 0.2,      // 中等的轨道速度
      velocityMultiplier: 0.03,         // 中等的速度
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


  // 中景层有更丰富的颜色变化
  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = super.generateParticleColor(depth, _distanceFromCenter)
    
    // 添加颜色变化
    const hue = Math.random() * 0.1 - 0.05
    color.offsetHSL(hue, 0, 0)
    
    return color
  }
}