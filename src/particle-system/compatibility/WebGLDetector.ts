export interface WebGLCapabilities {
  webgl1: boolean
  webgl2: boolean
  maxTextureSize: number
  maxVertexUniforms: number
  maxFragmentUniforms: number
  maxVaryingVectors: number
  maxVertexAttributes: number
  maxDrawBuffers: number
  extensions: string[]
  renderer: string
  vendor: string
  version: string
}

export interface CompatibilityReport {
  isSupported: boolean
  capabilities: WebGLCapabilities | null
  recommendedFallback: 'css' | 'canvas' | 'none'
  warnings: string[]
  errors: string[]
}

export class WebGLDetector {
  private static instance: WebGLDetector
  private capabilities: WebGLCapabilities | null = null
  private report: CompatibilityReport | null = null

  private constructor() {
    this.detectCapabilities()
  }

  public static getInstance(): WebGLDetector {
    if (!WebGLDetector.instance) {
      WebGLDetector.instance = new WebGLDetector()
    }
    return WebGLDetector.instance
  }

  private detectCapabilities(): void {
    try {
      const canvas = document.createElement('canvas')
      const gl = this.getWebGLContext(canvas)

      if (!gl) {
        this.report = {
          isSupported: false,
          capabilities: null,
          recommendedFallback: 'css',
          warnings: [],
          errors: ['WebGL is not supported by this browser']
        }
        return
      }

      // 检测WebGL能力
      this.capabilities = this.analyzeWebGLCapabilities(gl)

      // 生成兼容性报告
      this.report = this.generateCompatibilityReport(this.capabilities)

      console.log('WebGL Detection completed:', this.report)
    } catch (error) {
      console.error('WebGL detection failed:', error)
      this.report = {
        isSupported: false,
        capabilities: null,
        recommendedFallback: 'css',
        warnings: [],
        errors: [`WebGL detection failed: ${error}`]
      }
    }
  }

  private getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | WebGL2RenderingContext | null {
    const contextOptions = {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default' as WebGLPowerPreference
    }

    // 尝试WebGL2
    let gl = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext
    if (gl) return gl

    // 回退到WebGL1
    gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext
    if (gl) return gl

    // 尝试实验性上下文
    gl = canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext
    return gl
  }

  private analyzeWebGLCapabilities(gl: WebGLRenderingContext | WebGL2RenderingContext): WebGLCapabilities {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const extensions = gl.getSupportedExtensions() || []

    return {
      webgl1: gl instanceof WebGLRenderingContext,
      webgl2: gl instanceof WebGL2RenderingContext,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS || 1),
      extensions,
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
      version: gl.getParameter(gl.VERSION)
    }
  }

  private generateCompatibilityReport(capabilities: WebGLCapabilities): CompatibilityReport {
    const warnings: string[] = []
    const errors: string[] = []
    let isSupported = true
    let recommendedFallback: 'css' | 'canvas' | 'none' = 'none'

    // 检查基本要求
    if (capabilities.maxTextureSize < 1024) {
      errors.push('Maximum texture size is too small (< 1024)')
      isSupported = false
    }

    if (capabilities.maxVertexUniforms < 128) {
      warnings.push('Low vertex uniform count may affect performance')
    }

    if (capabilities.maxFragmentUniforms < 16) {
      warnings.push('Low fragment uniform count may affect visual quality')
    }

    // 检查关键扩展
    const requiredExtensions = [
      'OES_vertex_array_object',
      'WEBGL_depth_texture'
    ]

    const missingExtensions = requiredExtensions.filter(ext =>
      !capabilities.extensions.includes(ext)
    )

    if (missingExtensions.length > 0) {
      warnings.push(`Missing extensions: ${missingExtensions.join(', ')}`)
    }

    // 检查已知问题的GPU
    if (this.isProblematicGPU(capabilities.renderer)) {
      warnings.push('GPU may have compatibility issues')
      recommendedFallback = 'css'
    }

    // 检查移动设备限制
    if (this.isMobileDevice()) {
      if (capabilities.maxTextureSize < 2048) {
        warnings.push('Mobile device with limited texture size')
      }
      if (!capabilities.webgl2) {
        warnings.push('WebGL2 not available on mobile device')
      }
    }

    // 确定推荐的降级策略
    if (!isSupported) {
      recommendedFallback = 'css'
    } else if (warnings.length > 2) {
      recommendedFallback = 'canvas'
    }

    return {
      isSupported,
      capabilities,
      recommendedFallback,
      warnings,
      errors
    }
  }

  private isProblematicGPU(renderer: string): boolean {
    const problematicPatterns = [
      /Intel.*HD.*Graphics.*[23]\d{3}/i, // 老旧的Intel HD Graphics
      /Mali-[234]\d{2}/i, // 老旧的Mali GPU
      /Adreno.*[23]\d{2}/i, // 老旧的Adreno GPU
      /PowerVR.*SGX/i // 老旧的PowerVR GPU
    ]

    return problematicPatterns.some(pattern => pattern.test(renderer))
  }

  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // 公共方法
  public getCompatibilityReport(): CompatibilityReport {
    if (!this.report) {
      throw new Error('WebGL detection not completed')
    }
    return this.report
  }

  public isWebGLSupported(): boolean {
    return this.report?.isSupported ?? false
  }

  public getCapabilities(): WebGLCapabilities | null {
    return this.capabilities
  }

  public getRecommendedFallback(): 'css' | 'canvas' | 'none' {
    return this.report?.recommendedFallback ?? 'css'
  }

  public hasWarnings(): boolean {
    return (this.report?.warnings.length ?? 0) > 0
  }

  public hasErrors(): boolean {
    return (this.report?.errors.length ?? 0) > 0
  }

  public getDetailedReport(): string {
    if (!this.report) {
      return 'WebGL detection not completed'
    }

    let report = 'WebGL Compatibility Report\n'
    report += '==========================\n\n'

    report += `Support Status: ${this.report.isSupported ? 'Supported' : 'Not Supported'}\n`
    report += `Recommended Fallback: ${this.report.recommendedFallback}\n\n`

    if (this.capabilities) {
      report += 'Capabilities:\n'
      report += `- WebGL 1.0: ${this.capabilities.webgl1 ? 'Yes' : 'No'}\n`
      report += `- WebGL 2.0: ${this.capabilities.webgl2 ? 'Yes' : 'No'}\n`
      report += `- Max Texture Size: ${this.capabilities.maxTextureSize}\n`
      report += `- Max Vertex Uniforms: ${this.capabilities.maxVertexUniforms}\n`
      report += `- Max Fragment Uniforms: ${this.capabilities.maxFragmentUniforms}\n`
      report += `- Renderer: ${this.capabilities.renderer}\n`
      report += `- Vendor: ${this.capabilities.vendor}\n`
      report += `- Version: ${this.capabilities.version}\n\n`
    }

    if (this.report.warnings.length > 0) {
      report += 'Warnings:\n'
      this.report.warnings.forEach(warning => {
        report += `- ${warning}\n`
      })
      report += '\n'
    }

    if (this.report.errors.length > 0) {
      report += 'Errors:\n'
      this.report.errors.forEach(error => {
        report += `- ${error}\n`
      })
      report += '\n'
    }

    return report
  }

  public static checkWebGLSupport(): boolean {
    const detector = WebGLDetector.getInstance()
    return detector.isWebGLSupported()
  }

  public static getQuickReport(): CompatibilityReport {
    const detector = WebGLDetector.getInstance()
    return detector.getCompatibilityReport()
  }
}