/**
 * 统一错误处理器
 * 提供全局错误捕获和处理策略
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorInfo {
  message: string
  severity: ErrorSeverity
  context?: string
  error?: Error
  timestamp: number
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errors: ErrorInfo[] = []
  private maxErrors = 50 // 最大保存错误数量

  private constructor() {
    this.setupGlobalErrorHandlers()
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  private setupGlobalErrorHandlers(): void {
    // 全局JavaScript错误
    window.addEventListener('error', (event) => {
      this.handleError({
        message: `JavaScript Error: ${event.message}`,
        severity: ErrorSeverity.HIGH,
        context: `File: ${event.filename}, Line: ${event.lineno}`,
        timestamp: Date.now()
      })
    })

    // Promise未捕获错误
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        severity: ErrorSeverity.HIGH,
        context: 'Promise',
        timestamp: Date.now()
      })
    })
  }

  public handleError(errorInfo: ErrorInfo): void {
    // 添加到错误列表
    this.errors.push(errorInfo)
    
    // 保持错误列表长度
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }

    // 根据严重程度进行不同处理
    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', errorInfo)
        this.notifyUser(errorInfo)
        break
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH ERROR:', errorInfo)
        break
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM ERROR:', errorInfo)
        break
      case ErrorSeverity.LOW:
        console.log('ℹ️ LOW ERROR:', errorInfo)
        break
    }
  }

  public handleThreeJSError(error: Error, context: string): void {
    this.handleError({
      message: `Three.js Error: ${error.message}`,
      severity: this.determineThreeJSSeverity(error),
      context,
      error,
      timestamp: Date.now()
    })
  }

  public handleParticleSystemError(error: Error, context: string): void {
    this.handleError({
      message: `Particle System Error: ${error.message}`,
      severity: ErrorSeverity.MEDIUM,
      context,
      error,
      timestamp: Date.now()
    })
  }

  private determineThreeJSSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase()
    
    if (message.includes('webgl') || message.includes('context')) {
      return ErrorSeverity.CRITICAL
    }
    if (message.includes('shader') || message.includes('program')) {
      return ErrorSeverity.HIGH
    }
    return ErrorSeverity.MEDIUM
  }

  private notifyUser(errorInfo: ErrorInfo): void {
    // 创建用户友好的错误通知
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    `
    notification.textContent = `Critical Error: ${errorInfo.message}`
    
    document.body.appendChild(notification)
    
    // 5秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 5000)
  }

  public getRecentErrors(count = 10): ErrorInfo[] {
    return this.errors.slice(-count)
  }

  public clearErrors(): void {
    this.errors = []
  }

  public getErrorStats(): { [key in ErrorSeverity]: number } {
    return this.errors.reduce((stats, error) => {
      stats[error.severity]++
      return stats
    }, {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    })
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance()