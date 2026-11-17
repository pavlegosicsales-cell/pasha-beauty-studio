/* Liquid hover for the hero background.
   Port of the "Liquid Hover" Framer component used on sensoria.framer.website
   (stable-fluids velocity field driven by the pointer, image UVs displaced by it).
   Same shaders and solver; strength turned down so the effect stays subtle. */
(() => {
  const host = document.querySelector('[data-fluid]');
  if (!host) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(hover: none), (pointer: coarse)').matches) return; // touch: keep static photos, never block scrolling

  // template defaults are cursorSize .5, cursorPower .6, distortionPower .5; these are much softer
  const SETTINGS = { resolution: 4, cursorSize: 0.5, cursorPower: 0.22, distortionPower: 0.16 };

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'hero__canvas';
  host.appendChild(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
  if (!gl) { canvas.remove(); return; }

  // float render targets: prefer full float, fall back to half float
  let texType = null;
  const fExt = gl.getExtension('OES_texture_float');
  const fLin = gl.getExtension('OES_texture_float_linear');
  const hExt = gl.getExtension('OES_texture_half_float');
  const hLin = gl.getExtension('OES_texture_half_float_linear');
  const canRender = (type) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, type, null);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(f); gl.deleteTexture(t);
    return ok;
  };
  if (fExt && fLin && canRender(gl.FLOAT)) texType = gl.FLOAT;
  else if (hExt && hLin && canRender(hExt.HALF_FLOAT_OES)) texType = hExt.HALF_FLOAT_OES;
  if (!texType) { canvas.remove(); return; }
  gl.clearColor(0, 0, 0, 0);

  const cfg = {
    cursorSize: 0.5 + (SETTINGS.cursorSize - 0.1) * 4.5 / 0.9,
    cursorPower: 5 + (SETTINGS.cursorPower - 0.1) * 45 / 0.9,
    distortionPower: SETTINGS.distortionPower,
  };
  const OVERSCAN = 1.2;

  const VERT = `
precision highp float;
varying vec2 vUv;
attribute vec2 a_position;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform vec2 u_texel;
void main () {
  vUv = .5 * (a_position + 1.);
  vL = vUv - vec2(u_texel.x, 0.); vR = vUv + vec2(u_texel.x, 0.);
  vT = vUv + vec2(0., u_texel.y); vB = vUv - vec2(0., u_texel.y);
  gl_Position = vec4(a_position, 0., 1.);
}`;
  const SPLAT = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D u_input_texture; uniform float u_ratio; uniform vec3 u_point_value; uniform vec2 u_point; uniform float u_point_size;
void main () {
  vec2 p = vUv - u_point.xy; p.x *= u_ratio;
  vec3 splat = .6 * pow(2., -dot(p, p) / u_point_size) * u_point_value;
  vec3 base = texture2D(u_input_texture, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.);
}`;
  const DIVERGENCE = `
precision highp float; precision highp sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D u_velocity_texture;
void main () {
  float L = texture2D(u_velocity_texture, vL).x; float R = texture2D(u_velocity_texture, vR).x;
  float T = texture2D(u_velocity_texture, vT).y; float B = texture2D(u_velocity_texture, vB).y;
  gl_FragColor = vec4(.25 * (R - L + T - B), 0., 0., 1.);
}`;
  const PRESSURE = `
precision highp float; precision highp sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D u_pressure_texture; uniform sampler2D u_divergence_texture;
void main () {
  float L = texture2D(u_pressure_texture, vL).x; float R = texture2D(u_pressure_texture, vR).x;
  float T = texture2D(u_pressure_texture, vT).x; float B = texture2D(u_pressure_texture, vB).x;
  float divergence = texture2D(u_divergence_texture, vUv).x;
  gl_FragColor = vec4((L + R + B + T - divergence) * .25, 0., 0., 1.);
}`;
  const GRADIENT = `
precision highp float; precision highp sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D u_pressure_texture; uniform sampler2D u_velocity_texture;
void main () {
  float L = texture2D(u_pressure_texture, vL).x; float R = texture2D(u_pressure_texture, vR).x;
  float T = texture2D(u_pressure_texture, vT).x; float B = texture2D(u_pressure_texture, vB).x;
  vec2 velocity = texture2D(u_velocity_texture, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0., 1.);
}`;
  const ADVECT = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D u_velocity_texture; uniform sampler2D u_input_texture;
uniform vec2 u_texel; uniform vec2 u_output_textel; uniform float u_dt; uniform float u_dissipation;
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize); vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize); vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
void main () {
  vec2 coord = vUv - u_dt * bilerp(u_velocity_texture, vUv, u_texel).xy * u_texel;
  gl_FragColor = u_dissipation * bilerp(u_input_texture, coord, u_output_textel);
}`;
  const DISPLAY = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform float u_ratio; uniform float u_img_ratio; uniform float u_disturb_power;
uniform sampler2D u_output_texture; uniform sampler2D u_velocity_texture; uniform sampler2D u_text_texture;
uniform float u_canvas_scale; uniform float u_inner_scale;
vec2 get_img_uv() {
  vec2 uv = vUv - 0.5; uv *= u_canvas_scale; uv /= u_inner_scale;
  vec2 scale = vec2(1.0);
  if (u_ratio > u_img_ratio) scale.y = u_img_ratio / u_ratio; else scale.x = u_ratio / u_img_ratio;
  uv *= scale; return uv + 0.5;
}
vec2 get_frame_uv() { vec2 uv = vUv - 0.5; uv *= u_canvas_scale; uv /= u_inner_scale; return uv + 0.5; }
float frame_alpha(vec2 uv, float w) {
  float a = smoothstep(0., w, uv.x) * smoothstep(1., 1. - w, uv.x);
  return a * smoothstep(0., w, uv.y) * smoothstep(1., 1. - w, uv.y);
}
vec3 sample_image_smooth(vec2 uv) {
  vec2 uvc = clamp(uv, 0.0, 1.0);
  vec3 base = texture2D(u_text_texture, vec2(uvc.x, 1.0 - uvc.y)).rgb;
  float oob = max(max(step(uv.y, 0.0), step(1.0, uv.y)), max(step(uv.x, 0.0), step(1.0, uv.x)));
  if (oob > 0.0) {
    float d = 0.002; vec3 sum = vec3(0.0);
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
      sum += texture2D(u_text_texture, vec2(clamp(uvc.x + float(i) * d, 0.0, 1.0), 1.0 - clamp(uvc.y + float(j) * d, 0.0, 1.0))).rgb;
    base = sum / 9.0;
  }
  return base;
}
void main () {
  float offset = texture2D(u_output_texture, vUv).r;
  vec2 velocity = texture2D(u_velocity_texture, vUv).xy + .001;
  vec2 img_uv = get_img_uv();
  img_uv -= 2. * u_disturb_power * normalize(velocity) * offset;
  vec2 frame_uv = get_frame_uv() - u_disturb_power * normalize(velocity) * offset;
  vec3 img = sample_image_smooth(img_uv);
  float opacity = frame_alpha(frame_uv, .002);
  gl_FragColor = vec4(img * opacity, opacity);
}`;

  const compile = (src, type) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (frag) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(VERT, gl.VERTEX_SHADER)); gl.attachShader(p, compile(frag, gl.FRAGMENT_SHADER));
    gl.bindAttribLocation(p, 0, 'a_position'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { program: p, uniforms: u };
  };
  let P;
  try {
    P = { splat: program(SPLAT), div: program(DIVERGENCE), pres: program(PRESSURE), grad: program(GRADIENT), adv: program(ADVECT), show: program(DISPLAY) };
  } catch (e) { canvas.remove(); return; }

  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  const blit = (target = null) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
    if (target) { gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
  const fbo = (w, h) => {
    gl.activeTexture(gl.TEXTURE0);
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, texType, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      fbo: f, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, t); return id; },
      dispose() { gl.deleteTexture(t); gl.deleteFramebuffer(f); },
    };
  };
  const double = (w, h) => {
    let a = fbo(w, h), b = fbo(w, h);
    return { width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h, read: () => a, write: () => b, swap() { const t = a; a = b; b = t; }, dispose() { a.dispose(); b.dispose(); } };
  };

  const pointer = { x: 0.65 * host.clientWidth, y: 0.5 * host.clientHeight, dx: 0, dy: 0, moved: false };
  const grid = { w: 0, h: 0 };
  let out, vel, div, pres, raf = null, frames = 1, last = 0, visible = true, tabOn = document.visibilityState === 'visible';
  let imgRatio = 1, current = null;
  const textures = new Map();

  const size = () => {
    const w = host.clientWidth, h = host.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(w * OVERSCAN * dpr));
    canvas.height = Math.max(2, Math.round(h * OVERSCAN * dpr));
    const c = 128 + (SETTINGS.resolution - 1) * 384 / 9;
    grid.w = Math.round(c * (w / h)); grid.h = Math.round(c);
  };
  const buffers = () => {
    [out, vel, div, pres].forEach((b) => b && b.dispose());
    out = double(grid.w, grid.h); vel = double(grid.w, grid.h); div = fbo(grid.w, grid.h); pres = double(grid.w, grid.h);
  };
  const pointUV = () => {
    const W = host.clientWidth * OVERSCAN, H = host.clientHeight * OVERSCAN;
    const ox = 0.5 * (W - host.clientWidth), oy = 0.5 * (H - host.clientHeight);
    return { u: (pointer.x + ox) / W, v: 1 - (pointer.y + oy) / H };
  };
  const kick = (n = 120) => {
    if (!visible || !tabOn) return;
    frames = Math.max(frames, n);
    if (raf === null) raf = requestAnimationFrame(step);
  };
  const move = (x, y) => {
    pointer.moved = true;
    pointer.dx = 6 * (x - pointer.x); pointer.dy = 6 * (y - pointer.y);
    pointer.x = x; pointer.y = y;
    kick();
  };

  let rect = host.getBoundingClientRect();
  const onMove = (e) => {
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) move(e.clientX - rect.left, e.clientY - rect.top);
    else pointer.moved = false;
  };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('scroll', () => { rect = host.getBoundingClientRect(); }, { passive: true });
  const onResize = () => { rect = host.getBoundingClientRect(); size(); buffers(); kick(1); };
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => { tabOn = document.visibilityState === 'visible'; if (tabOn) kick(1); });
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) kick(1); }).observe(host);

  function step(t) {
    raf = null;
    if (!visible || !tabOn || !current) return;
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60; last = t;
    const ratio = host.clientWidth / Math.max(1, host.clientHeight);
    if (pointer.moved) {
      pointer.moved = false;
      gl.useProgram(P.splat.program);
      gl.uniform1i(P.splat.uniforms.u_input_texture, vel.read().attach(1));
      gl.uniform1f(P.splat.uniforms.u_ratio, ratio);
      const p = pointUV();
      gl.uniform2f(P.splat.uniforms.u_point, p.u, p.v);
      gl.uniform3f(P.splat.uniforms.u_point_value, pointer.dx, -pointer.dy, 0);
      gl.uniform1f(P.splat.uniforms.u_point_size, cfg.cursorSize * 0.001);
      blit(vel.write()); vel.swap();
      gl.uniform1i(P.splat.uniforms.u_input_texture, out.read().attach(1));
      gl.uniform3f(P.splat.uniforms.u_point_value, cfg.cursorPower * 0.001, 0, 0);
      blit(out.write()); out.swap();
    }
    gl.useProgram(P.div.program);
    gl.uniform2f(P.div.uniforms.u_texel, vel.texelSizeX, vel.texelSizeY);
    gl.uniform1i(P.div.uniforms.u_velocity_texture, vel.read().attach(1));
    blit(div);
    gl.useProgram(P.pres.program);
    gl.uniform2f(P.pres.uniforms.u_texel, vel.texelSizeX, vel.texelSizeY);
    gl.uniform1i(P.pres.uniforms.u_divergence_texture, div.attach(1));
    for (let i = 0; i < 16; i++) { gl.uniform1i(P.pres.uniforms.u_pressure_texture, pres.read().attach(2)); blit(pres.write()); pres.swap(); }
    gl.useProgram(P.grad.program);
    gl.uniform2f(P.grad.uniforms.u_texel, vel.texelSizeX, vel.texelSizeY);
    gl.uniform1i(P.grad.uniforms.u_pressure_texture, pres.read().attach(1));
    gl.uniform1i(P.grad.uniforms.u_velocity_texture, vel.read().attach(2));
    blit(vel.write()); vel.swap();
    gl.useProgram(P.adv.program);
    gl.uniform2f(P.adv.uniforms.u_texel, vel.texelSizeX, vel.texelSizeY);
    gl.uniform2f(P.adv.uniforms.u_output_textel, vel.texelSizeX, vel.texelSizeY);
    gl.uniform1i(P.adv.uniforms.u_velocity_texture, vel.read().attach(1));
    gl.uniform1i(P.adv.uniforms.u_input_texture, vel.read().attach(1));
    gl.uniform1f(P.adv.uniforms.u_dt, dt); gl.uniform1f(P.adv.uniforms.u_dissipation, 0.97);
    blit(vel.write()); vel.swap();
    gl.uniform2f(P.adv.uniforms.u_output_textel, out.texelSizeX, out.texelSizeY);
    gl.uniform1i(P.adv.uniforms.u_input_texture, out.read().attach(2));
    gl.uniform1f(P.adv.uniforms.u_dt, 8 * dt); gl.uniform1f(P.adv.uniforms.u_dissipation, 0.98);
    blit(out.write()); out.swap();
    gl.useProgram(P.show.program);
    gl.uniform1i(P.show.uniforms.u_velocity_texture, vel.read().attach(2));
    gl.uniform1f(P.show.uniforms.u_ratio, ratio);
    gl.uniform1f(P.show.uniforms.u_img_ratio, imgRatio);
    gl.uniform1f(P.show.uniforms.u_disturb_power, cfg.distortionPower);
    gl.uniform1i(P.show.uniforms.u_output_texture, out.read().attach(1));
    gl.uniform1f(P.show.uniforms.u_canvas_scale, 1);
    gl.uniform1f(P.show.uniforms.u_inner_scale, 1 / OVERSCAN);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, current); gl.uniform1i(P.show.uniforms.u_text_texture, 0);
    blit();
    frames = Math.max(0, frames - 1);
    if (frames > 0) kick(0);
  }

  const loadTexture = (src) => new Promise((res, rej) => {
    if (textures.has(src)) return res(textures.get(src));
    const img = new Image();
    img.onload = () => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      const v = { tex: t, ratio: img.naturalWidth / Math.max(1, img.naturalHeight) };
      textures.set(src, v); res(v);
    };
    img.onerror = rej;
    img.src = src;
  });

  size(); buffers();

  // public hook used by the slideshow in main.js
  let request = 0;
  window.PashaFluid = {
    show(src) {
      const id = ++request;
      return loadTexture(src).then((v) => {
        if (id !== request) return; // a newer slide was requested while this one loaded
        current = v.tex; imgRatio = v.ratio;
        host.classList.add('is-gl');
        kick(2);
      }).catch(() => {});
    },
    preload(srcs) { srcs.forEach((s) => loadTexture(s).catch(() => {})); },
  };
  document.dispatchEvent(new CustomEvent('pashafluid:ready'));
})();
