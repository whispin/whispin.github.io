import * as THREE from 'three'
import type { PerformanceMetrics } from '../performance/PerformanceMonitor'
import type { ParticleLayer } from '../ParticleLayer'
import { QualityLevel } from '../types'

/**
 * 性能优化配置
 */
export interface PerformanceOptimizationConfig {
  targetFps: number
  minFps: number
  maxParticles: number
  adaptiveQuality: boolean
  enableLOD: boolean // Level of Detail
  enableFrustumCulling: boolean
  enableOcclusion: boolean
  dynamicResolution: boolean
}

/**
 * 视觉质量级别配置
 */
export interface QualityConfig {
  particleCount: number
  shaderComplexity: 'simple' | 'enhanced'
  fogEnabled: boolean
  energyWavesEnabled: boolean
  particleSize: number
  animationSpeed: number
  effectIntensity: number
}

/**
 * 性能优化器 - 动态调整视觉效果以维持性能
 */
export class PerformanceOptimizer {
  private config: PerformanceOptimizationConfig
  private currentQuality: QualityLevel = QualityLevel.HIGH
  private qualityConfigs: Map<QualityLevel, QualityConfig>
  private performanceHistory: number[] = []
  private lastOptimization: number = 0
  private optimizationCooldown: number = 2000 // 2秒冷却时间

  constructor(config: Partial<PerformanceOptimizationConfig> = {}) {
    this.config = {
      targetFps: 60,
      minFps: 30,
      maxParticles: 10000,
      adaptiveQuality: true,
      enableLOD: true,
      enableFrustumCulling: true,
      enableOcclusion: false,
      dynamicResolution: false,
      ...config
    }

    // 初始化质量配置
    this.qualityConfigs = new Map([
      [QualityLevel.LOW, {
        particleCount: 2000,
        shaderComplexity: 'simple',
        fogEnabled: false,
        energyWavesEnabled: false,
        particleSize: 0.8,
        animationSpeed: 0.7,
        effectIntensity: 0.5
      }],
      [QualityLevel.MEDIUM, {
        particleCount: 5000,
        shaderComplexity: 'simple',
        fogEnabled: true,
        energyWavesEnabled: true,
        particleSize: 1.0,
        animationSpeed: 0.85,
        effectIntensity: 0.75
      }],
      [QualityLevel.HIGH, {
        particleCount: 8000,
        shaderComplexity: 'enhanced',
        fogEnabled: true,
        energyWavesEnabled: true,
        particleSize: 1.2,
        animationSpeed: 1.0,
        effectIntensity: 1.0
      }],
      [QualityLevel.ULTRA, {
        particleCount: 12000,
        shaderComplexity: 'enhanced',
        fogEnabled: true,
        energyWavesEnabled: true,
        particleSize: 1.5,
        animationSpeed: 1.0,
        effectIntensity: 1.2
      }]
    ])

    console.log('PerformanceOptimizer initialized with config:', this.config)
  }

  /**
   * 分析性能指标并决定是否需要优化
   */
  analyzePerformance(metrics: PerformanceMetrics): {
    shouldOptimize: boolean
    recommendedQuality: QualityLevel
    reason: string
  } {
    const now = Date.now()

    // 检查冷却时间
    if (now - this.lastOptimization < this.optimizationCooldown) {
      return {
        shouldOptimize: false,
        recommendedQuality: this.currentQuality,
        reason: 'Optimization cooldown active'
      }
    }

    // 添加到性能历史
    this.performanceHistory.push(metrics.fps)
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift()
    }

    // 计算平均FPS
    const avgFps = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length

    let recommendedQuality = this.currentQuality
    let reason = 'Performance stable'

    // 性能过低，需要降级
    if (avgFps < this.config.minFps) {
      if (this.currentQuality !== QualityLevel.LOW) {
        recommendedQuality = this.getDowngradedQuality(this.currentQuality)
        reason = `Low FPS detected (${avgFps.toFixed(1)}), downgrading quality`
      }
    }
    // 性能良好，可以升级
    else if (avgFps > this.config.targetFps * 1.2) {
      if (this.currentQuality !== QualityLevel.ULTRA) {
        recommendedQuality = this.getUpgradedQuality(this.currentQuality)
        reason = `High FPS detected (${avgFps.toFixed(1)}), upgrading quality`
      }
    }

    const shouldOptimize = recommendedQuality !== this.currentQuality

    return {
      shouldOptimize,
      recommendedQuality,
      reason
    }
  }

  /**
   * 应用质量级别优化
   */
  applyQualityLevel(quality: QualityLevel): QualityConfig {
    this.currentQuality = quality
    this.lastOptimization = Date.now()

    const config = this.qualityConfigs.get(quality)
    if (!config) {
      throw new Error(`Quality level ${quality} not found`)
    }

    console.log(`Applied quality level: ${quality}`, config)
    return { ...config }
  }

  /**
   * 获取当前质量配置
   */
  getCurrentQualityConfig(): QualityConfig {
    const config = this.qualityConfigs.get(this.currentQuality)
    if (!config) {
      throw new Error(`Current quality level ${this.currentQuality} not found`)
    }
    return { ...config }
  }

  /**
   * 获取当前质量级别
   */
  getCurrentQuality(): QualityLevel {
    return this.currentQuality
  }

  /**
   * 设置质量级别
   */
  setQualityLevel(quality: QualityLevel): void {
    this.currentQuality = quality
  }

  /**
   * 启用/禁用自适应质量
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.config.adaptiveQuality = enabled
  }

  /**
   * 是否启用自适应质量
   */
  isAdaptiveQualityEnabled(): boolean {
    return this.config.adaptiveQuality
  }

  /**
   * 优化粒子层 - 应用LOD和视锥剔除
   */
  optimizeLayer(layer: ParticleLayer, _camera: THREE.Camera): void {
    if (!this.config.enableLOD && !this.config.enableFrustumCulling) {
      return
    }

    // 这里可以实现更复杂的LOD和剔除逻辑
    // 目前只是一个占位符
    const qualityConfig = this.getCurrentQualityConfig()

    // 调整粒子大小基于质量级别
    if (layer.material.uniforms && layer.material.uniforms.intensity) {
      layer.material.uniforms.intensity.value = qualityConfig.effectIntensity
    }
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats(): {
    currentQuality: string
    avgFps: number
    optimizationCount: number
    lastOptimization: number
  } {
    const avgFps = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length
      : 0

    return {
      currentQuality: this.currentQuality,
      avgFps: Math.round(avgFps * 100) / 100,
      optimizationCount: this.performanceHistory.length,
      lastOptimization: this.lastOptimization
    }
  }

  /**
   * 重置性能历史
   */
  resetPerformanceHistory(): void {
    this.performanceHistory = []
    this.lastOptimization = 0
  }

  /**
   * 获取降级质量等级
   */
  private getDowngradedQuality(current: QualityLevel): QualityLevel {
    switch (current) {
      case QualityLevel.ULTRA: return QualityLevel.HIGH
      case QualityLevel.HIGH: return QualityLevel.MEDIUM
      case QualityLevel.MEDIUM: return QualityLevel.LOW
      case QualityLevel.LOW: return QualityLevel.LOW
      default: return QualityLevel.LOW
    }
  }

  /**
   * 获取升级质量等级
   */
  private getUpgradedQuality(current: QualityLevel): QualityLevel {
    switch (current) {
      case QualityLevel.LOW: return QualityLevel.MEDIUM
      case QualityLevel.MEDIUM: return QualityLevel.HIGH
      case QualityLevel.HIGH: return QualityLevel.ULTRA
      case QualityLevel.ULTRA: return QualityLevel.ULTRA
      default: return QualityLevel.MEDIUM
    }
  }

  /**
   * 调试信息
   */
  debugInfo(): void {
    const stats = this.getPerformanceStats()
    const config = this.getCurrentQualityConfig()

    console.log('PerformanceOptimizer Debug Info:')
    console.log(`- Current Quality: ${stats.currentQuality}`)
    console.log(`- Average FPS: ${stats.avgFps}`)
    console.log(`- Adaptive Quality: ${this.config.adaptiveQuality ? 'Enabled' : 'Disabled'}`)
    console.log(`- Target FPS: ${this.config.targetFps}`)
    console.log(`- Min FPS: ${this.config.minFps}`)
    console.log('- Quality Config:', config)
    console.log(`- Performance History: [${this.performanceHistory.map(fps => fps.toFixed(1)).join(', ')}]`)
  }
}
