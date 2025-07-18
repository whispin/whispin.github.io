// Enhanced Deep Space Particle Shaders
// 增强版深空粒子着色器，具有3D轨道运动、多层发光和距离雾化效果

export class EnhancedShaders {
  // 增强版顶点着色器 - 3D轨道运动和呼吸效果
  static getEnhancedVertexShader(): string {
    return `
      precision highp float;
      
      // 自定义属性（Three.js内置了position）
      attribute vec3 color;
      attribute float size;
      attribute vec3 velocity;
      attribute float phase;
      attribute float depth;
      attribute float orbitalSpeed;
      attribute float particleType;

      // 传递给片段着色器的变量
      varying vec3 vColor;
      varying float vAlpha;
      varying float vSize;
      varying float vDepth;
      varying float vType;
      varying vec3 vPosition;

      // 自定义统一变量（Three.js内置了cameraPosition, modelMatrix等）
      uniform float time;
      uniform vec2 mouse;
      uniform float intensity;
      
      // 3D轨道运动函数
      vec3 orbitalMotion(vec3 pos, float t, float speed, float ph) {
        float angle = t * speed + ph;
        float radius = length(pos.xz);
        
        // 螺旋运动
        vec3 newPos = pos;
        newPos.x = cos(angle) * radius;
        newPos.z = sin(angle) * radius;
        
        // 垂直呼吸效果
        newPos.y += sin(t * 2.0 + ph) * 0.5;
        
        return newPos;
      }
      
      // 鼠标交互的3D视差效果
      vec3 mouseParallax(vec3 pos, vec2 mousePos, float d) {
        vec3 parallax = vec3(0.0);
        float parallaxStrength = (1.0 - d) * 8.0;
        
        parallax.x = mousePos.x * parallaxStrength;
        parallax.y = mousePos.y * parallaxStrength;
        parallax.z = length(mousePos) * parallaxStrength * 0.5;
        
        return pos + parallax;
      }
      
      // 呼吸和脉动效果
      float breathingEffect(float t, float ph, float type) {
        float baseBreath = 0.8 + sin(t * 1.5 + ph) * 0.2;
        
        // 根据粒子类型调整呼吸效果
        if (type == 1.0) { // 超新星
          baseBreath *= 1.5 + sin(t * 8.0 + ph) * 0.3;
        } else if (type == 2.0) { // 脉冲星
          baseBreath *= 1.2 + sin(t * 12.0 + ph) * 0.4;
        }
        
        return baseBreath;
      }
      
      void main() {
        vColor = color;
        vDepth = depth;
        vType = particleType;
        
        // 应用3D轨道运动
        vec3 pos = orbitalMotion(position, time, orbitalSpeed, phase);
        
        // 应用鼠标视差效果
        pos = mouseParallax(pos, mouse, depth);
        
        // 计算世界位置
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vPosition = worldPosition.xyz;
        
        // 应用模型视图变换
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        // 计算透视投影
        gl_Position = projectionMatrix * mvPosition;
        
        // 计算粒子大小 - 基于深度和距离
        float distanceFromCamera = length(mvPosition.xyz);
        float sizeFactor = 1.0 / (1.0 + distanceFromCamera * 0.01);
        
        // 应用呼吸效果
        float breathFactor = breathingEffect(time, phase, particleType);
        
        // 最终大小计算
        vSize = size * sizeFactor * breathFactor * intensity;
        gl_PointSize = vSize;
        
        // 计算透明度 - 基于深度和距离
        vAlpha = depth * (1.0 - distanceFromCamera * 0.003);
        vAlpha = clamp(vAlpha, 0.0, 1.0);
      }
    `;
  }

  // 增强版片段着色器 - 多层发光和距离雾化
  static getEnhancedFragmentShader(): string {
    return `
      precision highp float;
      
      // 从顶点着色器传入的变量
      varying vec3 vColor;
      varying float vAlpha;
      varying float vSize;
      varying float vDepth;
      varying float vType;
      varying vec3 vPosition;
      
      // 自定义统一变量
      uniform float time;
      uniform vec2 mouse;
      uniform float intensity;

      // 点击效果相关
      uniform vec2 clickPositions[5];
      uniform float clickIntensities[5];
      uniform float clickRadii[5];
      uniform int activeClickCount;
      
      // 多层发光效果
      vec4 multiLayerGlow(vec2 center, vec3 color, float type, float t) {
        float dist = length(center);
        
        // 核心光层
        float coreGlow = 1.0 - smoothstep(0.0, 0.2, dist);
        
        // 内光层
        float innerGlow = 1.0 - smoothstep(0.1, 0.4, dist);
        
        // 外光层
        float outerGlow = 1.0 - smoothstep(0.3, 0.5, dist);
        
        // 根据粒子类型调整发光
        if (type == 1.0) { // 超新星
          coreGlow *= 2.0 + sin(t * 8.0) * 0.5;
          innerGlow *= 1.5;
        } else if (type == 2.0) { // 脉冲星
          float pulse = sin(t * 12.0) * 0.5 + 0.5;
          coreGlow *= 1.5 + pulse;
          innerGlow *= 1.2;
        }
        
        // 组合光层
        float totalGlow = coreGlow * 0.6 + innerGlow * 0.3 + outerGlow * 0.1;
        
        // 科技感脉冲效果
        float techPulse = sin(t * 3.0 + dist * 10.0) * 0.1 + 0.9;
        totalGlow *= techPulse;
        
        return vec4(color, totalGlow);
      }
      
      // 距离雾化效果
      vec4 distanceFog(vec4 color, float depth, vec3 pos) {
        float distanceFromCamera = length(pos - cameraPosition);
        float fogFactor = 1.0 - exp(-distanceFromCamera * 0.002);
        
        // 深空雾化颜色
        vec3 fogColor = vec3(0.05, 0.1, 0.2);
        
        // 应用雾化
        vec3 finalColor = mix(color.rgb, fogColor, fogFactor * (1.0 - depth));
        float finalAlpha = color.a * (1.0 - fogFactor * 0.3);
        
        return vec4(finalColor, finalAlpha);
      }
      
      // 能量光环效果
      vec4 energyHalo(vec2 center, vec3 color, float type, float t) {
        float dist = length(center);
        
        // 基础光环
        float halo = 0.0;
        
        // 多重光环
        for (int i = 0; i < 3; i++) {
          float ringPos = 0.2 + float(i) * 0.1;
          float ringWidth = 0.05 + sin(t + float(i)) * 0.02;
          float ring = 1.0 - smoothstep(ringPos - ringWidth, ringPos + ringWidth, dist);
          halo += ring * (1.0 - float(i) * 0.3);
        }
        
        // 旋转光环
        float angle = atan(center.y, center.x);
        float rotation = t * 2.0;
        float spiralHalo = sin(angle * 4.0 + rotation) * 0.5 + 0.5;
        halo *= spiralHalo;
        
        return vec4(color, halo * 0.3);
      }

      // 点击波动效果
      float calculateClickEffect(vec3 worldPos) {
        float totalEffect = 0.0;

        for (int i = 0; i < 5; i++) {
          if (i >= activeClickCount) break;

          // 将屏幕坐标转换为世界坐标（简化版）
          vec2 screenPos = (worldPos.xy + 1.0) * 0.5;
          vec2 clickPos = clickPositions[i] / vec2(1920.0, 1080.0); // 假设屏幕分辨率

          float distance = length(screenPos - clickPos);
          float radius = clickRadii[i] / 1000.0; // 标准化半径

          if (distance < radius) {
            float wave = sin((distance / radius) * 3.14159 * 4.0 - time * 8.0) * 0.5 + 0.5;
            float falloff = 1.0 - (distance / radius);
            totalEffect += wave * falloff * clickIntensities[i];
          }
        }

        return clamp(totalEffect, 0.0, 2.0);
      }

      void main() {
        // 计算中心点
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        // 丢弃超出半径的片段
        if (dist > 0.5) discard;
        
        // 计算多层发光
        vec4 glowColor = multiLayerGlow(center, vColor, vType, time);
        
        // 添加能量光环
        vec4 haloColor = energyHalo(center, vColor, vType, time);
        
        // 组合效果
        vec4 finalColor = glowColor + haloColor;

        // 计算点击效果
        float clickEffect = calculateClickEffect(vPosition);
        finalColor.rgb += finalColor.rgb * clickEffect * 0.5; // 增强亮度
        finalColor.a += clickEffect * 0.3; // 增强透明度

        // 应用距离雾化
        finalColor = distanceFog(finalColor, vDepth, vPosition);
        
        // 应用全局透明度和强度
        finalColor.a *= vAlpha * intensity;
        
        // 确保不会过度曝光
        finalColor.rgb = clamp(finalColor.rgb, 0.0, 2.0);
        finalColor.a = clamp(finalColor.a, 0.0, 1.0);
        
        gl_FragColor = finalColor;
      }
    `;
  }

  // 备用简化着色器 - 用于兼容性
  static getSimpleVertexShader(): string {
    return `
      precision mediump float;
      
      // 自定义属性（Three.js内置了position）
      attribute vec3 color;
      attribute float size;
      attribute float phase;
      attribute float depth;
      attribute vec3 velocity;
      attribute float orbitalSpeed;
      attribute float particleType;

      varying vec3 vColor;
      varying float vAlpha;

      uniform float time;
      uniform vec2 mouse;
      uniform float intensity;
      
      void main() {
        vColor = color;
        vAlpha = depth;
        
        vec3 pos = position;
        
        // 简单的鼠标交互
        pos.x += mouse.x * depth * 2.0;
        pos.y += mouse.y * depth * 2.0;
        
        // 简单的呼吸效果
        float breathe = 0.8 + sin(time * 2.0 + phase) * 0.2;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        gl_PointSize = size * breathe * intensity;
      }
    `;
  }

  static getSimpleFragmentShader(): string {
    return `
      precision mediump float;
      
      varying vec3 vColor;
      varying float vAlpha;
      
      uniform float time;
      uniform float intensity;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= vAlpha * intensity;
        
        gl_FragColor = vec4(vColor, alpha);
      }
    `;
  }
}