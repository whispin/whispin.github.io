import * as THREE from 'three'
import type { ParticleLayer } from '../types'

export interface LODLevel {
  distance: number
  particleCount: number
  quality: number
}

export interface OptimizationConfig {
  enableFrustumCulling: boolean
  enableLOD: boolean
  enableObjectPooling: boolean
  lodLevels: LODLevel[]
  cullingMargin: number
  maxPoolSize: number
}

export class RenderOptimizer {
  private config: OptimizationConfig
  private camera: THREE.PerspectiveCamera
  private frustum: THREE.Frustum = new THREE.Frustum()
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4()

  // 对象池
  private geometryPool: Map<string, THREE.BufferGeometry[]> = new Map()
  private materialPool: Map<string, THREE.ShaderMaterial[]> = new Map()
  private pointsPool: THREE.Points[] = []

  // LOD管理
  private lodCache: Map<string, LODLevel> = new Map()

  // 统计信息
  private stats = {
    culledParticles: 0,
    activeParticles: 0,
    poolHits: 0,
    poolMisses: 0
  }

  constructor(camera: THREE.PerspectiveCamera, config?: Partial<OptimizationConfig>) {
    this.camera = camera
    this.config = {
      enableFrustumCulling: true,
      enableLOD: true,
      enableObjectPooling: true,
      lodLevels: [
        { distance: 50, particleCount: 1.0, quality: 1.0 },
        { distance: 100, particleCount: 0.7, quality: 0.8 },
        { distance: 200, particleCount: 0.4, quality: 0.6 },
        { distance: 400, particleCount: 0.2, quality: 0.4 }
      ],
      cullingMargin: 10,
      maxPoolSize: 50,
      ...config
    }

    console.log('Render Optimizer initialized with config:', this.config)
  }

  public optimizeLayer(layer: ParticleLayer): void {
    if (!layer.points) return

    // 更新视锥体
    this.updateFrustum()

    // 应用LOD
    if (this.config.enableLOD) {
      this.applyLOD(layer)
    }

    // 应用视锥体剔除
    if (this.config.enableFrustumCulling) {
      this.applyFrustumCulling(layer)
    }

    // 优化几何体
    this.optimizeGeometry(layer)
  }

  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(this.cameraMatrix)
  }

  private applyLOD(layer: ParticleLayer): void {
    const cameraPosition = this.camera.position
    const layerPosition = layer.points.position
    const distance = cameraPosition.distanceTo(layerPosition)

    // 查找适当的LOD级别
    let lodLevel = this.config.lodLevels[this.config.lodLevels.length - 1]
    for (const level of this.config.lodLevels) {
      if (distance <= level.distance) {
        lodLevel = level
        break
      }
    }

    // 缓存LOD级别
    const cacheKey = `${layer.name}_${Math.floor(distance / 10)}`
    this.lodCache.set(cacheKey, lodLevel)

    // 应用LOD设置
    this.applyLODToLayer(layer, lodLevel)
  }

  private applyLODToLayer(layer: ParticleLayer, lodLevel: LODLevel): void {
    // 调整粒子数量
    const targetCount = Math.floor(layer.particleCount * lodLevel.particleCount)

    // 更新材质质量
    if (layer.material.uniforms.intensity) {
      layer.material.uniforms.intensity.value = lodLevel.quality
    }

    // 如果需要，可以在这里动态调整几何体
    this.adjustParticleCount(layer, targetCount)
  }

  private adjustParticleCount(layer: ParticleLayer, targetCount: number): void {
    const geometry = layer.geometry
    const currentCount = geometry.attributes.position.count

    if (targetCount !== currentCount) {
      // 创建新的几何体属性
      const positions = geometry.attributes.position.array as Float32Array
      const colors = geometry.attributes.color.array as Float32Array
      const sizes = geometry.attributes.size.array as Float32Array

      // 截取或扩展数组
      const newPositions = new Float32Array(targetCount * 3)
      const newColors = new Float32Array(targetCount * 3)
      const newSizes = new Float32Array(targetCount)

      const copyCount = Math.min(targetCount, currentCount)

      newPositions.set(positions.subarray(0, copyCount * 3))
      newColors.set(colors.subarray(0, copyCount * 3))
      newSizes.set(sizes.subarray(0, copyCount))

      // 如果需要更多粒子，复制现有数据
      if (targetCount > currentCount) {
        for (let i = currentCount; i < targetCount; i++) {
          const sourceIndex = i % currentCount
          newPositions[i * 3] = positions[sourceIndex * 3]
          newPositions[i * 3 + 1] = positions[sourceIndex * 3 + 1]
          newPositions[i * 3 + 2] = positions[sourceIndex * 3 + 2]

          newColors[i * 3] = colors[sourceIndex * 3]
          newColors[i * 3 + 1] = colors[sourceIndex * 3 + 1]
          newColors[i * 3 + 2] = colors[sourceIndex * 3 + 2]

          newSizes[i] = sizes[sourceIndex]
        }
      }

      // 更新几何体属性
      geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(newSizes, 1))

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
      geometry.attributes.size.needsUpdate = true
    }
  }

  private applyFrustumCulling(layer: ParticleLayer): void {
    if (!layer.points) return

    const boundingSphere = layer.points.geometry.boundingSphere
    if (!boundingSphere) {
      layer.points.geometry.computeBoundingSphere()
      return
    }

    // 扩展边界球以包含裕量
    const expandedSphere = boundingSphere.clone()
    expandedSphere.radius += this.config.cullingMargin

    // 检查是否在视锥体内
    const isVisible = this.frustum.intersectsSphere(expandedSphere)

    if (layer.points.visible !== isVisible) {
      layer.points.visible = isVisible

      if (isVisible) {
        this.stats.activeParticles += layer.particleCount
      } else {
        this.stats.culledParticles += layer.particleCount
      }
    }
  }

  private optimizeGeometry(layer: ParticleLayer): void {
    const geometry = layer.geometry

    // 确保边界球是最新的
    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere()
    }

    // 优化属性数组
    this.optimizeAttributes(geometry)
  }

  private optimizeAttributes(geometry: THREE.BufferGeometry): void {
    // 检查并优化属性数组的使用
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      if (attribute.needsUpdate) {
        // 可以在这里添加属性压缩或优化逻辑
        attribute.needsUpdate = false
      }
    }
  }

  // 对象池管理
  public getGeometryFromPool(type: string): THREE.BufferGeometry | null {
    if (!this.config.enableObjectPooling) return null

    const pool = this.geometryPool.get(type)
    if (pool && pool.length > 0) {
      this.stats.poolHits++
      return pool.pop()!
    }

    this.stats.poolMisses++
    return null
  }

  public returnGeometryToPool(type: string, geometry: THREE.BufferGeometry): void {
    if (!this.config.enableObjectPooling) return

    let pool = this.geometryPool.get(type)
    if (!pool) {
      pool = []
      this.geometryPool.set(type, pool)
    }

    if (pool.length < this.config.maxPoolSize) {
      // 清理几何体以便重用
      geometry.dispose()
      pool.push(geometry)
    }
  }

  public getMaterialFromPool(type: string): THREE.ShaderMaterial | null {
    if (!this.config.enableObjectPooling) return null

    const pool = this.materialPool.get(type)
    if (pool && pool.length > 0) {
      this.stats.poolHits++
      return pool.pop()!
    }

    this.stats.poolMisses++
    return null
  }

  public returnMaterialToPool(type: string, material: THREE.ShaderMaterial): void {
    if (!this.config.enableObjectPooling) return

    let pool = this.materialPool.get(type)
    if (!pool) {
      pool = []
      this.materialPool.set(type, pool)
    }

    if (pool.length < this.config.maxPoolSize) {
      // 重置材质状态
      material.dispose()
      pool.push(material)
    }
  }

  // 统计和调试
  public getStats() {
    return { ...this.stats }
  }

  public resetStats(): void {
    this.stats = {
      culledParticles: 0,
      activeParticles: 0,
      poolHits: 0,
      poolMisses: 0
    }
  }

  public getOptimizationReport(): string {
    const poolEfficiency = this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) * 100

    return `
Render Optimization Report:
==========================
Culled Particles: ${this.stats.culledParticles}
Active Particles: ${this.stats.activeParticles}
Pool Hits: ${this.stats.poolHits}
Pool Misses: ${this.stats.poolMisses}
Pool Efficiency: ${poolEfficiency.toFixed(1)}%
LOD Cache Size: ${this.lodCache.size}
==========================
    `.trim()
  }

  public dispose(): void {
    // 清理对象池
    for (const pool of this.geometryPool.values()) {
      pool.forEach(geometry => geometry.dispose())
    }

    for (const pool of this.materialPool.values()) {
      pool.forEach(material => material.dispose())
    }

    this.pointsPool.forEach(points => {
      if (points.geometry) points.geometry.dispose()
      if (points.material) (points.material as THREE.Material).dispose()
    })

    this.geometryPool.clear()
    this.materialPool.clear()
    this.pointsPool = []
    this.lodCache.clear()
  }

  public onWindowResize(width: number, height: number): void {
    // 清理LOD缓存，因为屏幕尺寸变化可能影响LOD计算
    this.lodCache.clear()

    // 可以在这里添加其他与窗口大小相关的优化逻辑
    console.log(`RenderOptimizer: Window resized to ${width}x${height}`)
  }
}