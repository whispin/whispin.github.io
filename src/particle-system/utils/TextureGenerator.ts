import * as THREE from 'three'

export class TextureGenerator {
  /**
   * 创建圆形粒子纹理
   */
  static createCircleTexture(size: number = 64, innerRadius: number = 0.2, outerRadius: number = 0.5): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!

    const center = size / 2
    
    // 创建径向渐变
    const gradient = context.createRadialGradient(center, center, 0, center, center, center)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(innerRadius, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(outerRadius, 'rgba(255,255,255,0.1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    // 绘制圆形
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    return texture
  }

  /**
   * 创建星光十字纹理
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

    // 绘制中心光点
    const coreGradient = context.createRadialGradient(center, center, 0, center, center, size * 0.2)
    coreGradient.addColorStop(0, 'rgba(255,255,255,1)')
    coreGradient.addColorStop(0.3, 'rgba(255,255,255,0.8)')
    coreGradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = coreGradient
    context.fillRect(0, 0, size, size)

    // 绘制十字光芒
    context.globalCompositeOperation = 'lighten'
    
    // 水平光芒
    const horizontalGradient = context.createLinearGradient(0, center, size, center)
    horizontalGradient.addColorStop(0, 'rgba(255,255,255,0)')
    horizontalGradient.addColorStop(0.2, 'rgba(255,255,255,0.3)')
    horizontalGradient.addColorStop(0.5, 'rgba(255,255,255,0.6)')
    horizontalGradient.addColorStop(0.8, 'rgba(255,255,255,0.3)')
    horizontalGradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = horizontalGradient
    context.fillRect(0, center - 1, size, 2)

    // 垂直光芒
    const verticalGradient = context.createLinearGradient(center, 0, center, size)
    verticalGradient.addColorStop(0, 'rgba(255,255,255,0)')
    verticalGradient.addColorStop(0.2, 'rgba(255,255,255,0.3)')
    verticalGradient.addColorStop(0.5, 'rgba(255,255,255,0.6)')
    verticalGradient.addColorStop(0.8, 'rgba(255,255,255,0.3)')
    verticalGradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.fillStyle = verticalGradient
    context.fillRect(center - 1, 0, 2, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    return texture
  }

  /**
   * 创建发光球纹理
   */
  static createGlowTexture(size: number = 64, intensity: number = 1.0): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!

    const center = size / 2
    
    // 多层发光效果
    const layers = [
      { radius: 0.1, alpha: 1.0 * intensity },
      { radius: 0.3, alpha: 0.6 * intensity },
      { radius: 0.5, alpha: 0.3 * intensity },
      { radius: 0.7, alpha: 0.1 * intensity }
    ]

    layers.forEach(layer => {
      const gradient = context.createRadialGradient(center, center, 0, center, center, center * layer.radius)
      gradient.addColorStop(0, `rgba(255,255,255,${layer.alpha})`)
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