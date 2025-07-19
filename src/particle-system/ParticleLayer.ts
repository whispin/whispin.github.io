import * as THREE from 'three'
import type { ParticleLayer as IParticleLayer, ParticleData } from './types'
import { ParticleType, SpatialDistribution } from './types'
import { EnhancedShaders } from './shaders/EnhancedShaders'

export interface LayerConfiguration {
  intensity: number                    // Material intensity (0.4, 0.8, 1.2)
  depthBase: number                   // Base depth factor (0.2, 0.5, 0.8)
  depthMultiplier: number             // Depth range multiplier (0.3, 0.4, 0.6)
  orbitalSpeedMultiplier: number      // Orbital speed factor (0.1, 0.2, 0.3)
  velocityMultiplier: number          // Velocity range multiplier (0.01, 0.03, 0.05)
  brightnessBase: number              // Base brightness (0.3, 0.6, 0.8)
  brightnessMultiplier: number        // Brightness range multiplier (0.2, 0.3, 0.4)
}

export abstract class ParticleLayer implements IParticleLayer {
  public name: string
  public particleCount: number
  public geometry!: THREE.BufferGeometry
  public material!: THREE.ShaderMaterial
  public points!: THREE.Points
  
  protected particleData!: ParticleData
  protected depthRange: [number, number]
  protected sizeRange: [number, number]
  protected colorPalette: THREE.Color[]
  protected spatialDistribution: SpatialDistribution
  protected layerConfig: LayerConfiguration
  
  constructor(
    name: string,
    particleCount: number,
    depthRange: [number, number],
    sizeRange: [number, number],
    colorPalette: THREE.Color[],
    spatialDistribution: SpatialDistribution,
    layerConfig: LayerConfiguration
  ) {
    this.name = name
    this.particleCount = particleCount
    this.depthRange = depthRange
    this.sizeRange = sizeRange
    this.colorPalette = colorPalette
    this.spatialDistribution = spatialDistribution
    this.layerConfig = layerConfig
    
    this.initializeParticleData()
  }

  public create(): void {
    console.log(`Creating particle layer: ${this.name}`)
    
    // 生成粒子数据
    this.generateParticles()
    
    // 创建几何体
    this.createGeometry()
    
    // 创建材质
    this.createMaterial()
    
    // 创建点系统
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.name = this.name
    
    console.log(`Created particle layer: ${this.name} with ${this.particleCount} particles`)
  }

  public updateUniforms(time: number, mouse: THREE.Vector2): void {
    if (!this.material || !this.material.uniforms) return
    
    // 更新基础uniforms
    if (this.material.uniforms.time) {
      this.material.uniforms.time.value = time
    }
    if (this.material.uniforms.mouse) {
      this.material.uniforms.mouse.value.copy(mouse)
    }
  }

  public dispose(): void {
    console.log(`Disposing particle layer: ${this.name}`)
    
    // 清理几何体
    if (this.geometry) {
      this.geometry.dispose()
    }
    
    // 清理材质
    if (this.material) {
      this.material.dispose()
    }
    
    // 清理粒子数据
    this.particleData = null as any
    
    console.log(`Disposed particle layer: ${this.name}`)
  }

  protected generateParticles(): void {
    console.log(`Generating ${this.name} particles...`)
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      
      // 生成3D空间位置
      const position = this.generateSpatialPosition(i)
      this.particleData.position[i3] = position.x
      this.particleData.position[i3 + 1] = position.y
      this.particleData.position[i3 + 2] = position.z
      
      // 计算深度因子
      const distanceFromCenter = position.length()
      const normalizedDistance = (distanceFromCenter - this.depthRange[0]) / (this.depthRange[1] - this.depthRange[0])
      const depthFactor = 1.0 - Math.max(0, Math.min(1, normalizedDistance))
      this.particleData.depth[i] = this.layerConfig.depthBase + depthFactor * this.layerConfig.depthMultiplier
      
      // 生成颜色
      const color = this.generateParticleColor(this.particleData.depth[i], normalizedDistance)
      this.particleData.color[i3] = color.r
      this.particleData.color[i3 + 1] = color.g
      this.particleData.color[i3 + 2] = color.b
      
      // 生成大小
      this.particleData.size[i] = this.generateParticleSize(this.particleData.depth[i], normalizedDistance)
      
      // 生成轨道运动参数
      const orbitalSpeed = (0.1 + Math.random() * 0.4) * (1.5 - this.particleData.depth[i])
      this.particleData.orbitalSpeed[i] = orbitalSpeed * this.layerConfig.orbitalSpeedMultiplier
      
      // 生成速度
      this.particleData.velocity[i3] = (Math.random() - 0.5) * this.layerConfig.velocityMultiplier
      this.particleData.velocity[i3 + 1] = (Math.random() - 0.5) * (this.layerConfig.velocityMultiplier * 0.5)
      this.particleData.velocity[i3 + 2] = (Math.random() - 0.5) * this.layerConfig.velocityMultiplier
      
      // 随机相位
      this.particleData.phase[i] = Math.random() * Math.PI * 2
      
      // 粒子类型
      const particleType = this.generateParticleType()
      this.particleData.type[i] = particleType
    }
    
    console.log(`Generated ${this.particleCount} ${this.name} particles`)
  }

  protected createMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        cameraPosition: { value: new THREE.Vector3() },
        intensity: { value: this.layerConfig.intensity }
      },
      vertexShader: EnhancedShaders.getSimpleVertexShader(),
      fragmentShader: EnhancedShaders.getSimpleFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    console.log(`Created material for ${this.name} layer with intensity ${this.layerConfig.intensity}`)
  }

  protected initializeParticleData(): void {
    this.particleData = {
      position: new Float32Array(this.particleCount * 3),
      color: new Float32Array(this.particleCount * 3),
      size: new Float32Array(this.particleCount),
      velocity: new Float32Array(this.particleCount * 3),
      phase: new Float32Array(this.particleCount),
      depth: new Float32Array(this.particleCount),
      orbitalSpeed: new Float32Array(this.particleCount),
      type: new Float32Array(this.particleCount)
    }
  }

  protected createGeometry(): void {
    this.geometry = new THREE.BufferGeometry()
    
    // 设置属性
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.particleData.position, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.particleData.color, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.particleData.size, 1))
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.particleData.velocity, 3))
    this.geometry.setAttribute('phase', new THREE.BufferAttribute(this.particleData.phase, 1))
    this.geometry.setAttribute('depth', new THREE.BufferAttribute(this.particleData.depth, 1))
    this.geometry.setAttribute('orbitalSpeed', new THREE.BufferAttribute(this.particleData.orbitalSpeed, 1))
    this.geometry.setAttribute('particleType', new THREE.BufferAttribute(this.particleData.type, 1))
  }

  protected generateSpatialPosition(index: number): THREE.Vector3 {
    const position = new THREE.Vector3()
    
    switch (this.spatialDistribution) {
      case SpatialDistribution.SPIRAL:
        position.copy(this.generateSpiralPosition(index))
        break
      case SpatialDistribution.RING:
        position.copy(this.generateRingPosition(index))
        break
      case SpatialDistribution.SPHERICAL:
        position.copy(this.generateSphericalPosition(index))
        break
      case SpatialDistribution.GALAXY_ARM:
        position.copy(this.generateGalaxyArmPosition(index))
        break
      default:
        position.copy(this.generateSphericalPosition(index))
    }
    
    return position
  }

  protected generateSpiralPosition(index: number): THREE.Vector3 {
    const t = (index / this.particleCount) * Math.PI * 4
    const radius = (this.depthRange[0] + (this.depthRange[1] - this.depthRange[0]) * (index / this.particleCount)) * (0.5 + Math.random() * 0.5)
    
    return new THREE.Vector3(
      Math.cos(t) * radius + (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 20,
      Math.sin(t) * radius + (Math.random() - 0.5) * 5
    )
  }

  protected generateRingPosition(_index: number): THREE.Vector3 {
    const angle = (_index / this.particleCount) * Math.PI * 2
    const radius = this.depthRange[0] + (this.depthRange[1] - this.depthRange[0]) * (0.7 + Math.random() * 0.3)
    
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 8,
      Math.sin(angle) * radius
    )
  }

  protected generateSphericalPosition(_index: number): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = this.depthRange[0] + (this.depthRange[1] - this.depthRange[0]) * Math.random()
    
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    )
  }

  protected generateGalaxyArmPosition(index: number): THREE.Vector3 {
    const armIndex = Math.floor(Math.random() * 3) // 3 arms
    const armAngle = (armIndex * Math.PI * 2) / 3
    const spiralAngle = (index / this.particleCount) * Math.PI * 2 + armAngle
    const radius = (this.depthRange[0] + (this.depthRange[1] - this.depthRange[0]) * Math.random()) * (0.3 + Math.random() * 0.7)
    
    return new THREE.Vector3(
      Math.cos(spiralAngle) * radius + (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 15,
      Math.sin(spiralAngle) * radius + (Math.random() - 0.5) * 8
    )
  }

  protected generateParticleColor(depth: number, _distanceFromCenter: number): THREE.Color {
    const color = new THREE.Color()
    
    // 根据深度和距离选择颜色
    const colorIndex = Math.floor(Math.random() * this.colorPalette.length)
    color.copy(this.colorPalette[colorIndex])
    
    // 根据深度调整亮度 - 使用配置参数
    const brightness = this.layerConfig.brightnessBase + depth * this.layerConfig.brightnessMultiplier
    color.multiplyScalar(brightness)
    
    return color
  }

  protected generateParticleSize(depth: number, _distanceFromCenter: number): number {
    const baseSize = this.sizeRange[0] + (this.sizeRange[1] - this.sizeRange[0]) * Math.random()
    const depthFactor = 0.5 + depth * 0.5
    return baseSize * depthFactor
  }

  protected generateParticleType(): ParticleType {
    const random = Math.random()
    if (random < 0.05) return ParticleType.SUPERNOVA
    if (random < 0.1) return ParticleType.PULSAR
    if (random < 0.2) return ParticleType.NEBULA
    if (random < 0.3) return ParticleType.ENERGY_FIELD
    return ParticleType.STAR
  }

  public onWindowResize?(width: number, height: number): void {
    // 基础粒子层的窗口大小调整处理
    // 子类可以重写此方法来实现特定的调整逻辑
    console.log(`ParticleLayer: Window resized to ${width}x${height}`)
  }
}