import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { ColorSystem } from '../utils/ColorSystem'

export class BackgroundLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 2000 : 3000
    const depthRange: [number, number] = [120, 300]
    const sizeRange: [number, number] = [0.5, 3.0]
    
    // 使用真实恒星光谱分布生成背景色彩
    const colorPalette = [
      ColorSystem.stellarClassToColor('M'),   // 红矮星
      ColorSystem.stellarClassToColor('K'),   // 橙色巨星
      ColorSystem.stellarClassToColor('G'),   // 类太阳恒星
      ColorSystem.stellarClassToColor('F'),   // 黄白巨星
      ColorSystem.stellarClassToColor('A'),   // 白色主序星
      ColorSystem.stellarClassToColor('B'),   // 蓝白巨星
      ColorSystem.stellarClassToColor('O'),   // 蓝色超巨星
      ColorSystem.temperatureToColor(2800),   // 极红矮星
      ColorSystem.temperatureToColor(3500),   // 典型红矮星
      ColorSystem.temperatureToColor(5200),   // 橙色K型星
      ColorSystem.temperatureToColor(5800),   // 太阳色温
      ColorSystem.temperatureToColor(7000),   // 白色F型星
      ColorSystem.temperatureToColor(9000),   // 蓝白A型星
      ColorSystem.temperatureToColor(15000),  // 热B型星
      ColorSystem.temperatureToColor(30000),  // 极热O型星
    ]

    const layerConfig: LayerConfiguration = {
      intensity: 0.8,                    // 增强背景层强度
      depthBase: 0.4,                   // 提高基础深度
      depthMultiplier: 0.4,             // 增加深度范围
      orbitalSpeedMultiplier: 0.1,      // 较慢的轨道速度
      velocityMultiplier: 0.01,         // 较小的速度
      brightnessBase: 0.6,              // 提高基础亮度
      brightnessMultiplier: 0.4         // 增加亮度范围
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

  // 背景层使用真实恒星颜色并应用星际红化效应
  protected generateParticleColor(depth: number, distanceFromCenter: number): THREE.Color {
    // 生成基础恒星颜色
    let color = ColorSystem.getRealisticStellarColor()
    
    // 应用星际红化效应 - 距离越远红化越明显
    const distance = distanceFromCenter * 100 // 转换为合适的距离单位
    color = ColorSystem.applyInterstellarReddening(color, distance, 0.008)
    
    // 背景恒星亮度提升
    color.multiplyScalar(0.8 + depth * 0.6)
    
    return color
  }
}