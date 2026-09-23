// Print simulation: renders any 2D canvas as a CMYK halftone on paper, using WebGL.
// Four ink screens at the classic angles (C 15°, M 75°, Y 0°, K 45°), slight misregistration,
// paper grain and an optional centre fold. Falls back to a plain copy if WebGL is unavailable.
// ---- print simulation: CMYK halftone + paper + misregistration (WebGL) ----
const Print = (() => {
  const glc = document.createElement('canvas');
  const gl = glc.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return { ok: false, render(src, dst) { dst.width = src.width; dst.height = src.height; dst.getContext('2d').drawImage(src, 0, 0); } };
  const vs = `attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }`;
  const fs = `precision highp float;
  uniform sampler2D uSrc; uniform vec2 uRes; uniform float uTop, uPitch, uMix, uSeed, uFold, uGrain, uDpr;
  float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031 + uSeed*0.013); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.)); vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
  vec4 S(vec2 p){ return texture2D(uSrc, clamp(p, vec2(.5), uRes-.5)/uRes); }
  vec3 soft(vec2 p){ float o = 0.45*uDpr; return S(p).rgb*.36 + (S(p+vec2(o,0.)).rgb + S(p-vec2(o,0.)).rgb + S(p+vec2(0.,o)).rgb + S(p-vec2(0.,o)).rgb)*.16; }
  vec4 cmyk(vec3 c){ float k = 1. - max(max(c.r,c.g),c.b); float d = max(1e-3, 1.-k); vec3 cmy = clamp((1.-c-k)/d, 0., 1.); return vec4(cmy, k); }
  float scr(vec2 p, float ang, int ch){
    float s = sin(ang), c = cos(ang);
    vec2 q = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
    vec2 cell = (floor(q/uPitch) + .5) * uPitch;
    vec2 pi = vec2(c*cell.x + s*cell.y, -s*cell.x + c*cell.y);
    vec4 v = cmyk(soft(pi));
    float val = ch==0 ? v.x : ch==1 ? v.y : ch==2 ? v.z : v.w;
    float n = vnoise(p*.45/uDpr) - .5;
    float r = uPitch * .5 * 1.5 * pow(val, .58) * (1. + n*.24);
    float d = length(q - cell);
    float aa = .7*uDpr;
    return 1. - smoothstep(r - aa, r + aa, d);
  }
  void main(){
    vec2 p = vec2(gl_FragCoord.x, uTop - gl_FragCoord.y);
    vec4 src = S(p);
    if (src.a < .985) { gl_FragColor = src; return; }
    float m = .38*uDpr;
    float cC = scr(p + vec2( m, .3*m), radians(15.), 0);
    float cM = scr(p + vec2(-.6*m, .5*m), radians(75.), 1);
    float cY = scr(p + vec2(.2*m, -.7*m), 0., 2);
    float cK = scr(p, radians(45.), 3);
    vec3 paper = vec3(.953,.94,.905) * (.965 + .05*vnoise(p*.012/uDpr)) * (.985 + .03*vnoise(p*vec2(.002,.05)/uDpr));
    vec3 col = paper;
    col *= mix(vec3(1.), vec3(.0,.62,.88), cC*.96);
    col *= mix(vec3(1.), vec3(.9,.1,.5), cM*.94);
    col *= mix(vec3(1.), vec3(1.,.9,.04), cY*.9);
    col *= mix(vec3(1.), vec3(.1,.095,.1), cK*.97);
    vec3 sm = soft(p) * paper;
    // dots show most in dark, flat mid-tones; ease the screen off there so it reads as texture, not a mesh
    float lum = dot(soft(p), vec3(.299, .587, .114));
    float tone = mix(.55, 1., smoothstep(.3, .72, lum));
    vec3 o = mix(sm, col, uMix * tone);
    o += (hash(p + 17.) - .5) * uGrain;
    if (uFold > .5) {
      float fx = uRes.x * .5 + sin(p.y * .004 / uDpr) * 2. * uDpr;
      float dx = (p.x - fx) / uDpr;
      o *= 1. - .07 * exp(-dx*dx / 12.);
      o += .035 * exp(-(dx-3.)*(dx-3.) / 6.);
    }
    gl_FragColor = vec4(clamp(o, 0., 1.), 1.);
  }`;
  function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; }
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const U = n => gl.getUniformLocation(pr, n);
  const u = { res: U('uRes'), top: U('uTop'), pitch: U('uPitch'), mix: U('uMix'), seed: U('uSeed'), fold: U('uFold'), grain: U('uGrain'), dpr: U('uDpr') };
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  return {
    ok: true, maxTex,
    render(src, dst, o) {
      const w = src.width, h = src.height;
      if (glc.width < w || glc.height < h) { glc.width = Math.max(glc.width, w); glc.height = Math.max(glc.height, h); }
      gl.viewport(0, glc.height - h, w, h);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform2f(u.res, w, h); gl.uniform1f(u.top, glc.height); gl.uniform1f(u.pitch, o.pitch * o.dpr);
      gl.uniform1f(u.mix, o.mix); gl.uniform1f(u.seed, o.seed || 1); gl.uniform1f(u.fold, o.fold ? 1 : 0); gl.uniform1f(u.grain, o.grain ?? .05); gl.uniform1f(u.dpr, o.dpr);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (dst.width !== w || dst.height !== h) { dst.width = w; dst.height = h; }
      const c = dst.getContext('2d'); c.clearRect(0, 0, w, h); c.drawImage(glc, 0, 0, w, h, 0, 0, w, h);
    }
  };
})();
export { Print };
