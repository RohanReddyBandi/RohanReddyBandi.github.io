import gsap from 'gsap'

// The cursor's trail, after lenvalproperties.com: moving the pointer stirs a
// small fluid simulation (WebGL2, the usual advect / project steps), and the
// smoke it leaves swirls, drifts and fades. Here the smoke is drawn broken:
// chunky pixel blocks, rows torn sideways, the channels split apart along the
// flow, scanlines and the odd white block, re-rolled ~14 times a second. The
// canvas blends with `difference`, so wherever the smoke goes the page under
// it inverts (green on black, magenta over light text). Kept cheap: small
// grids, all of a frame's splats in one pass, and the broken look drawn at
// half resolution (it's blocky anyway). Runs only while there's smoke;
// returns null where WebGL2 can't render to float textures.

const SIM = 80 // velocity grid, short side
const DYE = 160 // smoke grid, short side
const RES = 0.5 // canvas pixels per CSS pixel
const RADIUS = 20 // splat radius, CSS px
const FORCE = 3 // pointer px → velocity: enough to curl, not to fling
const JACOBI = 8 // pressure iterations
const VEL_KEEP = 0.96 // velocity kept per frame (at 60fps)
const DYE_KEEP = 0.96 // smoke kept per frame: a short trail
const IDLE = 1.5 // s without input before it stops
const MAX_SPLATS = 16 // per frame, one pass (matches the shader's arrays)

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const frag = (body: string) => `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
${body}`

// Every splat this frame in one pass
const SPLAT = frag(`
uniform sampler2D uTarget;
uniform float uAspect;
uniform float uRadius;
uniform int uCount;
uniform vec2 uPoints[${MAX_SPLATS}];
uniform vec3 uValues[${MAX_SPLATS}];
void main() {
  vec3 add = vec3(0.0);
  for (int i = 0; i < ${MAX_SPLATS}; i++) {
    if (i >= uCount) break;
    vec2 p = vUv - uPoints[i];
    p.x *= uAspect;
    add += exp(-dot(p, p) / uRadius) * uValues[i];
  }
  o = vec4(texture(uTarget, vUv).xyz + add, 1.0);
}`)

const ADVECT = frag(`
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uKeep;
void main() {
  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  o = vec4(uKeep * texture(uSource, from).xyz, 1.0);
}`)

const DIVERGENCE = frag(`
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  vec2 c = texture(uVelocity, vUv).xy;
  float l = vUv.x - uTexel.x < 0.0 ? -c.x : texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float r = vUv.x + uTexel.x > 1.0 ? -c.x : texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float b = vUv.y - uTexel.y < 0.0 ? -c.y : texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float t = vUv.y + uTexel.y > 1.0 ? -c.y : texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  o = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`)

const SCALE = frag(`
uniform sampler2D uSource;
uniform float uKeep;
void main() {
  o = vec4(uKeep * texture(uSource, vUv).xyz, 1.0);
}`)

const PRESSURE = frag(`
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  o = vec4(0.25 * (l + r + b + t - texture(uDivergence, vUv).x), 0.0, 0.0, 1.0);
}`)

const GRADIENT = frag(`
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(r - l, t - b), 0.0, 1.0);
}`)

// The broken look. Everything is in canvas pixels (half CSS pixels), keyed
// to uTick (a whole number that steps ~14 times a second) so the glitch
// jumps, not drifts.
const DISPLAY = frag(`
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec2 uRes;
uniform float uTick;
uniform vec3 uBrand;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float level(float d) { return floor(clamp(d, 0.0, 1.0) * 4.0) / 4.0; }
void main() {
  vec2 px = vUv * uRes;
  float here = texture(uDye, vUv).x;
  // rows torn sideways, only where there's smoke
  float bandH = 3.0 + floor(13.0 * hash(vec2(uTick, 1.3)));
  float band = floor(px.y / bandH);
  float tear = (hash(vec2(band, uTick)) - 0.5) * 2.0 * step(0.55, hash(vec2(band, uTick + 9.1)));
  px.x += tear * 19.0 * smoothstep(0.06, 0.5, here);
  // chunky blocks, a different size in each patch
  float area = hash(floor(px / 48.0) + uTick * 0.37);
  float size = floor(mix(2.0, 7.0, area));
  vec2 uv = (floor(px / size) + 0.5) * size / uRes;
  // channels pulled apart along the flow
  vec2 flow = clamp(texture(uVelocity, uv).xy * 0.02, -5.0, 5.0);
  vec2 split = (vec2(1.5, 0.0) + flow) / uRes;
  float r = level(texture(uDye, uv + split).x);
  float g = level(texture(uDye, uv).x);
  float b = level(texture(uDye, uv - split).x);
  vec3 c = uBrand * g + vec3(1.0, 0.1, 0.35) * max(r - g, 0.0) + vec3(0.2, 0.5, 1.0) * max(b - g, 0.0);
  // the odd block flashes white
  c = mix(c, vec3(1.0), step(0.985, hash(floor(px / 4.0) + uTick * 1.7)) * step(0.2, g));
  // scanlines
  c *= 0.75 + 0.25 * mod(floor(px.y), 2.0);
  o = vec4(c, max(max(c.r, c.g), c.b));
}`)

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }
type Double = { read: Target; write: Target; swap(): void }
type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

export class GlitchSmoke {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private buffer: WebGLBuffer
  private brand: [number, number, number]
  private programs: Record<'splat' | 'advect' | 'divergence' | 'scale' | 'pressure' | 'gradient' | 'display', Program>
  private velocity?: Double
  private dye?: Double
  private pressure?: Double
  private divergence?: Target
  private queue: { x: number; y: number; dx: number; dy: number; amount: number }[] = []
  private points = new Float32Array(MAX_SPLATS * 2)
  private values = new Float32Array(MAX_SPLATS * 3)
  private last: { x: number; y: number } | null = null
  private running = false
  private idle = 0
  private time = 0

  /** null when this browser can't run it */
  static create(canvas: HTMLCanvasElement, brand: [number, number, number]) {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false })
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null
    try {
      return new GlitchSmoke(gl, canvas, brand)
    } catch {
      return null
    }
  }

  private constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, brand: [number, number, number]) {
    this.gl = gl
    this.canvas = canvas
    this.brand = brand
    // one triangle that covers the screen
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    this.programs = {
      splat: this.program(SPLAT),
      advect: this.program(ADVECT),
      divergence: this.program(DIVERGENCE),
      scale: this.program(SCALE),
      pressure: this.program(PRESSURE),
      gradient: this.program(GRADIENT),
      display: this.program(DISPLAY),
    }
    this.resize()
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.canvas.width = Math.ceil(w * RES)
    this.canvas.height = Math.ceil(h * RES)
    const grid = (short: number) => (w < h ? [short, Math.round((short * h) / w)] : [Math.round((short * w) / h), short])
    const [sw, sh] = grid(SIM)
    const [dw, dh] = grid(DYE)
    for (const d of [this.velocity, this.pressure, this.dye]) if (d) this.free(d.read, d.write)
    if (this.divergence) this.free(this.divergence)
    this.velocity = this.double(sw, sh)
    this.pressure = this.double(sw, sh)
    this.divergence = this.target(sw, sh)
    this.dye = this.double(dw, dh)
  }

  /** The pointer moved to (x, y), in CSS px */
  move(x: number, y: number) {
    const from = this.last
    this.last = { x, y }
    if (!from) return
    const dx = x - from.x
    const dy = y - from.y
    const dist = Math.hypot(dx, dy)
    if (!dist) return
    // fast moves get in-between splats so the trail doesn't break up
    const steps = Math.min(4, Math.ceil(dist / RADIUS))
    const amount = 0.28 + Math.min(dist / 60, 1) * 0.32
    for (let i = 1; i <= steps; i++) {
      const k = i / steps
      this.queue.push({ x: from.x + dx * k, y: from.y + dy * k, dx: dx / steps, dy: dy / steps, amount })
    }
    this.idle = 0
    if (!this.running) {
      this.running = true
      this.canvas.style.visibility = 'visible'
      gsap.ticker.add(this.tick)
    }
  }

  /** The pointer left; the next move starts a new stroke */
  lift() {
    this.last = null
  }

  // Frees what it made but keeps the context: the canvas may get a new
  // GlitchSmoke (React remounts), and a lost context can't be reused
  destroy() {
    gsap.ticker.remove(this.tick)
    const gl = this.gl
    for (const d of [this.velocity, this.pressure, this.dye]) if (d) this.free(d.read, d.write)
    if (this.divergence) this.free(this.divergence)
    for (const { prog } of Object.values(this.programs)) gl.deleteProgram(prog)
    gl.deleteBuffer(this.buffer)
  }

  private tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 1 / 30)
    this.time += dt
    this.idle += dt
    if (this.idle > IDLE) {
      gsap.ticker.remove(this.tick)
      this.running = false
      this.canvas.style.visibility = 'hidden'
      return
    }
    this.step(dt)
    this.render()
  }

  private step(dt: number) {
    const { programs: p } = this
    const velocity = this.velocity!
    const dye = this.dye!
    const pressure = this.pressure!
    const divergence = this.divergence!
    const w = window.innerWidth
    const h = window.innerHeight
    const aspect = w / h
    const radius = (RADIUS / h) ** 2

    // this frame's splats (at most MAX_SPLATS, spread over the stroke)
    const queued = this.queue.splice(0)
    const count = Math.min(queued.length, MAX_SPLATS)
    if (count) {
      const pick = (i: number) => queued[Math.round((i * (queued.length - 1)) / Math.max(1, count - 1))]
      const thin = queued.length / count // fewer splats each carry more
      for (let i = 0; i < count; i++) {
        const s = pick(i)
        this.points.set([s.x / w, 1 - s.y / h], i * 2)
        this.values.set([s.dx * FORCE * thin, -s.dy * FORCE * thin, 0], i * 3)
      }
      this.splat(velocity, count, radius, aspect)
      for (let i = 0; i < count; i++) this.values.set([pick(i).amount, 0, 0], i * 3)
      this.splat(dye, count, radius, aspect)
    }

    const texel = [1 / velocity.read.w, 1 / velocity.read.h]
    this.pass(p.divergence, divergence, { uVelocity: velocity.read, uTexel: texel })
    this.pass(p.scale, pressure.write, { uSource: pressure.read, uKeep: 0.8 })
    pressure.swap()
    for (let i = 0; i < JACOBI; i++) {
      this.pass(p.pressure, pressure.write, { uPressure: pressure.read, uDivergence: divergence, uTexel: texel })
      pressure.swap()
    }
    this.pass(p.gradient, velocity.write, { uPressure: pressure.read, uVelocity: velocity.read, uTexel: texel })
    velocity.swap()

    const frames = dt * 60
    this.pass(p.advect, velocity.write, {
      uVelocity: velocity.read,
      uSource: velocity.read,
      uTexel: texel,
      uDt: dt,
      uKeep: VEL_KEEP ** frames,
    })
    velocity.swap()
    this.pass(p.advect, dye.write, {
      uVelocity: velocity.read,
      uSource: dye.read,
      uTexel: texel,
      uDt: dt,
      uKeep: DYE_KEEP ** frames,
    })
    dye.swap()
  }

  private render() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.bind(this.programs.display, {
      uDye: this.dye!.read,
      uVelocity: this.velocity!.read,
      uRes: [this.canvas.width, this.canvas.height],
      uTick: Math.floor(this.time * 14),
      uBrand: this.brand,
    })
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private splat(target: Double, count: number, radius: number, aspect: number) {
    const gl = this.gl
    const { u } = this.programs.splat
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fbo)
    gl.viewport(0, 0, target.write.w, target.write.h)
    this.bind(this.programs.splat, { uTarget: target.read, uRadius: radius, uAspect: aspect })
    gl.uniform1i(u.uCount, count)
    gl.uniform2fv(u['uPoints[0]'], this.points)
    gl.uniform3fv(u['uValues[0]'], this.values)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    target.swap()
  }

  private pass(program: Program, out: Target, uniforms: Record<string, Target | number | number[]>) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo)
    gl.viewport(0, 0, out.w, out.h)
    this.bind(program, uniforms)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  // Textures go to units in the order given; numbers and vectors by length
  private bind(program: Program, uniforms: Record<string, Target | number | number[]>) {
    const gl = this.gl
    gl.useProgram(program.prog)
    let unit = 0
    for (const [name, v] of Object.entries(uniforms)) {
      const loc = program.u[name]
      if (typeof v === 'number') gl.uniform1f(loc, v)
      else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, loc, v)
      else {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, v.tex)
        gl.uniform1i(loc, unit++)
      }
    }
  }

  private program(source: string): Program {
    const gl = this.gl
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, source))
    gl.bindAttribLocation(prog, 0, 'aPos')
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'program')
    const u: Program['u'] = {}
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(prog, i)!.name
      u[name] = gl.getUniformLocation(prog, name)
    }
    return { prog, u }
  }

  private target(w: number, h: number): Target {
    const gl = this.gl
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer')
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { fbo, tex, w, h }
  }

  private free(...targets: Target[]) {
    for (const t of targets) {
      this.gl.deleteFramebuffer(t.fbo)
      this.gl.deleteTexture(t.tex)
    }
  }

  private double(w: number, h: number): Double {
    const d: Double = {
      read: this.target(w, h),
      write: this.target(w, h),
      swap() {
        ;[d.read, d.write] = [d.write, d.read]
      },
    }
    return d
  }
}
