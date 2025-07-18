export interface CSSParticle {
  id: string
  element: HTMLElement
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

export interface CSSParticleConfig {
  particleCount: number
  containerSelector: string
  colors: string[]
  sizeRange: [number, number]
  speedRange: [number, number]
  lifeRange: [number, number]
  enableAnimation: boolean
}

export class CSSParticleSystem {
  private config: CSSParticleConfig
  private container: HTMLElement
  private particles: CSSParticle[] = []
  private animationId?: number
  private isRunning: boolean = false
  private lastTime: number = 0

  constructor(config: Partial<CSSParticleConfig>) {
    this.config = {
      particleCount: 100,
      containerSelector: 'body',
      colors: ['#00ff00', '#008800', '#00ff88'],
      sizeRange: [1, 4],
      speedRange: [0.1, 0.5],
      lifeRange: [3000, 8000],
      enableAnimation: true,
      ...config
    }

    const container = document.querySelector(this.config.containerSelector)
    if (!container) {
      throw new Error(`Container not found: ${this.config.containerSelector}`)
    }
    this.container = container as HTMLElement

    this.setupContainer()
    this.createParticles()

    console.log('CSS Particle System initialized as WebGL fallback')
  }

  private setupContainer(): void {
    // 确保容器有正确的样式
    const style = this.container.style
    if (getComputedStyle(this.container).position === 'static') {
      style.position = 'relative'
    }
    style.overflow = 'hidden'

    // 添加CSS动画样式
    this.injectCSS()
  }

  private injectCSS(): void {
    const styleId = 'css-particle-system-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .css-particle {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        will-change: transform, opacity;
        transition: opacity 0.3s ease;
      }

      .css-particle.animate {
        animation: cssParticleFloat linear infinite;
      }

      @keyframes cssParticleFloat {
        0% {
          transform: translate3d(0, 0, 0) scale(1);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translate3d(var(--dx), var(--dy), 0) scale(0.5);
          opacity: 0;
        }
      }

      .css-particle-glow {
        box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
      }
    `
    document.head.appendChild(style)
  }

  private createParticles(): void {
    for (let i = 0; i < this.config.particleCount; i++) {
      this.createParticle()
    }
  }

  private createParticle(): CSSParticle {
    const id = `css-particle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const element = document.createElement('div')

    element.id = id
    element.className = 'css-particle css-particle-glow'

    const particle: CSSParticle = {
      id,
      element,
      x: Math.random() * this.container.clientWidth,
      y: Math.random() * this.container.clientHeight,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * this.config.speedRange[1],
      vy: (Math.random() - 0.5) * this.config.speedRange[1],
      vz: (Math.random() - 0.5) * this.config.speedRange[1],
      size: this.config.sizeRange[0] + Math.random() * (this.config.sizeRange[1] - this.config.sizeRange[0]),
      opacity: Math.random() * 0.8 + 0.2,
      color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      life: 0,
      maxLife: this.config.lifeRange[0] + Math.random() * (this.config.lifeRange[1] - this.config.lifeRange[0])
    }

    this.updateParticleElement(particle)
    this.container.appendChild(element)
    this.particles.push(particle)

    return particle
  }

  private updateParticleElement(particle: CSSParticle): void {
    const { element, x, y, size, opacity, color } = particle

    element.style.left = `${x}px`
    element.style.top = `${y}px`
    element.style.width = `${size}px`
    element.style.height = `${size}px`
    element.style.opacity = opacity.toString()
    element.style.backgroundColor = color
    element.style.color = color

    if (this.config.enableAnimation) {
      const dx = particle.vx * (particle.maxLife / 1000)
      const dy = particle.vy * (particle.maxLife / 1000)

      element.style.setProperty('--dx', `${dx}px`)
      element.style.setProperty('--dy', `${dy}px`)
      element.style.animationDuration = `${particle.maxLife}ms`

      if (!element.classList.contains('animate')) {
        element.classList.add('animate')
      }
    }
  }

  private updateParticle(particle: CSSParticle, deltaTime: number): void {
    particle.life += deltaTime

    if (particle.life >= particle.maxLife) {
      this.resetParticle(particle)
      return
    }

    if (!this.config.enableAnimation) {
      // 手动更新位置（如果不使用CSS动画）
      particle.x += particle.vx * deltaTime / 16
      particle.y += particle.vy * deltaTime / 16

      // 边界检查
      if (particle.x < 0 || particle.x > this.container.clientWidth ||
          particle.y < 0 || particle.y > this.container.clientHeight) {
        this.resetParticle(particle)
        return
      }

      this.updateParticleElement(particle)
    }
  }

  private resetParticle(particle: CSSParticle): void {
    particle.x = Math.random() * this.container.clientWidth
    particle.y = Math.random() * this.container.clientHeight
    particle.vx = (Math.random() - 0.5) * this.config.speedRange[1]
    particle.vy = (Math.random() - 0.5) * this.config.speedRange[1]
    particle.life = 0
    particle.maxLife = this.config.lifeRange[0] + Math.random() * (this.config.lifeRange[1] - this.config.lifeRange[0])
    particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)]

    this.updateParticleElement(particle)
  }

  // 公共方法
  public start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.lastTime = performance.now()
    this.animate()

    console.log('CSS Particle System started')
  }

  public stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = undefined
    }

    console.log('CSS Particle System stopped')
  }

  private animate = (): void => {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // 更新粒子（仅在非CSS动画模式下）
    if (!this.config.enableAnimation) {
      this.particles.forEach(particle => {
        this.updateParticle(particle, deltaTime)
      })
    }

    this.animationId = requestAnimationFrame(this.animate)
  }

  public updateColors(colors: string[]): void {
    this.config.colors = colors

    // 更新现有粒子的颜色
    this.particles.forEach(particle => {
      particle.color = colors[Math.floor(Math.random() * colors.length)]
      particle.element.style.backgroundColor = particle.color
      particle.element.style.color = particle.color
    })
  }

  public setParticleCount(count: number): void {
    const currentCount = this.particles.length

    if (count > currentCount) {
      // 添加更多粒子
      for (let i = currentCount; i < count; i++) {
        this.createParticle()
      }
    } else if (count < currentCount) {
      // 移除多余的粒子
      const toRemove = this.particles.splice(count)
      toRemove.forEach(particle => {
        particle.element.remove()
      })
    }

    this.config.particleCount = count
  }

  public resize(): void {
    // 重新定位所有粒子以适应新的容器尺寸
    this.particles.forEach(particle => {
      if (particle.x > this.container.clientWidth) {
        particle.x = Math.random() * this.container.clientWidth
      }
      if (particle.y > this.container.clientHeight) {
        particle.y = Math.random() * this.container.clientHeight
      }
      this.updateParticleElement(particle)
    })
  }

  public dispose(): void {
    this.stop()

    // 移除所有粒子元素
    this.particles.forEach(particle => {
      particle.element.remove()
    })
    this.particles = []

    // 移除样式
    const styleElement = document.getElementById('css-particle-system-styles')
    if (styleElement) {
      styleElement.remove()
    }

    console.log('CSS Particle System disposed')
  }

  public getParticleCount(): number {
    return this.particles.length
  }

  public isActive(): boolean {
    return this.isRunning
  }
}