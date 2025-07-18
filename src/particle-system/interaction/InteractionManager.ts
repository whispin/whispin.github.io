import * as THREE from 'three'

export interface InteractionConfig {
  enableParallax: boolean
  enableClickEffects: boolean
  enableZoomControl: boolean
  parallaxStrength: number
  clickEffectRadius: number
  zoomSensitivity: number
  minZoom: number
  maxZoom: number
}

export interface ClickEffect {
  position: THREE.Vector2
  startTime: number
  duration: number
  maxRadius: number
  intensity: number
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private normalizedMouse: THREE.Vector2 = new THREE.Vector2()
  private clickEffects: ClickEffect[] = []
  private config: InteractionConfig
  private isEnabled: boolean = true

  // 视差效果相关
  private targetCameraPosition: THREE.Vector3 = new THREE.Vector3()
  private originalCameraPosition: THREE.Vector3 = new THREE.Vector3()

  // 缩放控制相关
  private currentZoom: number = 1.0
  private targetZoom: number = 1.0

  // 事件监听器引用
  private mouseMoveHandler?: (event: MouseEvent) => void
  private clickHandler?: (event: MouseEvent) => void
  private wheelHandler?: (event: WheelEvent) => void
  private touchStartHandler?: (event: TouchEvent) => void
  private touchMoveHandler?: (event: TouchEvent) => void

  constructor(camera: THREE.PerspectiveCamera, config?: Partial<InteractionConfig>) {
    this.camera = camera
    this.originalCameraPosition.copy(camera.position)
    this.targetCameraPosition.copy(camera.position)

    this.config = {
      enableParallax: true,
      enableClickEffects: true,
      enableZoomControl: true,
      parallaxStrength: 0.05,
      clickEffectRadius: 100,
      zoomSensitivity: 0.1,
      minZoom: 0.5,
      maxZoom: 3.0,
      ...config
    }

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // 鼠标移动事件
    this.mouseMoveHandler = (event: MouseEvent) => {
      if (!this.isEnabled || !this.config.enableParallax) return

      this.mouse.x = event.clientX
      this.mouse.y = event.clientY

      // 标准化鼠标坐标到 [-1, 1] 范围
      this.normalizedMouse.x = (event.clientX / window.innerWidth) * 2 - 1
      this.normalizedMouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      this.updateParallaxEffect()
    }

    // 鼠标点击事件
    this.clickHandler = (event: MouseEvent) => {
      if (!this.isEnabled || !this.config.enableClickEffects) return

      this.createClickEffect(event.clientX, event.clientY)
    }

    // 滚轮缩放事件
    this.wheelHandler = (event: WheelEvent) => {
      if (!this.isEnabled || !this.config.enableZoomControl) return

      event.preventDefault()

      const delta = event.deltaY > 0 ? 1 : -1
      this.targetZoom += delta * this.config.zoomSensitivity
      this.targetZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, this.targetZoom))
    }

    // 触摸事件支持
    this.touchStartHandler = (event: TouchEvent) => {
      if (!this.isEnabled) return

      if (event.touches.length === 1) {
        const touch = event.touches[0]
        this.mouse.x = touch.clientX
        this.mouse.y = touch.clientY

        this.normalizedMouse.x = (touch.clientX / window.innerWidth) * 2 - 1
        this.normalizedMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1

        if (this.config.enableClickEffects) {
          this.createClickEffect(touch.clientX, touch.clientY)
        }
      }
    }

    this.touchMoveHandler = (event: TouchEvent) => {
      if (!this.isEnabled || !this.config.enableParallax) return

      if (event.touches.length === 1) {
        const touch = event.touches[0]
        this.mouse.x = touch.clientX
        this.mouse.y = touch.clientY

        this.normalizedMouse.x = (touch.clientX / window.innerWidth) * 2 - 1
        this.normalizedMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1

        this.updateParallaxEffect()
      }
    }

    // 添加事件监听器
    window.addEventListener('mousemove', this.mouseMoveHandler)
    window.addEventListener('click', this.clickHandler)
    window.addEventListener('wheel', this.wheelHandler, { passive: false })
    window.addEventListener('touchstart', this.touchStartHandler)
    window.addEventListener('touchmove', this.touchMoveHandler)
  }

  private updateParallaxEffect(): void {
    // 计算基于鼠标位置的相机偏移
    const parallaxX = this.normalizedMouse.x * this.config.parallaxStrength
    const parallaxY = this.normalizedMouse.y * this.config.parallaxStrength

    // 更新目标相机位置
    this.targetCameraPosition.x = this.originalCameraPosition.x + parallaxX
    this.targetCameraPosition.y = this.originalCameraPosition.y + parallaxY
  }

  private createClickEffect(x: number, y: number): void {
    const effect: ClickEffect = {
      position: new THREE.Vector2(x, y),
      startTime: Date.now(),
      duration: 1000, // 1秒持续时间
      maxRadius: this.config.clickEffectRadius,
      intensity: 1.0
    }

    this.clickEffects.push(effect)

    // 限制同时存在的点击效果数量
    if (this.clickEffects.length > 5) {
      this.clickEffects.shift()
    }
  }

  public update(deltaTime: number): void {
    if (!this.isEnabled) return

    // 更新相机位置（平滑插值）
    if (this.config.enableParallax) {
      this.camera.position.lerp(this.targetCameraPosition, deltaTime * 5)
    }

    // 更新缩放（平滑插值）
    if (this.config.enableZoomControl) {
      this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, deltaTime * 3)
      this.camera.position.z = this.originalCameraPosition.z / this.currentZoom
    }

    // 更新点击效果
    this.updateClickEffects()
  }

  private updateClickEffects(): void {
    const currentTime = Date.now()

    // 移除过期的点击效果
    this.clickEffects = this.clickEffects.filter(effect => {
      const elapsed = currentTime - effect.startTime
      return elapsed < effect.duration
    })

    // 更新剩余效果的强度
    this.clickEffects.forEach(effect => {
      const elapsed = currentTime - effect.startTime
      const progress = elapsed / effect.duration
      effect.intensity = 1.0 - progress // 线性衰减
    })
  }

  // 获取当前鼠标位置（标准化）
  public getNormalizedMouse(): THREE.Vector2 {
    return this.normalizedMouse.clone()
  }

  // 获取当前点击效果
  public getClickEffects(): ClickEffect[] {
    return [...this.clickEffects]
  }

  // 获取当前缩放级别
  public getCurrentZoom(): number {
    return this.currentZoom
  }

  // 设置配置
  public updateConfig(newConfig: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 启用/禁用交互
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  // 重置相机位置
  public resetCamera(): void {
    this.targetCameraPosition.copy(this.originalCameraPosition)
    this.targetZoom = 1.0
  }

  // 清理资源
  public dispose(): void {
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler)
    }
    if (this.clickHandler) {
      window.removeEventListener('click', this.clickHandler)
    }
    if (this.wheelHandler) {
      window.removeEventListener('wheel', this.wheelHandler)
    }
    if (this.touchStartHandler) {
      window.removeEventListener('touchstart', this.touchStartHandler)
    }
    if (this.touchMoveHandler) {
      window.removeEventListener('touchmove', this.touchMoveHandler)
    }

    this.clickEffects = []
  }
}