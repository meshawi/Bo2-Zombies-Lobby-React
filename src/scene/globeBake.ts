import * as THREE from 'three'
import { noiseGLSL } from './shaders'

/**
 * Bakes the globe surface once into three equirectangular maps so the per-frame
 * shader only does texture lookups:
 *   0: albedo (gamma encoded) + height in alpha
 *   1: lava emissive (gamma encoded) + pulse phase in alpha
 *   2: tangent-space normal
 *
 * Continents come from NASA's public-domain Blue Marble image (used as a land
 * mask); everything else is procedural.
 */
export type GlobeMaps = { albedo: THREE.Texture; emissive: THREE.Texture; normal: THREE.Texture; size: number }

const bakeVertex = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const bakeFragment = /* glsl */ `
uniform sampler2D tEarth;
in vec2 vUv;
layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec4 gEmissive;
layout(location = 2) out vec4 gNormal;
${noiseGLSL}

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

vec2 uvOf(vec3 p) {
  return vec2(atan(p.x, p.z) / TAU + 0.5, asin(clamp(p.y, -1.0, 1.0)) / PI + 0.5);
}

// Land mask from the satellite image: anything that is not deep blue ocean.
// Higher lod = softer, more smoke-like coastlines.
float landAt(vec3 p, float lod) {
  vec3 c = textureLod(tEarth, uvOf(p), lod).rgb;
  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  float raw = max((c.r + c.g) * 0.5 - c.b + 0.10, (lum - 0.55) * 2.0);
  return smoothstep(0.0, 0.12, raw);
}

struct Surf { vec3 albedo; float height; vec3 emissive; float phase; };

Surf surf(vec3 p) {
  float landHard = landAt(p, 1.6);
  float landSoft = landAt(p, 3.5);
  float landVery = landAt(p, 5.5);

  // Strong domain warp turns ridged noise into meandering, branching veins
  vec3 w = p + 0.45 * vec3(fbm(p * 2.0 + vec3(1.7, 0.0, 0.0)), fbm(p * 2.0 + vec3(0.0, 9.2, 0.0)), fbm(p * 2.0 + vec3(0.0, 0.0, 4.1)));

  // Lava follows the plate boundaries: the coastlines of the land mask, plus a few
  // interior patches. This is what gives the game texture its "ring of fire" look.
  // Wobbled, widened coastal band so the boundary is not a clean outline
  float landW = landAt(normalize(p + 0.06 * (w - p)), 4.5);
  // Keep the burning band on the land side of the coast so the lava runs over the
  // continent, never under its edge
  float coast = smoothstep(0.04, 0.45, landW * (1.0 - landW) * 4.0) * smoothstep(0.15, 0.6, landSoft);
  // Only some boundaries burn (the game lights the Pacific rim, the Andes, the
  // Mediterranean and Japan); elsewhere the coast just carries dead cracks
  float patches = fbm(p * 1.3 + vec3(11.0, 5.0, 2.0));
  float hot = smoothstep(-0.18, 0.32, patches);
  float cluster = clamp(coast * hot * 1.3 + smoothstep(0.0, 0.45, patches) * landSoft * 0.85, 0.0, 1.0);
  float burn = smoothstep(0.08, 0.5, cluster);

  float v1 = ridged(w * 3.0);
  float v2 = ridged(w * 7.0 + vec3(3.0));
  float v3 = ridged(w * 13.0 + vec3(8.0));
  float core1 = smoothstep(0.85, 0.94, v1);
  float core2 = smoothstep(0.87, 0.96, v2) * smoothstep(0.4, 0.75, v1);
  float core3 = smoothstep(0.90, 0.97, v3) * smoothstep(0.55, 0.8, v2) * 0.6;
  float core = clamp(core1 + core2 + core3, 0.0, 1.0) * burn;
  // Wide dim halo of heat around the veins
  float halo = (smoothstep(0.45, 0.88, v1) * 0.6 + smoothstep(0.55, 0.9, v2) * 0.4) * burn * (1.0 - core);
  // Dead hairline cracks trailing off beyond the burning zones
  float v4 = ridged(w * 26.0 + vec3(5.0));
  float hair = (smoothstep(0.90, 0.97, v2) + smoothstep(0.92, 0.98, v3) * 0.6 + smoothstep(0.93, 0.985, v4) * 0.4) * smoothstep(0.02, 0.35, coast * 0.8 + cluster + 0.3 * landVery) * (1.0 - burn) * 0.7;

  float heatVar = snoise(p * 6.0 + vec3(2.0)) * 0.5 + 0.5;
  float heat = clamp(core * (0.7 + 0.3 * heatVar) * (0.7 + 0.5 * hot) * (0.75 + 0.35 * landSoft), 0.0, 1.0);

  // Crust: near-black oceans, continents as soft grey-blue smoke
  float haze = fbm(p * 4.0 + vec3(2.0)) * 0.5 + 0.5;
  float haze2 = fbm(p * 9.0) * 0.5 + 0.5;
  float smoke = smoothstep(0.25, 0.85, fbm(p * 2.2 + vec3(7.0, 3.0, 1.0)) * 0.5 + 0.5 + 0.25 * haze2);
  float grain = snoise(p * 60.0) * 0.5 + 0.5;
  float grain2 = snoise(p * 25.0) * 0.5 + 0.5;
  float grain3 = snoise(p * 140.0) * 0.5 + 0.5;
  float grain4 = snoise(p * 320.0) * 0.5 + 0.5;
  vec3 ocean = vec3(0.006, 0.008, 0.012) * (0.8 + 0.4 * grain3);
  vec3 landCol = mix(vec3(0.03, 0.033, 0.04), vec3(0.12, 0.125, 0.135), haze * 0.6 + haze2 * 0.4);
  landCol *= 0.7 + 0.25 * grain + 0.2 * grain2 + 0.12 * grain3 + 0.08 * grain4;
  float landMix = clamp(landSoft * 0.6 + landHard * 0.4, 0.0, 1.0) * (0.35 + 0.65 * smoke) * (0.7 + 0.3 * haze);
  vec3 albedo = mix(ocean, landCol, landMix);
  // Dead cracks read as faint light lines over the dark crust, like the game texture
  albedo = mix(albedo, vec3(0.16, 0.16, 0.17), hair * 0.85);
  // Lava sits ON the land: a warm tint around it and a bright lava body in the vein,
  // so no grey haze and no dark trench ever show inside or around it
  albedo = mix(albedo, albedo * vec3(1.35, 1.05, 0.8) + vec3(0.03, 0.012, 0.0), halo * 0.6);
  albedo = mix(albedo, vec3(0.55, 0.18, 0.04), core);

  // Gentle relief; veins are recessed
  float h = 0.55 + 0.05 * fbm(p * 8.0) + 0.02 * haze2 + 0.03 * landMix;
  h += 0.012 * grain3 + 0.008 * grain4;
  // Veins are raised ridges of cooled crust on top of the surface, not grooves
  h += 0.10 * core + 0.035 * halo;
  h -= 0.04 * hair;
  h = clamp(h, 0.0, 1.0);

  vec3 e = mix(vec3(0.55, 0.06, 0.0), vec3(1.0, 0.32, 0.05), smoothstep(0.0, 0.6, heat));
  e = mix(e, vec3(1.0, 0.62, 0.30), smoothstep(0.6, 1.0, heat));
  e *= smoothstep(0.0, 0.1, heat);
  e += vec3(0.38, 0.06, 0.0) * halo * 0.8;

  Surf s;
  s.albedo = albedo;
  s.height = h;
  s.emissive = e;
  s.phase = fbm(p * 3.0) * 0.5 + 0.5;
  return s;
}

vec3 dirFromUv(vec2 uv) {
  float lon = (uv.x - 0.5) * TAU;
  float lat = (uv.y - 0.5) * PI;
  return vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
}

void main() {
  vec3 p = dirFromUv(vUv);
  Surf s = surf(p);
  vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), p) + vec3(1e-5, 0.0, 0.0));
  vec3 north = cross(p, east);
  float eps = 0.0018;
  float hE = surf(normalize(p + east * eps)).height;
  float hN = surf(normalize(p + north * eps)).height;
  float amp = 0.03;
  vec3 nts = normalize(vec3(-(hE - s.height) / eps * amp, -(hN - s.height) / eps * amp, 1.0));
  gAlbedo = vec4(pow(s.albedo, vec3(1.0 / 2.2)), s.height);
  gEmissive = vec4(pow(clamp(s.emissive, 0.0, 1.0), vec3(1.0 / 2.2)), s.phase);
  gNormal = vec4(nts * 0.5 + 0.5, 1.0);
}
`

const cache = new WeakMap<THREE.Texture, GlobeMaps>()

export function bakeGlobe(gl: THREE.WebGLRenderer, earth: THREE.Texture): GlobeMaps {
  const cached = cache.get(earth)
  if (cached) return cached

  earth.colorSpace = THREE.NoColorSpace
  earth.wrapS = THREE.RepeatWrapping
  earth.wrapT = THREE.ClampToEdgeWrapping
  earth.minFilter = THREE.LinearMipmapLinearFilter
  earth.generateMipmaps = true
  earth.needsUpdate = true

  const size = Math.min(4096, gl.capabilities.maxTextureSize)
  const rt = new THREE.WebGLRenderTarget(size, size / 2, {
    count: 3,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  })
  const aniso = gl.capabilities.getMaxAnisotropy()
  for (const t of rt.textures) {
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.anisotropy = aniso
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.magFilter = THREE.LinearFilter
    t.colorSpace = THREE.NoColorSpace
  }

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: bakeVertex,
    fragmentShader: bakeFragment,
    uniforms: { tEarth: { value: earth } },
    depthTest: false,
    depthWrite: false,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(quad)

  const prevTarget = gl.getRenderTarget()
  gl.setRenderTarget(rt)
  gl.render(scene, camera)
  gl.setRenderTarget(prevTarget)

  quad.geometry.dispose()
  material.dispose()

  const maps: GlobeMaps = { albedo: rt.textures[0], emissive: rt.textures[1], normal: rt.textures[2], size }
  cache.set(earth, maps)
  return maps
}
