import * as THREE from 'three'
import { QualityLevel } from '../types'

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

export interface DeviceConfig {
  particleMultiplier: number
  qualityLevel: QualityLevel
  enableAdvancedEffects: boolean
  maxParticles: number
  renderScale: number
}

export interface ResponsiveConfig {
  breakpoints: {
    mobile: number
    tablet: number
  }
  deviceConfigs: Record<DeviceType, DeviceConfig>
  enableAutoAdaptation: boolean
  performanceThreshold: number
}

export interface TouchGesture {
  type: 'pan' | 'pinch' | 'tap' | 'longpress'
  startPosition: THREE.Vector2
  currentPosition: THREE.Vector2
  deltaPosition: THREE.Vector2
  scale: number
  startTime: number
  duration: number
}

export class ResponsiveManager {
  private config: ResponsiveConfig
  private currentDevice: DeviceType = DeviceType.DESKTOP
  private screenSize: THREE.Vector2 = new THREE.Vector2()
  private pixelRatio: number = 1
  private hasTouchSupport: boolean = false

  // 触摸交互
  private touchStartPositions: Map<number, THREE.Vector2> = new Map()
  // private activeGestures: TouchGesture[] = []
  private lastTouchTime: number = 0

  // 事件监听器
  private resizeHandler?: () => void
  private orientationHandler?: () => void
  private touchStartHandler?: (event: TouchEvent) => void
  private touchMoveHandler?: (event: TouchEvent) => void
  private touchEndHandler?: (event: TouchEvent) => void

  // 回调函数
  private onDeviceChange?: (device: DeviceType, config: DeviceConfig) => void
  private onGesture?: (gesture: TouchGesture) => void
  private onResize?: (size: THREE.Vector2) => void

  constructor(config?: Partial<ResponsiveConfig>) {
    this.config = {
      breakpoints: {
        mobile: 768,
        tablet: 1024
      },
      deviceConfigs: {
        [DeviceType.MOBILE]: {
          particleMultiplier: 0.3,
          qualityLevel: QualityLevel.LOW,
          enableAdvancedEffects: false,
          maxParticles: 1500,
          renderScale: 0.8
        },
        [DeviceType.TABLET]: {
          particleMultiplier: 0.6,
          qualityLevel: QualityLevel.MEDIUM,
          enableAdvancedEffects: true,
          maxParticles: 3000,
          renderScale: 0.9
        },
        [DeviceType.DESKTOP]: {
          particleMultiplier: 1.0,
          qualityLevel: QualityLevel.HIGH,
          enableAdvancedEffects: true,
          maxParticles: 6000,
          renderScale: 1.0
        }
      },
      enableAutoAdaptation: true,
      performanceThreshold: 30,
      ...config
    }

    this.detectDevice()
    this.setupEventListeners()

    console.log(`Responsive Manager initialized for ${this.currentDevice} device`)
  }

  private detectDevice(): void {
    this.screenSize.set(window.innerWidth, window.innerHeight)
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // 检测设备类型
    const width = this.screenSize.x
    if (width <= this.config.breakpoints.mobile) {
      this.currentDevice = DeviceType.MOBILE
    } else if (width <= this.config.breakpoints.tablet) {
      this.currentDevice = DeviceType.TABLET
    } else {
      this.currentDevice = DeviceType.DESKTOP
    }

    // 移动设备特殊检测
    if (this.hasTouchSupport && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      if (width <= this.config.breakpoints.mobile) {
        this.currentDevice = DeviceType.MOBILE
      } else {
        this.currentDevice = DeviceType.TABLET
      }
    }
  }

  private setupEventListeners(): void {
    // 窗口大小变化
    this.resizeHandler = () => {
      const oldDevice = this.currentDevice
      this.detectDevice()

      if (this.onResize) {
        this.onResize(this.screenSize)
      }

      if (oldDevice !== this.currentDevice && this.onDeviceChange) {
        this.onDeviceChange(this.currentDevice, this.getCurrentConfig())
      }
    }

    // 设备方向变化
    this.orientationHandler = () => {
      setTimeout(() => {
        this.resizeHandler?.()
      }, 100) // 延迟以确保尺寸更新
    }

    // 触摸事件
    if (this.hasTouchSupport) {
      this.setupTouchEvents()
    }

    window.addEventListener('resize', this.resizeHandler)
    window.addEventListener('orientationchange', this.orientationHandler)
  }

  private setupTouchEvents(): void {
    this.touchStartHandler = (event: TouchEvent) => {
      event.preventDefault()

      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i]
        const position = new THREE.Vector2(touch.clientX, touch.clientY)
        this.touchStartPositions.set(touch.identifier, position)
      }

      this.lastTouchTime = Date.now()
      this.processTouch(event)
    }

    this.touchMoveHandler = (event: TouchEvent) => {
      event.preventDefault()
      this.processTouch(event)
    }

    this.touchEndHandler = (event: TouchEvent) => {
      event.preventDefault()

      // 清理结束的触摸点
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i]
        this.touchStartPositions.delete(touch.identifier)
      }

      this.processTouch(event)
    }

    document.addEventListener('touchstart', this.touchStartHandler, { passive: false })
    document.addEventListener('touchmove', this.touchMoveHandler, { passive: false })
    document.addEventListener('touchend', this.touchEndHandler, { passive: false })
  }

  private processTouch(event: TouchEvent): void {
    const currentTime = Date.now()

    if (event.touches.length === 1) {
      // 单指操作 - 平移或点击
      const touch = event.touches[0]
      const startPos = this.touchStartPositions.get(touch.identifier)

      if (startPos) {
        const currentPos = new THREE.Vector2(touch.clientX, touch.clientY)
        const deltaPos = currentPos.clone().sub(startPos)

        const gesture: TouchGesture = {
          type: deltaPos.length() > 10 ? 'pan' : 'tap',
          startPosition: startPos,
          currentPosition: currentPos,
          deltaPosition: deltaPos,
          scale: 1,
          startTime: this.lastTouchTime,
          duration: currentTime - this.lastTouchTime
        }

        // 长按检测
        if (gesture.duration > 500 && deltaPos.length() < 10) {
          gesture.type = 'longpress'
        }

        if (this.onGesture) {
          this.onGesture(gesture)
        }
      }
    } else if (event.touches.length === 2) {
      // 双指操作 - 缩放
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]

      const pos1 = new THREE.Vector2(touch1.clientX, touch1.clientY)
      const pos2 = new THREE.Vector2(touch2.clientX, touch2.clientY)

      const currentDistance = pos1.distanceTo(pos2)
      const centerPos = pos1.clone().add(pos2).multiplyScalar(0.5)

      // 计算缩放比例（需要初始距离作为参考）
      const startPos1 = this.touchStartPositions.get(touch1.identifier)
      const startPos2 = this.touchStartPositions.get(touch2.identifier)

      if (startPos1 && startPos2) {
        const startDistance = startPos1.distanceTo(startPos2)
        const scale = currentDistance / startDistance

        const gesture: TouchGesture = {
          type: 'pinch',
          startPosition: startPos1.clone().add(startPos2).multiplyScalar(0.5),
          currentPosition: centerPos,
          deltaPosition: new THREE.Vector2(),
          scale: scale,
          startTime: this.lastTouchTime,
          duration: currentTime - this.lastTouchTime
        }

        if (this.onGesture) {
          this.onGesture(gesture)
        }
      }
    }
  }

  // 公共方法
  public getCurrentDevice(): DeviceType {
    return this.currentDevice
  }

  public getCurrentConfig(): DeviceConfig {
    return this.config.deviceConfigs[this.currentDevice]
  }

  public getScreenSize(): THREE.Vector2 {
    return this.screenSize.clone()
  }

  public getPixelRatio(): number {
    return this.pixelRatio
  }

  public isTouch(): boolean {
    return this.hasTouchSupport
  }

  public adaptParticleCount(baseCount: number): number {
    const config = this.getCurrentConfig()
    return Math.floor(baseCount * config.particleMultiplier)
  }

  public shouldEnableAdvancedEffects(): boolean {
    return this.getCurrentConfig().enableAdvancedEffects
  }

  public getRenderScale(): number {
    return this.getCurrentConfig().renderScale
  }

  public getMaxParticles(): number {
    return this.getCurrentConfig().maxParticles
  }

  // 设置回调函数
  public setOnDeviceChange(callback: (device: DeviceType, config: DeviceConfig) => void): void {
    this.onDeviceChange = callback
  }

  public setOnGesture(callback: (gesture: TouchGesture) => void): void {
    this.onGesture = callback
  }

  public setOnResize(callback: (size: THREE.Vector2) => void): void {
    this.onResize = callback
  }

  // 手动触发设备检测
  public forceDeviceDetection(): void {
    const oldDevice = this.currentDevice
    this.detectDevice()

    if (oldDevice !== this.currentDevice && this.onDeviceChange) {
      this.onDeviceChange(this.currentDevice, this.getCurrentConfig())
    }
  }

  // 获取设备信息报告
  public getDeviceReport(): string {
    return `
Device Information:
==================
Device Type: ${this.currentDevice}
Screen Size: ${this.screenSize.x}x${this.screenSize.y}
Pixel Ratio: ${this.pixelRatio}
Touch Support: ${this.hasTouchSupport ? 'Yes' : 'No'}
Particle Multiplier: ${this.getCurrentConfig().particleMultiplier}
Quality Level: ${this.getCurrentConfig().qualityLevel}
Max Particles: ${this.getCurrentConfig().maxParticles}
Advanced Effects: ${this.getCurrentConfig().enableAdvancedEffects ? 'Enabled' : 'Disabled'}
==================
    `.trim()
  }

  public dispose(): void {
    // 移除事件监听器
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler)
    }

    if (this.touchStartHandler) {
      document.removeEventListener('touchstart', this.touchStartHandler)
    }
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler)
    }
    if (this.touchEndHandler) {
      document.removeEventListener('touchend', this.touchEndHandler)
    }

    // 清理数据
    this.touchStartPositions.clear()
    // this.activeGestures = []
  }

  public onWindowResize(width: number, height: number): void {
    this.screenSize.set(width, height)
    this.detectDevice()
  }
}