import * as THREE from 'three'
import type { ParticleLayer, ParticleSystemManager as IParticleSystemManager } from './types'
import { QualityLevel } from './types'
import { InteractionManager, type ClickEffect } from './interaction/InteractionManager'
import { PerformanceMonitor, type PerformanceMetrics } from './performance/PerformanceMonitor'
import { RenderOptimizer } from './performance/RenderOptimizer'
import { ResponsiveManager, DeviceType, type DeviceConfig, type TouchGesture } from './responsive/ResponsiveManager'
import { ThemeManager, type ThemeConfig, type ColorPalette } from './theme/ThemeManager'
import { WebGLDetector, type CompatibilityReport } from './compatibility/WebGLDetector'
import { CSSParticleSystem } from './compatibility/CSSParticleSystem'
import { UXOptimizer } from './optimization'
import type { UXOptimizationConfig, UXMetrics } from './optimization'

export class ParticleSystemManager implements IParticleSystemManager {
  public scene: THREE.Scene
  public particleLayers: ParticleLayer[] = []
  public qualityLevel: QualityLevel = QualityLevel.HIGH

  private mouse: THREE.Vector2 = new THREE.Vector2()
  private cameraPosition: THREE.Vector3 = new THREE.Vector3()
  private time: number = 0
  private isInitialized: boolean = false
  private interactionManager?: InteractionManager
  private performanceMonitor: PerformanceMonitor
  private renderOptimizer?: RenderOptimizer
  private responsiveManager: ResponsiveManager
  private themeManager: ThemeManager
  private webglDetector: WebGLDetector
  private cssParticleSystem?: CSSParticleSystem
  private usingFallback: boolean = false
  private uxOptimizer: UXOptimizer

  constructor(scene: THREE.Scene) {
    this.scene = scene

    // 初始化性能监控器
    this.performanceMonitor = new PerformanceMonitor({
      targetFps: 60,
      memoryWarningThreshold: 150,
      fpsWarningThreshold: 25,
      enableAutoOptimization: true
    })

    // 设置性能警告回调
    this.performanceMonitor.setOnPerformanceWarning((metrics: PerformanceMetrics) => {
      console.warn('Performance warning:', metrics)
      this.handlePerformanceWarning(metrics)
    })

    // 初始化响应式管理器
    this.responsiveManager = new ResponsiveManager()

    // 设置响应式回调
    this.responsiveManager.setOnDeviceChange((device: DeviceType, config: DeviceConfig) => {
      this.handleDeviceChange(device, config)
    })

    this.responsiveManager.setOnGesture((gesture: TouchGesture) => {
      this.handleTouchGesture(gesture)
    })

    // 初始化主题管理器
    this.themeManager = new ThemeManager('matrix')

    // 设置主题过渡回调
    this.themeManager.addTransitionCallback((_progress: number, colors: ColorPalette) => {
      this.updateParticleColors(colors)
    })

    // 初始化UX优化器
    this.uxOptimizer = new UXOptimizer()

    // 设置UX优化回调
    this.uxOptimizer.addOptimizationCallback((config: UXOptimizationConfig) => {
      this.applyUXOptimizations(config)
    })

    // 初始化WebGL检测器
    this.webglDetector = WebGLDetector.getInstance()
    this.checkWebGLCompatibility()
  }

  public initialize(): void {
    // 清理现有资源
    this.dispose()

    // 根据质量等级设置初始参数
    this.adjustQualitySettings()

    this.isInitialized = true
  }

  private checkWebGLCompatibility(): void {
    const report = this.webglDetector.getCompatibilityReport()

    if (!report.isSupported) {
      console.warn('WebGL not supported, initializing fallback system:', report.errors)
      this.initializeFallbackSystem(report)
      return
    }

    if (report.warnings.length > 0) {
      console.warn('WebGL compatibility warnings:', report.warnings)
    }

    if (report.recommendedFallback !== 'none') {
      // 临时禁用降级逻辑进行调试
      /*
      // 根据设备性能决定是否使用降级方案
      const deviceConfig = this.responsiveManager.getCurrentConfig()
      if (deviceConfig.qualityLevel === QualityLevel.LOW) {
        this.initializeFallbackSystem(report)
        return
      }
      */
    }
  }

  private initializeFallbackSystem(report: CompatibilityReport): void {
    this.usingFallback = true

    try {
      // 获取当前主题颜色
      const currentColors = this.themeManager.getCurrentColors()
      const colorStrings = [
        `#${currentColors.primary.getHexString()}`,
        `#${currentColors.secondary.getHexString()}`,
        `#${currentColors.accent.getHexString()}`
      ]

      // 根据设备配置调整粒子数量
      const deviceConfig = this.responsiveManager.getCurrentConfig()
      const particleCount = Math.floor(deviceConfig.maxParticles * 0.3) // CSS粒子系统使用更少的粒子

      this.cssParticleSystem = new CSSParticleSystem({
        particleCount,
        containerSelector: 'body',
        colors: colorStrings,
        sizeRange: [2, 6],
        speedRange: [0.2, 0.8],
        lifeRange: [4000, 12000],
        enableAnimation: true
      })

      this.cssParticleSystem.start()

      // 显示用户友好的通知
      this.showFallbackNotification(report)
    } catch (error) {
      console.error('Failed to initialize fallback system:', error)
      this.showErrorNotification(error)
    }
  }

  private showFallbackNotification(report: CompatibilityReport): void {
    // 创建一个友好的通知，告知用户正在使用降级模式
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      border: 1px solid #00ff00;
    `

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">⚠️ 兼容性模式</div>
      <div style="margin-bottom: 10px;">您的设备不完全支持WebGL，已启用CSS粒子系统作为替代方案。</div>
      <div style="font-size: 10px; opacity: 0.7;">
        ${report.errors.length > 0 ? `错误: ${report.errors[0]}` : ''}
        ${report.warnings.length > 0 ? `警告: ${report.warnings[0]}` : ''}
      </div>
    `

    document.body.appendChild(notification)

    // 5秒后自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 5000)
  }

  private showErrorNotification(error: any): void {
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(139, 0, 0, 0.9);
      color: #ffffff;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      border: 1px solid #ff0000;
    `

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">❌ 系统错误</div>
      <div style="margin-bottom: 10px;">粒子系统初始化失败，请刷新页面重试。</div>
      <div style="font-size: 10px; opacity: 0.7;">错误: ${error.message || error}</div>
    `

    document.body.appendChild(notification)

    // 10秒后自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 10000)
  }

  public initializeInteraction(camera: THREE.PerspectiveCamera): void {
    if (this.interactionManager) {
      this.interactionManager.dispose()
    }

    this.interactionManager = new InteractionManager(camera, {
      enableParallax: true,
      enableClickEffects: true,
      enableZoomControl: true,
      parallaxStrength: 0.02, // 较小的视差强度以保持稳定
      clickEffectRadius: 150,
      zoomSensitivity: 0.15,
      minZoom: 0.3,
      maxZoom: 2.5
    })
  }

  public initializeRenderOptimizer(camera: THREE.PerspectiveCamera): void {
    if (this.renderOptimizer) {
      this.renderOptimizer.dispose()
    }

    this.renderOptimizer = new RenderOptimizer(camera, {
      enableFrustumCulling: true,
      enableLOD: true,
      enableObjectPooling: true,
      cullingMargin: 15,
      maxPoolSize: 30
    })
  }

  public update(deltaTime: number): void {
    if (!this.isInitialized) return

    this.time += deltaTime

    // 更新性能监控器
    this.performanceMonitor.update()
    this.performanceMonitor.updateParticleCount(this.getTotalParticleCount())

    // 更新交互管理器
    if (this.interactionManager) {
      this.interactionManager.update(deltaTime)
      this.mouse = this.interactionManager.getNormalizedMouse()
    }

    // 更新主题管理器
    this.themeManager.update()

    // 如果使用降级系统，跳过WebGL粒子系统更新
    if (this.usingFallback) {
      // CSS粒子系统是自动更新的，不需要手动调用update
      return
    }

    // 更新所有粒子层
    for (const layer of this.particleLayers) {
      try {
        layer.updateUniforms(this.time, this.mouse)

        // 更新点击效果uniform
        if (this.interactionManager && layer.material.uniforms) {
          this.updateClickEffectUniforms(layer, this.interactionManager.getClickEffects())
        }

        // 应用渲染优化
        if (this.renderOptimizer) {
          this.renderOptimizer.optimizeLayer(layer)
        }
      } catch (error) {
        console.error(`Error updating particle layer ${layer.name}:`, error)
      }
    }
  }

  private updateClickEffectUniforms(layer: ParticleLayer, clickEffects: ClickEffect[]): void {
    const uniforms = layer.material.uniforms

    // 初始化点击效果uniform（如果不存在）
    if (!uniforms.clickPositions) {
      uniforms.clickPositions = { value: new Array(5).fill(new THREE.Vector2()) }
      uniforms.clickIntensities = { value: new Array(5).fill(0) }
      uniforms.clickRadii = { value: new Array(5).fill(0) }
      uniforms.activeClickCount = { value: 0 }
    }

    // 更新点击效果数据
    const maxEffects = Math.min(clickEffects.length, 5)
    uniforms.activeClickCount.value = maxEffects

    for (let i = 0; i < 5; i++) {
      if (i < maxEffects) {
        const effect = clickEffects[i]
        uniforms.clickPositions.value[i].copy(effect.position)
        uniforms.clickIntensities.value[i] = effect.intensity
        uniforms.clickRadii.value[i] = effect.maxRadius
      } else {
        uniforms.clickPositions.value[i].set(0, 0)
        uniforms.clickIntensities.value[i] = 0
        uniforms.clickRadii.value[i] = 0
      }
    }
  }

  public dispose(): void {

    // 清理交互管理器
    if (this.interactionManager) {
      this.interactionManager.dispose()
      this.interactionManager = undefined
    }

    // 清理渲染优化器
    if (this.renderOptimizer) {
      this.renderOptimizer.dispose()
      this.renderOptimizer = undefined
    }

    // 清理响应式管理器
    this.responsiveManager.dispose()

    // 清理主题管理器
    this.themeManager.dispose()

    // 清理性能监控器
    this.performanceMonitor.setEnabled(false)

    // 清理CSS粒子系统
    if (this.cssParticleSystem) {
      this.cssParticleSystem.dispose()
      this.cssParticleSystem = undefined
    }

    // 清理UX优化器
    this.uxOptimizer.dispose()

    // 清理所有粒子层
    for (const layer of this.particleLayers) {
      if (layer.points && layer.points.parent) {
        layer.points.parent.remove(layer.points)
      }
      layer.dispose()
    }

    this.particleLayers = []
    this.isInitialized = false
  }

  public setQuality(level: QualityLevel): void {
    if (this.qualityLevel === level) return
    
    this.qualityLevel = level
    
    // 重新初始化以应用新的质量设置
    if (this.isInitialized) {
      this.initialize()
    }
  }

  public addLayer(layer: ParticleLayer): void {
    // 检查是否已存在同名层
    const existingIndex = this.particleLayers.findIndex(l => l.name === layer.name)
    if (existingIndex !== -1) {
      this.removeLayer(layer.name)
    }
    
    // 创建新层
    layer.create()
    
    // 添加到场景和管理器
    this.scene.add(layer.points)
    this.particleLayers.push(layer)
  }

  public removeLayer(name: string): void {
    const index = this.particleLayers.findIndex(layer => layer.name === name)
    if (index === -1) return
    
    const layer = this.particleLayers[index]
    
    // 从场景中移除
    this.scene.remove(layer.points)
    
    // 释放资源
    layer.dispose()
    
    // 从数组中移除
    this.particleLayers.splice(index, 1)
  }

  public updateMouse(x: number, y: number): void {
    this.mouse.set(x, y)
  }

  public updateCameraPosition(position: THREE.Vector3): void {
    this.cameraPosition.copy(position)
  }

  public getTotalParticleCount(): number {
    return this.particleLayers.reduce((total, layer) => total + layer.particleCount, 0)
  }

  public getPerformanceInfo(): {
    layerCount: number
    totalParticles: number
    qualityLevel: QualityLevel
  } {
    return {
      layerCount: this.particleLayers.length,
      totalParticles: this.getTotalParticleCount(),
      qualityLevel: this.qualityLevel
    }
  }

  private handlePerformanceWarning(metrics: PerformanceMetrics): void {
    // 自动性能优化
    if (metrics.fps < 25 && this.qualityLevel !== QualityLevel.LOW) {
      const newQuality = this.qualityLevel === QualityLevel.ULTRA ? QualityLevel.HIGH :
                        this.qualityLevel === QualityLevel.HIGH ? QualityLevel.MEDIUM :
                        QualityLevel.LOW
      this.setQuality(newQuality)
    }

    if (metrics.memoryUsage > 200) {
      // 可以在这里实现内存优化策略
    }
  }

  private handleDeviceChange(_device: DeviceType, config: DeviceConfig): void {
    // 根据设备配置调整质量等级
    this.setQuality(config.qualityLevel)

    // 调整粒子数量
    for (const layer of this.particleLayers) {
      const adaptedCount = this.responsiveManager.adaptParticleCount(layer.particleCount)
      if (adaptedCount !== layer.particleCount) {
        // 这里可以实现动态调整粒子数量的逻辑
      }
    }
  }

  private handleTouchGesture(gesture: TouchGesture): void {
    switch (gesture.type) {
      case 'pan':
        // 处理平移手势 - 可以用于相机控制
        if (this.interactionManager) {
          // 将触摸平移转换为鼠标移动
          const normalizedDelta = gesture.deltaPosition.clone()
          normalizedDelta.x = (normalizedDelta.x / window.innerWidth) * 2
          normalizedDelta.y = -(normalizedDelta.y / window.innerHeight) * 2
        }
        break

      case 'pinch':
        // 处理缩放手势
        if (this.interactionManager) {
          // 可以调整相机缩放或粒子密度
          // TODO: 实现缩放功能
        }
        break

      case 'tap':
        // 处理点击手势 - 创建点击效果
        if (this.interactionManager) {
          // 触发点击效果
        }
        break

      case 'longpress':
        // 处理长按手势 - 可以用于特殊效果
        break
    }
  }

  private updateParticleColors(colors: ColorPalette): void {
    // 如果使用CSS粒子系统，更新CSS粒子颜色
    if (this.usingFallback && this.cssParticleSystem) {
      const colorStrings = [
        `#${colors.primary.getHexString()}`,
        `#${colors.secondary.getHexString()}`,
        `#${colors.accent.getHexString()}`
      ]
      this.cssParticleSystem.updateColors(colorStrings)
      return
    }

    // 更新所有粒子层的颜色
    for (const layer of this.particleLayers) {
      if (layer.material.uniforms) {
        // 根据层的类型应用不同的颜色
        switch (layer.name) {
          case 'foreground':
            if (layer.material.uniforms.color) {
              layer.material.uniforms.color.value = colors.primary
            }
            if (layer.material.uniforms.glowColor) {
              layer.material.uniforms.glowColor.value = colors.glow
            }
            break

          case 'midground':
            if (layer.material.uniforms.color) {
              layer.material.uniforms.color.value = colors.secondary
            }
            if (layer.material.uniforms.glowColor) {
              layer.material.uniforms.glowColor.value = colors.accent
            }
            break

          case 'background':
            if (layer.material.uniforms.color) {
              layer.material.uniforms.color.value = colors.background
            }
            if (layer.material.uniforms.glowColor) {
              layer.material.uniforms.glowColor.value = colors.foreground
            }
            break

          default:
            // 默认使用主色调
            if (layer.material.uniforms.color) {
              layer.material.uniforms.color.value = colors.primary
            }
            if (layer.material.uniforms.glowColor) {
              layer.material.uniforms.glowColor.value = colors.glow
            }
        }

        // 更新透明度和强度
        const theme = this.themeManager.getCurrentTheme()
        if (layer.material.uniforms.opacity) {
          layer.material.uniforms.opacity.value = theme.particleOpacity
        }
        if (layer.material.uniforms.intensity) {
          layer.material.uniforms.intensity.value = theme.glowIntensity
        }
      }
    }
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics()
  }

  public getPerformanceReport(): string {
    return this.performanceMonitor.getPerformanceReport()
  }

  public getRenderOptimizationReport(): string {
    return this.renderOptimizer ? this.renderOptimizer.getOptimizationReport() : 'Render optimizer not initialized'
  }

  public getOptimizationStats() {
    return this.renderOptimizer ? this.renderOptimizer.getStats() : null
  }

  public getCurrentDevice(): DeviceType {
    return this.responsiveManager.getCurrentDevice()
  }

  public getDeviceConfig(): DeviceConfig {
    return this.responsiveManager.getCurrentConfig()
  }

  public getDeviceReport(): string {
    return this.responsiveManager.getDeviceReport()
  }

  public isTouch(): boolean {
    return this.responsiveManager.isTouch()
  }

  // 窗口大小调整
  public onWindowResize(width: number, height: number): void {
    // 通知响应式管理器
    this.responsiveManager.onWindowResize(width, height)

    // 通知渲染优化器
    if (this.renderOptimizer) {
      this.renderOptimizer.onWindowResize(width, height)
    }

    // 更新所有粒子层
    this.particleLayers.forEach(layer => {
      if (layer.onWindowResize) {
        layer.onWindowResize(width, height)
      }
    })
  }

  // 主题相关方法
  public setTheme(themeName: string, transitionDuration?: number): boolean {
    return this.themeManager.setTheme(themeName, transitionDuration)
  }

  public getCurrentTheme(): ThemeConfig {
    return this.themeManager.getCurrentTheme()
  }

  public getAvailableThemes(): string[] {
    return this.themeManager.getAvailableThemes()
  }

  public isThemeTransitioning(): boolean {
    return this.themeManager.isTransitioning()
  }

  public getThemeTransitionProgress(): number {
    return this.themeManager.getTransitionProgress()
  }

  public createCustomTheme(name: string, baseTheme: string, colorOverrides: Partial<ColorPalette>): ThemeConfig | null {
    return this.themeManager.createCustomTheme(name, baseTheme, colorOverrides)
  }

  // WebGL兼容性相关方法
  public getWebGLCompatibilityReport(): CompatibilityReport {
    return this.webglDetector.getCompatibilityReport()
  }

  public isUsingFallback(): boolean {
    return this.usingFallback
  }

  public isWebGLSupported(): boolean {
    return this.webglDetector.isWebGLSupported()
  }

  public getFallbackParticleCount(): number {
    return this.cssParticleSystem ? this.cssParticleSystem.getParticleCount() : 0
  }

  // UX优化相关方法
  public async startUXOptimization(): Promise<void> {
    await this.uxOptimizer.startOptimization()
  }

  public getUXOptimizationConfig(): UXOptimizationConfig {
    return this.uxOptimizer.getOptimizationConfig()
  }

  public setUXOptimizationConfig(config: Partial<UXOptimizationConfig>): void {
    this.uxOptimizer.setOptimizationConfig(config)
  }

  public getUXMetrics(): UXMetrics {
    return this.uxOptimizer.getUXMetrics()
  }

  public getUXOptimizationReport(): string {
    return this.uxOptimizer.generateOptimizationReport()
  }

  public debugInfo(): void {
    console.log('=== Enhanced Particle System Debug Info ===')
    console.log(`Quality Level: ${this.qualityLevel}`)
    console.log(`Total Layers: ${this.particleLayers.length}`)
    console.log(`Total Particles: ${this.getTotalParticleCount()}`)

    this.particleLayers.forEach((layer, index) => {
      console.log(`Layer ${index + 1}: ${layer.name} - ${layer.particleCount} particles`)
    })

    console.log('\n=== Performance Metrics ===')
    console.log(this.getPerformanceReport())

    console.log('\n=== UX Optimization ===')
    console.log(this.getUXOptimizationReport())

    console.log('==========================================')
  }

  private adjustQualitySettings(): void {
    // 根据质量等级调整性能参数
    // TODO: 实现基于质量等级的性能调整
  }

  private applyUXOptimizations(config: UXOptimizationConfig): void {

    // 应用动画优化
    if (this.interactionManager) {
      // 调整交互响应参数
      // 这里可以根据config调整交互管理器的参数
    }

    // 应用性能优化
    if (config.adaptiveQuality) {
      // 启用自适应质量
      this.performanceMonitor.setEnabled(true)
    }

    // 应用电池优化
    if (config.batteryOptimization) {
      // 降低质量等级以节省电池
      if (this.qualityLevel === QualityLevel.ULTRA) {
        this.setQuality(QualityLevel.HIGH)
      } else if (this.qualityLevel === QualityLevel.HIGH) {
        this.setQuality(QualityLevel.MEDIUM)
      }
    }

    // 应用减少动画优化
    if (config.motionReduction) {
      // 减少动画效果
      this.particleLayers.forEach(_layer => {
        // 这里可以调整每个层的动画参数
      })
    }

    // 应用视觉优化
    if (config.contrastBoost !== 1.0 || config.saturationAdjust !== 1.0 || config.brightnessAdjust !== 1.0) {
      // 调整颜色参数 - 保留以供将来使用
      // const currentTheme = this.themeManager.getCurrentTheme()
      // 这里可以根据视觉优化参数调整主题颜色
    }
  }

}