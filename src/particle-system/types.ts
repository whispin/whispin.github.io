import * as THREE from 'three'

// 质量等级枚举
export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

// 粒子数据接口
export interface ParticleData {
  position: Float32Array      // [x, y, z] * count
  color: Float32Array         // [r, g, b] * count
  size: Float32Array          // size * count
  velocity: Float32Array      // [vx, vy, vz] * count
  phase: Float32Array         // phase * count
  depth: Float32Array         // depth factor * count
  orbitalSpeed: Float32Array  // orbital speed * count
  type: Float32Array          // particle type * count
}

// 统一变量接口
export interface UniformData {
  time: { value: number }
  mouse: { value: THREE.Vector2 }
  cameraPosition: { value: THREE.Vector3 }
  resolution: { value: THREE.Vector2 }
  quality: { value: number }
  intensity: { value: number }
}

// 颜色调色板接口
export interface ColorPalette {
  stars: THREE.Color[]        // 恒星颜色
  nebula: THREE.Color[]       // 星云颜色
  energy: THREE.Color[]       // 能量场颜色
  background: THREE.Color[]   // 背景颜色
}

// 粒子层接口
export interface ParticleLayer {
  name: string
  particleCount: number
  geometry: THREE.BufferGeometry
  material: THREE.ShaderMaterial
  points: THREE.Points
  
  create(): void
  updateUniforms(time: number, mouse: THREE.Vector2): void
  dispose(): void
}

// 粒子系统管理器接口
export interface ParticleSystemManager {
  scene: THREE.Scene
  particleLayers: ParticleLayer[]
  
  initialize(): void
  update(deltaTime: number): void
  dispose(): void
  setQuality(level: QualityLevel): void
}

// 空间分布类型
export enum SpatialDistribution {
  SPIRAL = 'spiral',
  RING = 'ring',
  SPHERICAL = 'spherical',
  GALAXY_ARM = 'galaxy_arm'
}

// 粒子类型
export enum ParticleType {
  STAR = 0,
  SUPERNOVA = 1,
  PULSAR = 2,
  NEBULA = 3,
  ENERGY_FIELD = 4
}