/**
 * 用户体验优化器
 * 负责优化动画参数、交互响应和视觉效果
 */

import * as THREE from 'three'
import type { QualityLevel } from '../types'

export interface UXOptimizationConfig {
  // 动画优化
  animationSmoothness: number      // 动画平滑度 (0-1)
  transitionSpeed: number          // 过渡速度倍数
  easeType: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

  // 交互优化
  interactionDelay: number         // 交互延迟 (ms)
  feedbackIntensity: number        // 反馈强度 (0-1)
  responsiveThreshold: number      // 响应阈值 (ms)

  // 视觉优化
  contrastBoost: number           // 对比度增强 (0-2)
  saturationAdjust: number        // 饱和度调整 (0-2)
  brightnessAdjust: number        // 亮度调整 (0-2)

  // 性能优化
  adaptiveQuality: boolean        // 自适应质量
  batteryOptimization: boolean    // 电池优化
  motionReduction: boolean        // 减少动画（无障碍）
}

export interface UXMetrics {
  averageFrameTime: number        // 平均帧时间
  interactionLatency: number      // 交互延迟
  visualClarity: number           // 视觉清晰度评分
  userSatisfaction: number        // 用户满意度评分 (0-100)
  accessibilityScore: number      // 无障碍评分 (0-100)
}

export class UXOptimizer {
  private config: UXOptimizationConfig
  private metrics: UXMetrics
  private isOptimizing: boolean = false
  private optimizationCallbacks: Array<(config: UXOptimizationConfig) => void> = []

  constructor(initialConfig?: Partial<UXOptimizationConfig>) {
    this.config = {
      // 默认配置
      animationSmoothness: 0.8,
      transitionSpeed: 1.0,
      easeType: 'ease-out',

      interactionDelay: 16, // ~60fps
      feedbackIntensity: 0.7,
      responsiveThreshold: 100,

      contrastBoost: 1.0,
      saturationAdjust: 1.0,
      brightnessAdjust: 1.0,

      adaptiveQuality: true,
      batteryOptimization: false,
      motionReduction: false,

      ...initialConfig
    }

    this.metrics = {
      averageFrameTime: 16.67,
      interactionLatency: 50,
      visualClarity: 80,
      userSatisfaction: 75,
      accessibilityScore: 85
    }

    this.detectUserPreferences()
  }

  /**
   * 开始用户体验优化
   */
  public async startOptimization(): Promise<void> {
    if (this.isOptimizing) return

    console.log('🎨 Starting UX optimization...')
    this.isOptimizing = true

    try {
      // 1. 检测用户环境和偏好
      await this.analyzeUserEnvironment()

      // 2. 优化动画参数
      await this.optimizeAnimationParameters()

      // 3. 优化交互响应
      await this.optimizeInteractionResponse()

      // 4. 优化视觉效果
      await this.optimizeVisualEffects()

      // 5. 应用无障碍优化
      await this.applyAccessibilityOptimizations()

      // 6. 性能微调
      await this.performanceFineTuning()

      console.log('✅ UX optimization completed!')
      this.notifyOptimizationComplete()

    } catch (error) {
      console.error('❌ UX optimization failed:', error)
      throw error
    } finally {
      this.isOptimizing = false
    }
  }

  /**
   * 检测用户偏好和环境
   */
  private detectUserPreferences(): void {
    // 检测用户的系统偏好
    if (typeof window !== 'undefined') {
      // 检测深色模式偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        this.config.contrastBoost = 1.2
        this.config.brightnessAdjust = 0.9
      }

      // 检测减少动画偏好
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        this.config.motionReduction = true
        this.config.animationSmoothness = 0.3
        this.config.transitionSpeed = 0.5
      }

      // 检测高对比度偏好
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      if (prefersHighContrast) {
        this.config.contrastBoost = 1.5
        this.config.saturationAdjust = 1.3
      }

      // 检测电池状态
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          if (battery.level < 0.2 || !battery.charging) {
            this.config.batteryOptimization = true
            this.config.animationSmoothness = 0.5
            this.config.transitionSpeed = 0.7
          }
        }).catch(() => {
          // 忽略电池API错误
        })
      }
    }
  }

  /**
   * 分析用户环境
   */
  private async analyzeUserEnvironment(): Promise<void> {
    console.log('  Analyzing user environment...')

    // 检测设备性能
    const performanceScore = await this.measureDevicePerformance()

    if (performanceScore < 50) {
      // 低性能设备优化
      this.config.animationSmoothness = 0.4
      this.config.transitionSpeed = 0.6
      this.config.feedbackIntensity = 0.5
      this.config.adaptiveQuality = true
    } else if (performanceScore > 80) {
      // 高性能设备增强
      this.config.animationSmoothness = 0.9
      this.config.transitionSpeed = 1.2
      this.config.feedbackIntensity = 0.9
    }

    // 检测网络状况
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection && connection.effectiveType === 'slow-2g') {
        this.config.batteryOptimization = true
        this.config.transitionSpeed = 0.5
      }
    }
  }

  /**
   * 优化动画参数
   */
  private async optimizeAnimationParameters(): Promise<void> {
    console.log('  Optimizing animation parameters...')

    // 基于设备性能调整动画质量
    const targetFPS = this.config.batteryOptimization ? 30 : 60
    const frameTime = 1000 / targetFPS

    // 调整动画缓动函数
    const easingFunctions = {
      'linear': (t: number) => t,
      'ease-in': (t: number) => t * t,
      'ease-out': (t: number) => t * (2 - t),
      'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }

    // 应用优化的动画参数
    this.config.interactionDelay = Math.max(frameTime, this.config.interactionDelay)

    // 如果启用了减少动画，进一步优化
    if (this.config.motionReduction) {
      this.config.animationSmoothness *= 0.3
      this.config.transitionSpeed *= 0.5
      this.config.feedbackIntensity *= 0.6
    }
  }

  /**
   * 优化交互响应
   */
  private async optimizeInteractionResponse(): Promise<void> {
    console.log('  Optimizing interaction response...')

    // 基于设备类型调整交互参数
    const isMobile = typeof navigator !== 'undefined' ?
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) : false
    const isTouch = typeof window !== 'undefined' ? 'ontouchstart' in window : false

    if (isMobile || isTouch) {
      // 移动设备优化
      this.config.interactionDelay = Math.max(this.config.interactionDelay, 32) // 30fps minimum
      this.config.feedbackIntensity = Math.min(this.config.feedbackIntensity * 1.2, 1.0)
      this.config.responsiveThreshold = 150 // 更宽松的响应阈值
    } else {
      // 桌面设备优化
      this.config.interactionDelay = Math.max(this.config.interactionDelay, 16) // 60fps target
      this.config.responsiveThreshold = 100
    }

    // 根据电池状态调整
    if (this.config.batteryOptimization) {
      this.config.interactionDelay *= 1.5
      this.config.feedbackIntensity *= 0.7
    }
  }

  /**
   * 优化视觉效果
   */
  private async optimizeVisualEffects(): Promise<void> {
    console.log('  Optimizing visual effects...')

    // 检测显示器特性
    const screenInfo = this.getScreenInfo()

    // 基于屏幕特性调整视觉参数
    if (screenInfo.pixelRatio > 2) {
      // 高DPI屏幕
      this.config.contrastBoost *= 0.9 // 稍微降低对比度
      this.config.saturationAdjust *= 1.1 // 增加饱和度
    }

    if (screenInfo.colorGamut === 'p3') {
      // 广色域屏幕
      this.config.saturationAdjust *= 1.2
    }

    // 环境光线适应（如果支持）
    if ('AmbientLightSensor' in window) {
      try {
        const sensor = new (window as any).AmbientLightSensor()
        sensor.addEventListener('reading', () => {
          const lux = sensor.illuminance
          if (lux < 10) {
            // 暗环境
            this.config.brightnessAdjust = 0.8
            this.config.contrastBoost = 1.3
          } else if (lux > 1000) {
            // 亮环境
            this.config.brightnessAdjust = 1.2
            this.config.contrastBoost = 1.1
          }
        })
        sensor.start()
      } catch (error) {
        // 忽略传感器错误
      }
    }
  }

  /**
   * 应用无障碍优化
   */
  private async applyAccessibilityOptimizations(): Promise<void> {
    console.log('  Applying accessibility optimizations...')

    // 检测用户的无障碍偏好
    if (this.config.motionReduction) {
      // 减少动画的无障碍优化
      this.config.animationSmoothness = Math.min(this.config.animationSmoothness, 0.3)
      this.config.transitionSpeed = Math.min(this.config.transitionSpeed, 0.5)
      this.config.feedbackIntensity = Math.min(this.config.feedbackIntensity, 0.4)
    }

    // 高对比度优化
    if (this.config.contrastBoost > 1.3) {
      this.config.saturationAdjust = Math.min(this.config.saturationAdjust, 1.1)
      this.config.brightnessAdjust = Math.max(this.config.brightnessAdjust, 0.9)
    }

    // 键盘导航优化
    if (typeof window !== 'undefined') {
      // 检测是否使用键盘导航
      let usingKeyboard = false

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          usingKeyboard = true
          // 增强焦点反馈
          this.config.feedbackIntensity = Math.min(this.config.feedbackIntensity * 1.3, 1.0)
        }
      })

      window.addEventListener('mousedown', () => {
        usingKeyboard = false
      })
    }

    // 更新无障碍评分
    this.updateAccessibilityScore()
  }

  /**
   * 性能微调
   */
  private async performanceFineTuning(): Promise<void> {
    console.log('  Performing final performance tuning...')

    // 基于当前性能指标进行微调
    const currentPerformance = await this.measureCurrentPerformance()

    if (currentPerformance.averageFrameTime > 20) {
      // 性能不足，降低质量
      this.config.animationSmoothness *= 0.8
      this.config.feedbackIntensity *= 0.8
      this.config.transitionSpeed *= 0.9
    } else if (currentPerformance.averageFrameTime < 12) {
      // 性能充足，可以提升质量
      this.config.animationSmoothness = Math.min(this.config.animationSmoothness * 1.1, 1.0)
      this.config.feedbackIntensity = Math.min(this.config.feedbackIntensity * 1.1, 1.0)
    }

    // 更新性能指标
    this.metrics = {
      ...this.metrics,
      ...currentPerformance
    }

    // 计算用户满意度评分
    this.calculateUserSatisfactionScore()
  }

  /**
   * 获取当前优化配置
   */
  public getOptimizationConfig(): UXOptimizationConfig {
    return { ...this.config }
  }

  /**
   * 获取当前UX指标
   */
  public getUXMetrics(): UXMetrics {
    return { ...this.metrics }
  }

  /**
   * 设置优化配置
   */
  public setOptimizationConfig(config: Partial<UXOptimizationConfig>): void {
    this.config = { ...this.config, ...config }
    this.notifyOptimizationComplete()
  }

  /**
   * 添加优化完成回调
   */
  public addOptimizationCallback(callback: (config: UXOptimizationConfig) => void): void {
    this.optimizationCallbacks.push(callback)
  }

  /**
   * 移除优化完成回调
   */
  public removeOptimizationCallback(callback: (config: UXOptimizationConfig) => void): void {
    const index = this.optimizationCallbacks.indexOf(callback)
    if (index > -1) {
      this.optimizationCallbacks.splice(index, 1)
    }
  }

  /**
   * 生成UX优化报告
   */
  public generateOptimizationReport(): string {
    const report = []

    report.push('=== UX Optimization Report ===')
    report.push('')

    // 配置信息
    report.push('Current Configuration:')
    report.push(`  Animation Smoothness: ${(this.config.animationSmoothness * 100).toFixed(1)}%`)
    report.push(`  Transition Speed: ${this.config.transitionSpeed.toFixed(2)}x`)
    report.push(`  Interaction Delay: ${this.config.interactionDelay}ms`)
    report.push(`  Feedback Intensity: ${(this.config.feedbackIntensity * 100).toFixed(1)}%`)
    report.push(`  Contrast Boost: ${this.config.contrastBoost.toFixed(2)}x`)
    report.push(`  Motion Reduction: ${this.config.motionReduction ? 'Enabled' : 'Disabled'}`)
    report.push(`  Battery Optimization: ${this.config.batteryOptimization ? 'Enabled' : 'Disabled'}`)
    report.push('')

    // 性能指标
    report.push('Performance Metrics:')
    report.push(`  Average Frame Time: ${this.metrics.averageFrameTime.toFixed(2)}ms`)
    report.push(`  Interaction Latency: ${this.metrics.interactionLatency}ms`)
    report.push(`  Visual Clarity: ${this.metrics.visualClarity}/100`)
    report.push(`  User Satisfaction: ${this.metrics.userSatisfaction}/100`)
    report.push(`  Accessibility Score: ${this.metrics.accessibilityScore}/100`)
    report.push('')

    // 建议
    report.push('Recommendations:')
    if (this.metrics.averageFrameTime > 20) {
      report.push('  - Consider reducing animation complexity for better performance')
    }
    if (this.metrics.interactionLatency > 100) {
      report.push('  - Optimize interaction response time')
    }
    if (this.metrics.accessibilityScore < 80) {
      report.push('  - Improve accessibility features')
    }
    if (this.metrics.userSatisfaction < 70) {
      report.push('  - Review user experience settings')
    }

    return report.join('\n')
  }

  // 私有工具方法

  private async measureDevicePerformance(): Promise<number> {
    // 简单的设备性能测试
    const startTime = performance.now()

    // 执行一些计算密集型操作
    let result = 0
    for (let i = 0; i < 100000; i++) {
      result += Math.sin(i) * Math.cos(i)
    }

    const endTime = performance.now()
    const executionTime = endTime - startTime

    // 基于执行时间计算性能分数 (0-100)
    const performanceScore = Math.max(0, Math.min(100, 100 - (executionTime - 5) * 10))

    return performanceScore
  }

  private async measureCurrentPerformance(): Promise<Partial<UXMetrics>> {
    // 模拟性能测量
    return {
      averageFrameTime: 16.67 + Math.random() * 10,
      interactionLatency: 50 + Math.random() * 50,
      visualClarity: 80 + Math.random() * 20
    }
  }

  private getScreenInfo(): { pixelRatio: number; colorGamut: string } {
    if (typeof window === 'undefined') {
      return { pixelRatio: 1, colorGamut: 'srgb' }
    }

    const pixelRatio = window.devicePixelRatio || 1

    let colorGamut = 'srgb'
    if (window.matchMedia && window.matchMedia('(color-gamut: p3)').matches) {
      colorGamut = 'p3'
    } else if (window.matchMedia && window.matchMedia('(color-gamut: rec2020)').matches) {
      colorGamut = 'rec2020'
    }

    return { pixelRatio, colorGamut }
  }

  private updateAccessibilityScore(): void {
    let score = 100

    // 基于配置计算无障碍评分
    if (typeof window !== 'undefined') {
      if (!this.config.motionReduction && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        score -= 20 // 未遵循减少动画偏好
      }

      if (this.config.contrastBoost < 1.1 && window.matchMedia('(prefers-contrast: high)').matches) {
        score -= 15 // 未提供足够的对比度
      }
    }

    if (this.config.interactionDelay > 200) {
      score -= 10 // 交互延迟过高
    }

    this.metrics.accessibilityScore = Math.max(0, score)
  }

  private calculateUserSatisfactionScore(): void {
    let score = 100

    // 基于性能指标计算满意度
    if (this.metrics.averageFrameTime > 20) {
      score -= (this.metrics.averageFrameTime - 16.67) * 2
    }

    if (this.metrics.interactionLatency > 100) {
      score -= (this.metrics.interactionLatency - 100) * 0.5
    }

    if (this.metrics.visualClarity < 80) {
      score -= (80 - this.metrics.visualClarity) * 0.8
    }

    // 基于配置调整
    if (this.config.batteryOptimization) {
      score += 5 // 电池优化加分
    }

    if (typeof window !== 'undefined' && this.config.motionReduction && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      score += 10 // 遵循用户偏好加分
    }

    this.metrics.userSatisfaction = Math.max(0, Math.min(100, score))
  }

  private notifyOptimizationComplete(): void {
    for (const callback of this.optimizationCallbacks) {
      try {
        callback(this.config)
      } catch (error) {
        console.warn('UX optimization callback error:', error)
      }
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.optimizationCallbacks.length = 0
    this.isOptimizing = false
  }
}