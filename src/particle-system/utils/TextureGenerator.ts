import * as THREE from 'three'

export class TextureGenerator {
  /**
   * 创建圆形粒子纹理 - 优化为更清晰明亮
   */
  static createCircleTexture(size: number = 64, innerRadius: number = 0.1, outerRadius: number = 0.8): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!

    const center = size / 2
    
    // 创建径向渐变 - 更多实心区域，更少透明区域
    const gradient = context.createRadialGradient(center, center, 0, center, center, center)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(innerRadius, 'rgba(255,255,255,1)')
    gradient.addColorStop(outerRadius, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    // 绘制圆形
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    return texture
  }

  /**
   * 创建星光十字纹理 - 增强清晰度和亮度
   */
  static createStarTexture(size: number = 64): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!

    const center = size / 2
    
    // 清空画布
    context.fillStyle = 'rgba(0,0,0,0)'
    context.fillRect(0, 0, size, size)

    // 绘制增强的中心光点
    const coreGradient = context.createRadialGradient(center, center, 0, center, center, size * 0.25)
    coreGradient.addColorStop(0, 'rgba(255,255,255,1)')
    coreGradient.addColorStop(0.2, 'rgba(255,255,255,1)')
    coreGradient.addColorStop(0.5, 'rgba(255,255,255,0.8)')
    coreGradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = coreGradient
    context.fillRect(0, 0, size, size)

    // 绘制更明亮的十字光芒
    context.globalCompositeOperation = 'lighten'
    
    // 水平光芒 - 增强亮度
    const horizontalGradient = context.createLinearGradient(0, center, size, center)
    horizontalGradient.addColorStop(0, 'rgba(255,255,255,0)')
    horizontalGradient.addColorStop(0.15, 'rgba(255,255,255,0.6)')
    horizontalGradient.addColorStop(0.5, 'rgba(255,255,255,1)')
    horizontalGradient.addColorStop(0.85, 'rgba(255,255,255,0.6)')
    horizontalGradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = horizontalGradient
    context.fillRect(0, center - 2, size, 4)

    // 垂直光芒 - 增强亮度
    const verticalGradient = context.createLinearGradient(center, 0, center, size)
    verticalGradient.addColorStop(0, 'rgba(255,255,255,0)')
    verticalGradient.addColorStop(0.15, 'rgba(255,255,255,0.6)')
    verticalGradient.addColorStop(0.5, 'rgba(255,255,255,1)')
    verticalGradient.addColorStop(0.85, 'rgba(255,255,255,0.6)')
    verticalGradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = verticalGradient
    context.fillRect(center - 2, 0, 4, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    return texture
  }

  /**
   * 创建发光球纹理 - 增强亮度和清晰度
   */
  static createGlowTexture(size: number = 64, intensity: number = 1.5): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!

    const center = size / 2
    
    // 增强多层发光效果
    const layers = [
      { radius: 0.1, alpha: 1.0 * intensity },
      { radius: 0.25, alpha: 0.9 * intensity },
      { radius: 0.4, alpha: 0.7 * intensity },
      { radius: 0.6, alpha: 0.4 * intensity },
      { radius: 0.8, alpha: 0.2 * intensity }
    ]

    layers.forEach(layer => {
      const gradient = context.createRadialGradient(center, center, 0, center, center, center * layer.radius)
      gradient.addColorStop(0, `rgba(255,255,255,${Math.min(1.0, layer.alpha)})`)
      gradient.addColorStop(0.5, `rgba(255,255,255,${Math.min(1.0, layer.alpha * 0.7)})`)
      gradient.addColorStop(1, 'rgba(255,255,255,0)')

      context.fillStyle = gradient
      context.fillRect(0, 0, size, size)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    return texture
  }

  /**
   * 创建能量场纹理
   */
  static createEnergyTexture(size: number = 64): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!

    const center = size / 2
    
    // 创建能量场效果
    const gradient = context.createRadialGradient(center, center, 0, center, center, center)
    gradient.addColorStop(0, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)')
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    // 添加能量波纹
    context.globalCompositeOperation = 'lighten'
    for (let i = 0; i < 3; i++) {
      const ringRadius = (i + 1) * size / 6
      const ringGradient = context.createRadialGradient(center, center, ringRadius - 2, center, center, ringRadius + 2)
      ringGradient.addColorStop(0, 'rgba(255,255,255,0)')
      ringGradient.addColorStop(0.5, 'rgba(255,255,255,0.4)')
      ringGradient.addColorStop(1, 'rgba(255,255,255,0)')

      context.fillStyle = ringGradient
      context.fillRect(0, 0, size, size)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    return texture
  }
}