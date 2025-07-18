export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  particleCount: number
  drawCalls: number
  averageFps: number
  minFps: number
  maxFps: number
}

export interface PerformanceConfig {
  targetFps: number
  memoryWarningThreshold: number
  fpsWarningThreshold: number
  sampleSize: number
  enableAutoOptimization: boolean
}

export class PerformanceMonitor {
  private config: PerformanceConfig
  private isEnabled: boolean = true

  // FPS监控
  private frameCount: number = 0
  private lastTime: number = 0
  private currentFps: number = 0
  private frameTimeHistory: number[] = []
  private fpsHistory: number[] = []

  // 内存监控
  private memoryUsage: number = 0
  private lastMemoryCheck: number = 0

  // 性能统计
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    particleCount: 0,
    drawCalls: 0,
    averageFps: 0,
    minFps: Infinity,
    maxFps: 0
  }

  // 回调函数
  private onPerformanceWarning?: (metrics: PerformanceMetrics) => void
  private onMetricsUpdate?: (metrics: PerformanceMetrics) => void

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      targetFps: 60,
      memoryWarningThreshold: 100, // MB
      fpsWarningThreshold: 30,
      sampleSize: 60, // 1秒的样本数（60fps）
      enableAutoOptimization: true,
      ...config
    }

    this.lastTime = performance.now()
    console.log('Performance Monitor initialized with config:', this.config)
  }

  public update(): void {
    if (!this.isEnabled) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime

    // 更新FPS
    this.updateFPS(deltaTime)

    // 定期检查内存使用情况（每秒一次）
    if (currentTime - this.lastMemoryCheck > 1000) {
      this.updateMemoryUsage()
      this.lastMemoryCheck = currentTime
    }

    // 更新性能指标
    this.updateMetrics()

    // 检查性能警告
    this.checkPerformanceWarnings()

    this.lastTime = currentTime
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++

    // 计算当前帧时间
    const frameTime = deltaTime
    this.frameTimeHistory.push(frameTime)

    // 保持历史记录在指定大小内
    if (this.frameTimeHistory.length > this.config.sampleSize) {
      this.frameTimeHistory.shift()
    }

    // 计算FPS（每秒更新一次）
    if (this.frameTimeHistory.length >= this.config.sampleSize) {
      const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      this.currentFps = 1000 / averageFrameTime

      // 更新FPS历史
      this.fpsHistory.push(this.currentFps)
      if (this.fpsHistory.length > 300) { // 保持5秒的历史记录
        this.fpsHistory.shift()
      }
    }
  }

  private updateMemoryUsage(): void {
    // 检查内存使用情况（如果支持）
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      this.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024) // 转换为MB
    } else {
      // 备用方法：估算内存使用
      this.memoryUsage = this.estimateMemoryUsage()
    }
  }

  private estimateMemoryUsage(): number {
    // 简单的内存使用估算
    const particleMemory = this.metrics.particleCount * 0.001 // 每个粒子约1KB
    const baseMemory = 20 // 基础内存使用约20MB
    return baseMemory + particleMemory
  }

  private updateMetrics(): void {
    this.metrics.fps = this.currentFps
    this.metrics.frameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory[this.frameTimeHistory.length - 1]
      : 0
    this.metrics.memoryUsage = this.memoryUsage

    // 计算统计数据
    if (this.fpsHistory.length > 0) {
      this.metrics.averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.metrics.minFps = Math.min(...this.fpsHistory)
      this.metrics.maxFps = Math.max(...this.fpsHistory)
    }

    // 触发更新回调
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.metrics)
    }
  }

  private checkPerformanceWarnings(): void {
    const warnings: string[] = []

    // FPS警告
    if (this.currentFps < this.config.fpsWarningThreshold) {
      warnings.push(`Low FPS: ${this.currentFps.toFixed(1)} (target: ${this.config.targetFps})`)
    }

    // 内存警告
    if (this.memoryUsage > this.config.memoryWarningThreshold) {
      warnings.push(`High memory usage: ${this.memoryUsage.toFixed(1)}MB (threshold: ${this.config.memoryWarningThreshold}MB)`)
    }

    // 触发警告回调
    if (warnings.length > 0 && this.onPerformanceWarning) {
      this.onPerformanceWarning(this.metrics)
    }
  }

  // 公共方法
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public updateParticleCount(count: number): void {
    this.metrics.particleCount = count
  }

  public updateDrawCalls(calls: number): void {
    this.metrics.drawCalls = calls
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  public setOnPerformanceWarning(callback: (metrics: PerformanceMetrics) => void): void {
    this.onPerformanceWarning = callback
  }

  public setOnMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.onMetricsUpdate = callback
  }

  public reset(): void {
    this.frameCount = 0
    this.frameTimeHistory = []
    this.fpsHistory = []
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      particleCount: 0,
      drawCalls: 0,
      averageFps: 0,
      minFps: Infinity,
      maxFps: 0
    }
  }

  public getPerformanceReport(): string {
    const report = `
Performance Report:
==================
Current FPS: ${this.metrics.fps.toFixed(1)}
Average FPS: ${this.metrics.averageFps.toFixed(1)}
Min FPS: ${this.metrics.minFps === Infinity ? 'N/A' : this.metrics.minFps.toFixed(1)}
Max FPS: ${this.metrics.maxFps.toFixed(1)}
Frame Time: ${this.metrics.frameTime.toFixed(2)}ms
Memory Usage: ${this.metrics.memoryUsage.toFixed(1)}MB
Particle Count: ${this.metrics.particleCount}
Draw Calls: ${this.metrics.drawCalls}
==================
    `
    return report.trim()
  }
}