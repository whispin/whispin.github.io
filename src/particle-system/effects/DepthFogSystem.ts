import * as THREE from 'three'

/**
 * 深度雾化配置
 */
export interface DepthFogConfig {
  nearDistance: number      // 近雾开始距离
  farDistance: number       // 远雾开始距离
  deepDistance: number      // 深空雾开始距离
  nearColor: THREE.Color    // 近雾颜色
  farColor: THREE.Color     // 远雾颜色
  deepColor: THREE.Color    // 深空雾颜色
  intensity: number         // 雾化强度
  scatteringFrequency: number // 大气散射频率
  enabled: boolean          // 是否启用雾化
}

/**
 * 深度雾化系统 - 管理3D空间中的雾化效果
 */
export class DepthFogSystem {
  private config: DepthFogConfig
  private time: number = 0

  constructor(config: Partial<DepthFogConfig> = {}) {
    this.config = {
      nearDistance: 50,
      farDistance: 100,
      deepDistance: 200,
      nearColor: new THREE.Color(0.1, 0.15, 0.3),
      farColor: new THREE.Color(0.05, 0.08, 0.2),
      deepColor: new THREE.Color(0.02, 0.03, 0.1),
      intensity: 1.0,
      scatteringFrequency: 0.01,
      enabled: true,
      ...config
    }

    console.log('DepthFogSystem initialized with config:', this.config)
  }

  /**
   * 更新雾化系统
   */
  update(deltaTime: number): void {
    this.time += deltaTime
  }

  /**
   * 获取雾化参数，用于着色器
   */
  getFogUniforms(): { [key: string]: { value: any } } {
    return {
      fogNearDistance: { value: this.config.nearDistance },
      fogFarDistance: { value: this.config.farDistance },
      fogDeepDistance: { value: this.config.deepDistance },
      fogNearColor: { value: this.config.nearColor },
      fogFarColor: { value: this.config.farColor },
      fogDeepColor: { value: this.config.deepColor },
      fogIntensity: { value: this.config.intensity },
      fogScatteringFreq: { value: this.config.scatteringFrequency },
      fogEnabled: { value: this.config.enabled ? 1.0 : 0.0 },
      fogTime: { value: this.time }
    }
  }

  /**
   * 设置雾化强度
   */
  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(2, intensity))
  }

  /**
   * 设置雾化距离
   */
  setDistances(near: number, far: number, deep: number): void {
    this.config.nearDistance = Math.max(1, near)
    this.config.farDistance = Math.max(this.config.nearDistance + 1, far)
    this.config.deepDistance = Math.max(this.config.farDistance + 1, deep)
  }

  /**
   * 设置雾化颜色
   */
  setColors(near: THREE.Color, far: THREE.Color, deep: THREE.Color): void {
    this.config.nearColor.copy(near)
    this.config.farColor.copy(far)
    this.config.deepColor.copy(deep)
  }

  /**
   * 启用/禁用雾化
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /**
   * 获取当前配置
   */
  getConfig(): DepthFogConfig {
    return { ...this.config }
  }

  /**
   * 应用预设配置
   */
  applyPreset(preset: 'subtle' | 'normal' | 'heavy' | 'deep_space'): void {
    switch (preset) {
      case 'subtle':
        this.config.intensity = 0.5
        this.setDistances(80, 150, 300)
        this.setColors(
          new THREE.Color(0.08, 0.12, 0.25),
          new THREE.Color(0.04, 0.06, 0.15),
          new THREE.Color(0.01, 0.02, 0.08)
        )
        break
      case 'normal':
        this.config.intensity = 1.0
        this.setDistances(50, 100, 200)
        this.setColors(
          new THREE.Color(0.1, 0.15, 0.3),
          new THREE.Color(0.05, 0.08, 0.2),
          new THREE.Color(0.02, 0.03, 0.1)
        )
        break
      case 'heavy':
        this.config.intensity = 1.5
        this.setDistances(30, 70, 150)
        this.setColors(
          new THREE.Color(0.15, 0.2, 0.35),
          new THREE.Color(0.08, 0.12, 0.25),
          new THREE.Color(0.03, 0.05, 0.15)
        )
        break
      case 'deep_space':
        this.config.intensity = 2.0
        this.setDistances(20, 50, 100)
        this.setColors(
          new THREE.Color(0.05, 0.05, 0.15),
          new THREE.Color(0.02, 0.02, 0.08),
          new THREE.Color(0.01, 0.01, 0.03)
        )
        break
    }

    console.log(`Applied fog preset: ${preset}`)
  }

  /**
   * 调试信息
   */
  debugInfo(): void {
    console.log('DepthFogSystem Debug Info:')
    console.log(`- Enabled: ${this.config.enabled}`)
    console.log(`- Intensity: ${this.config.intensity}`)
    console.log(`- Distances: near=${this.config.nearDistance}, far=${this.config.farDistance}, deep=${this.config.deepDistance}`)
    console.log(`- Near color: rgb(${this.config.nearColor.r.toFixed(2)}, ${this.config.nearColor.g.toFixed(2)}, ${this.config.nearColor.b.toFixed(2)})`)
    console.log(`- Far color: rgb(${this.config.farColor.r.toFixed(2)}, ${this.config.farColor.g.toFixed(2)}, ${this.config.farColor.b.toFixed(2)})`)
    console.log(`- Deep color: rgb(${this.config.deepColor.r.toFixed(2)}, ${this.config.deepColor.g.toFixed(2)}, ${this.config.deepColor.b.toFixed(2)})`)
    console.log(`- Time: ${this.time.toFixed(2)}s`)
  }
}
