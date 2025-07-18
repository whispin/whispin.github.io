import { PerformanceMonitor, type PerformanceMetrics } from './PerformanceMonitor'
import { QualityLevel } from '../types'

export interface BenchmarkResult {
  qualityLevel: QualityLevel
  particleCount: number
  averageFps: number
  minFps: number
  maxFps: number
  memoryUsage: number
  testDuration: number
  stable: boolean
}

export interface BenchmarkConfig {
  testDuration: number // 测试持续时间（毫秒）
  particleCounts: number[] // 要测试的粒子数量
  qualityLevels: QualityLevel[] // 要测试的质量等级
  stabilityThreshold: number // FPS稳定性阈值
  minAcceptableFps: number // 最低可接受FPS
}

export class BenchmarkTool {
  private performanceMonitor: PerformanceMonitor
  private config: BenchmarkConfig
  private isRunning: boolean = false
  private results: BenchmarkResult[] = []

  // 回调函数
  private onTestComplete?: (result: BenchmarkResult) => void
  private onBenchmarkComplete?: (results: BenchmarkResult[]) => void
  private onProgress?: (progress: number, currentTest: string) => void

  constructor(performanceMonitor: PerformanceMonitor, config?: Partial<BenchmarkConfig>) {
    this.performanceMonitor = performanceMonitor
    this.config = {
      testDuration: 5000, // 5秒
      particleCounts: [1000, 2000, 4000, 6000, 8000],
      qualityLevels: [QualityLevel.LOW, QualityLevel.MEDIUM, QualityLevel.HIGH],
      stabilityThreshold: 5, // FPS变化不超过5
      minAcceptableFps: 30,
      ...config
    }
  }

  public async runBenchmark(): Promise<BenchmarkResult[]> {
    if (this.isRunning) {
      throw new Error('Benchmark is already running')
    }

    this.isRunning = true
    this.results = []

    console.log('Starting performance benchmark...')

    const totalTests = this.config.qualityLevels.length * this.config.particleCounts.length
    let currentTest = 0

    try {
      for (const qualityLevel of this.config.qualityLevels) {
        for (const particleCount of this.config.particleCounts) {
          currentTest++
          const testName = `${qualityLevel} quality, ${particleCount} particles`

          if (this.onProgress) {
            this.onProgress((currentTest / totalTests) * 100, testName)
          }

          console.log(`Running test ${currentTest}/${totalTests}: ${testName}`)

          const result = await this.runSingleTest(qualityLevel, particleCount)
          this.results.push(result)

          if (this.onTestComplete) {
            this.onTestComplete(result)
          }

          // 短暂休息以避免系统过载
          await this.sleep(1000)
        }
      }

      console.log('Benchmark completed successfully')

      if (this.onBenchmarkComplete) {
        this.onBenchmarkComplete(this.results)
      }

      return this.results
    } finally {
      this.isRunning = false
    }
  }

  private async runSingleTest(qualityLevel: QualityLevel, particleCount: number): Promise<BenchmarkResult> {
    // 重置性能监控器
    this.performanceMonitor.reset()
    this.performanceMonitor.updateParticleCount(particleCount)

    const startTime = Date.now()
    const endTime = startTime + this.config.testDuration
    const metrics: PerformanceMetrics[] = []

    // 收集性能数据
    while (Date.now() < endTime) {
      this.performanceMonitor.update()
      const currentMetrics = this.performanceMonitor.getMetrics()

      if (currentMetrics.fps > 0) { // 只记录有效的FPS数据
        metrics.push({ ...currentMetrics })
      }

      await this.sleep(16) // 约60fps的更新频率
    }

    // 分析结果
    const result = this.analyzeTestResults(qualityLevel, particleCount, metrics)

    console.log(`Test completed: ${qualityLevel} quality, ${particleCount} particles - Average FPS: ${result.averageFps.toFixed(1)}`)

    return result
  }

  private analyzeTestResults(qualityLevel: QualityLevel, particleCount: number, metrics: PerformanceMetrics[]): BenchmarkResult {
    if (metrics.length === 0) {
      return {
        qualityLevel,
        particleCount,
        averageFps: 0,
        minFps: 0,
        maxFps: 0,
        memoryUsage: 0,
        testDuration: this.config.testDuration,
        stable: false
      }
    }

    const fpsValues = metrics.map(m => m.fps)
    const averageFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length
    const minFps = Math.min(...fpsValues)
    const maxFps = Math.max(...fpsValues)
    const averageMemory = metrics.reduce((a, b) => a + b.memoryUsage, 0) / metrics.length

    // 检查稳定性
    const fpsVariance = maxFps - minFps
    const stable = fpsVariance <= this.config.stabilityThreshold && averageFps >= this.config.minAcceptableFps

    return {
      qualityLevel,
      particleCount,
      averageFps,
      minFps,
      maxFps,
      memoryUsage: averageMemory,
      testDuration: this.config.testDuration,
      stable
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 公共方法
  public getResults(): BenchmarkResult[] {
    return [...this.results]
  }

  public getOptimalSettings(): { qualityLevel: QualityLevel; particleCount: number } | null {
    const stableResults = this.results.filter(r => r.stable)

    if (stableResults.length === 0) {
      return null
    }

    // 找到最高质量和最多粒子数的稳定配置
    const bestResult = stableResults.reduce((best, current) => {
      const bestScore = this.calculateScore(best)
      const currentScore = this.calculateScore(current)
      return currentScore > bestScore ? current : best
    })

    return {
      qualityLevel: bestResult.qualityLevel,
      particleCount: bestResult.particleCount
    }
  }

  private calculateScore(result: BenchmarkResult): number {
    const qualityScores = {
      [QualityLevel.LOW]: 1,
      [QualityLevel.MEDIUM]: 2,
      [QualityLevel.HIGH]: 3,
      [QualityLevel.ULTRA]: 4
    }

    const qualityScore = qualityScores[result.qualityLevel] || 1
    const particleScore = result.particleCount / 1000 // 每1000个粒子得1分
    const fpsScore = Math.min(result.averageFps / 60, 1) // 60fps得满分

    return qualityScore * particleScore * fpsScore
  }

  public generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available.'
    }

    let report = 'Performance Benchmark Report\n'
    report += '============================\n\n'

    // 按质量等级分组
    const groupedResults = this.results.reduce((groups, result) => {
      if (!groups[result.qualityLevel]) {
        groups[result.qualityLevel] = []
      }
      groups[result.qualityLevel].push(result)
      return groups
    }, {} as Record<QualityLevel, BenchmarkResult[]>)

    for (const [qualityLevel, results] of Object.entries(groupedResults)) {
      report += `${qualityLevel.toUpperCase()} Quality:\n`
      report += '-'.repeat(20) + '\n'

      for (const result of results) {
        const status = result.stable ? '✓' : '✗'
        report += `${status} ${result.particleCount} particles: ${result.averageFps.toFixed(1)} FPS (${result.minFps.toFixed(1)}-${result.maxFps.toFixed(1)})\n`
      }

      report += '\n'
    }

    const optimal = this.getOptimalSettings()
    if (optimal) {
      report += `Recommended Settings:\n`
      report += `Quality: ${optimal.qualityLevel}\n`
      report += `Particles: ${optimal.particleCount}\n`
    } else {
      report += 'No stable configuration found. Consider reducing quality settings.\n'
    }

    return report
  }

  // 设置回调函数
  public setOnTestComplete(callback: (result: BenchmarkResult) => void): void {
    this.onTestComplete = callback
  }

  public setOnBenchmarkComplete(callback: (results: BenchmarkResult[]) => void): void {
    this.onBenchmarkComplete = callback
  }

  public setOnProgress(callback: (progress: number, currentTest: string) => void): void {
    this.onProgress = callback
  }

  public isRunningBenchmark(): boolean {
    return this.isRunning
  }
}