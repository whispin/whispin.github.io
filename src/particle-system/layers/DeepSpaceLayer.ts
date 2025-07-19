import * as THREE from 'three'
import { ParticleLayer } from '../ParticleLayer'
import type { LayerConfiguration } from '../ParticleLayer'
import { SpatialDistribution, ParticleType } from '../types'
import { ColorSystem } from '../utils/ColorSystem'

/**
 * 深空背景层 - 创造最远层次的宇宙背景
 * 模拟极远距离的星系、类星体和宇宙背景辐射
 */
export class DeepSpaceLayer extends ParticleLayer {
  constructor() {
    const particleCount = window.innerWidth < 640 ? 4000 : 6000
    const depthRange: [number, number] = [300, 800]
    const sizeRange: [number, number] = [0.2, 1.5]
    
    // 使用极远距离天体的真实颜色 - 红移效应明显
    const colorPalette = [
      ColorSystem.temperatureToColor(2200),    // 极冷红矮星
      ColorSystem.temperatureToColor(2800),    // 褐矮星
      ColorSystem.temperatureToColor(3200),    // 红巨星
      ColorSystem.temperatureToColor(3800),    // K型矮星
      ColorSystem.temperatureToColor(4500),    // 冷G型星
      // 远距离类星体和活跃星系核（受红移影响）
      new THREE.Color(0x8b0000).multiplyScalar(0.8),  // 深红 - 红移类星体
      new THREE.Color(0x4b0000).multiplyScalar(0.7),  // 极深红 - 高红移星系
      new THREE.Color(0x654321).multiplyScalar(0.6),  // 棕色 - 古老星系
      new THREE.Color(0x2f1b14).multiplyScalar(0.5),  // 深棕 - 原始星系
      new THREE.Color(0x1a1a2e).multiplyScalar(0.4),  // 深蓝紫 - 宇宙背景
    ]
    
    const layerConfig: LayerConfiguration = {
      intensity: 0.4,                    // 较低强度，模拟极远距离
      depthBase: 0.2,                   // 低基础深度
      depthMultiplier: 0.3,             // 小深度范围
      orbitalSpeedMultiplier: 0.01,     // 极慢的运动
      velocityMultiplier: 0.001,        // 几乎静止
      brightnessBase: 0.3,              // 低基础亮度
      brightnessMultiplier: 0.2         // 小亮度范围
    }
    
    super(
      'deepSpace',
      particleCount,
      depthRange,
      sizeRange,
      colorPalette,
      SpatialDistribution.SPHERICAL,
      layerConfig
    )
  }

  protected generateParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      
      // 生成更均匀分布的深空位置
      const position = this.generateDeepSpacePosition()
      this.particleData.position[i3] = position.x
      this.particleData.position[i3 + 1] = position.y
      this.particleData.position[i3 + 2] = position.z
      
      // 深空天体的深度因子计算
      const distanceFromCenter = position.length()
      const normalizedDistance = (distanceFromCenter - this.depthRange[0]) / (this.depthRange[1] - this.depthRange[0])
      const depthFactor = Math.max(0, Math.min(1, normalizedDistance))
      this.particleData.depth[i] = 0.1 + depthFactor * 0.3 // 很低的深度值
      
      // 生成深空天体颜色
      const color = this.generateDeepSpaceColor(this.particleData.depth[i], normalizedDistance)
      this.particleData.color[i3] = color.r
      this.particleData.color[i3 + 1] = color.g
      this.particleData.color[i3 + 2] = color.b
      
      // 极小的粒子大小
      this.particleData.size[i] = this.generateParticleSize(this.particleData.depth[i], normalizedDistance)
      
      // 极慢的运动
      this.particleData.orbitalSpeed[i] = (0.1 + Math.random() * 0.2) * 0.01
      
      // 几乎静止的速度
      this.particleData.velocity[i3] = (Math.random() - 0.5) * 0.001
      this.particleData.velocity[i3 + 1] = (Math.random() - 0.5) * 0.0005
      this.particleData.velocity[i3 + 2] = (Math.random() - 0.5) * 0.001
      
      // 随机相位
      this.particleData.phase[i] = Math.random() * Math.PI * 2
      
      // 主要是古老恒星和远距离星系
      this.particleData.type[i] = this.generateDeepSpaceType()
    }
  }

  /**
   * 生成深空位置 - 更均匀的球形分布
   */
  private generateDeepSpacePosition(): THREE.Vector3 {
    // 使用更均匀的球形分布
    const phi = Math.acos(1 - 2 * Math.random()) // 0 到 π
    const theta = 2 * Math.PI * Math.random()    // 0 到 2π
    
    // 距离随机分布，偏向更远的距离
    const minRadius = this.depthRange[0]
    const maxRadius = this.depthRange[1]
    const u = Math.random()
    const radius = minRadius + (maxRadius - minRadius) * Math.pow(u, 0.3) // 偏向更远距离
    
    // 转换为笛卡尔坐标
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    
    return new THREE.Vector3(x, y, z)
  }

  /**
   * 生成深空粒子类型
   */
  private generateDeepSpaceType(): ParticleType {
    const random = Math.random()
    if (random < 0.85) return ParticleType.STAR        // 85% 古老恒星
    if (random < 0.95) return ParticleType.NEBULA      // 10% 远距离星云
    if (random < 0.98) return ParticleType.ENERGY_FIELD // 3% 类星体/活跃星系核
    if (random < 0.995) return ParticleType.SUPERNOVA  // 1.5% 远距离超新星
    return ParticleType.PULSAR // 0.5% 毫秒脉冲星
  }

  /**
   * 生成深空天体颜色 - 强烈的红移效应
   */
  private generateDeepSpaceColor(depth: number, distanceFromCenter: number): THREE.Color {
    const particleIndex = this.particleData.type?.length || 0
    const particleType = this.particleData.type?.[particleIndex - 1] || ParticleType.STAR
    
    let color: THREE.Color
    
    switch (particleType) {
      case ParticleType.ENERGY_FIELD:
        // 类星体和活跃星系核 - 极高红移
        color = new THREE.Color(0x8b0000) // 深红色
        color.multiplyScalar(0.8)
        break
        
      case ParticleType.SUPERNOVA:
        // 远距离超新星 - 红移显著
        color = ColorSystem.temperatureToColor(4000) // 偏红的温度
        color.multiplyScalar(0.6)
        break
        
      case ParticleType.NEBULA:
        // 远距离星系和星云 - 红移效应
        color = new THREE.Color(0x654321) // 棕红色
        color.multiplyScalar(0.5)
        break
        
      default: // ParticleType.STAR 和 PULSAR
        // 古老的低质量恒星
        const temp = 2000 + Math.random() * 2000 // 低温恒星
        color = ColorSystem.temperatureToColor(temp)
        break
    }
    
    // 应用极强的星际红化和宇宙学红移
    const redshift = 0.1 + distanceFromCenter * 0.5 // 模拟宇宙学红移
    color = ColorSystem.applyInterstellarReddening(color, distanceFromCenter * 200, 0.02)
    
    // 应用红移效应 - 向红端偏移
    const redshiftedColor = new THREE.Color()
    redshiftedColor.r = Math.min(1.0, color.r * (1.0 + redshift))
    redshiftedColor.g = color.g * (1.0 - redshift * 0.3)
    redshiftedColor.b = color.b * (1.0 - redshift * 0.6)
    
    // 极低的整体亮度
    redshiftedColor.multiplyScalar(0.3 + depth * 0.2)
    
    return redshiftedColor
  }

  /**
   * 重写更新方法以实现极缓慢的动画
   */
  public updateUniforms(time: number, mouse: THREE.Vector2): void {
    // 使用极慢的时间尺度
    const slowTime = time * 0.1
    super.updateUniforms(slowTime, mouse)
  }
}
