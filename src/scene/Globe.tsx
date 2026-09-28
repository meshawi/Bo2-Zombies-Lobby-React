import { useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { atmoFragment, atmoVertex } from './shaders'
import { bakeGlobe } from './globeBake'
import { createSimplex } from './simplex'

export const GLOBE_RADIUS = 2
export const SUN_DIR = new THREE.Vector3(-0.345, -0.07, -0.94).normalize()
export const EARTH_MAP_URL = '/textures/earth_land_2048.jpg'

/** Small tiling normal map of rock grain, layered over the baked normal for close-ups. */
function makeDetailNormal(size = 256) {
  const sx = createSimplex(31)
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = (x / size) * Math.PI * 2
      const b = (y / size) * Math.PI * 2
      const px = Math.cos(a), py = Math.sin(a), pz = Math.cos(b), pw = Math.sin(b)
      h[y * size + x] = sx.fbm(px * 1.6 + pz * 1.6, py * 1.6 + pw * 1.6, pz * 0.9, 5) + 0.35 * sx.noise(px * 5 + pw * 5, py * 5, pz * 5)
    }
  }
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)]
      const r = h[y * size + ((x + 1) % size)]
      const d = h[((y - 1 + size) % size) * size + x]
      const u = h[((y + 1) % size) * size + x]
      let nx = (l - r) * 2.5
      let ny = (d - u) * 2.5
      let nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      nz /= len
      const i = (y * size + x) * 4
      data[i] = (nx * 0.5 + 0.5) * 255
      data[i + 1] = (ny * 0.5 + 0.5) * 255
      data[i + 2] = (nz * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

const surfaceVertex = /* glsl */ `
uniform sampler2D tAlbedo;
uniform float uDisp;
out vec3 vNormal;
out vec3 vEast;
out vec3 vNorth;
out vec3 vObjPos;
out vec3 vWorldPos;
const float TAU = 6.28318530718;
const float PI = 3.14159265359;
void main() {
  vec3 p = normalize(position);
  vec2 uv = vec2(atan(p.x, p.z) / TAU + 0.5, asin(clamp(p.y, -1.0, 1.0)) / PI + 0.5);
  float h = textureLod(tAlbedo, uv, 0.0).a;
  vec3 displaced = position * (1.0 + uDisp * (h - 0.5));
  mat3 m = mat3(modelMatrix);
  vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), p) + vec3(1e-5, 0.0, 0.0));
  vObjPos = p;
  vNormal = normalize(m * p);
  vEast = normalize(m * east);
  vNorth = normalize(m * cross(p, east));
  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const surfaceFragment = /* glsl */ `
uniform sampler2D tAlbedo;
uniform sampler2D tEmissive;
uniform sampler2D tNormal;
uniform sampler2D tDetail;
uniform float uDetail;
uniform float uTime;
uniform float uEmissive;
uniform float uSelfGlow;
uniform vec3 uSunDir;
in vec3 vNormal;
in vec3 vEast;
in vec3 vNorth;
in vec3 vObjPos;
in vec3 vWorldPos;
out vec4 fragColor;
const float TAU = 6.28318530718;
const float PI = 3.14159265359;

void main() {
  vec3 p = normalize(vObjPos);
  vec2 uv = vec2(atan(p.x, p.z) / TAU + 0.5, asin(clamp(p.y, -1.0, 1.0)) / PI + 0.5);
  // Analytic uv derivatives so mipmapping has no seam where atan wraps
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  float r2 = max(p.x * p.x + p.z * p.z, 1e-5);
  float cy = sqrt(max(1.0 - p.y * p.y, 1e-4));
  vec2 ddx = vec2((p.z * dpx.x - p.x * dpx.z) / r2 / TAU, dpx.y / cy / PI);
  vec2 ddy = vec2((p.z * dpy.x - p.x * dpy.z) / r2 / TAU, dpy.y / cy / PI);

  vec4 A = textureGrad(tAlbedo, uv, ddx, ddy);
  vec4 E = textureGrad(tEmissive, uv, ddx, ddy);
  vec3 nts = textureGrad(tNormal, uv, ddx, ddy).xyz * 2.0 - 1.0;
  // Fine rock grain that only shows up close; mipmapping fades it with distance
  vec2 dScale = vec2(110.0, 55.0);
  vec3 dn = textureGrad(tDetail, uv * dScale, ddx * dScale, ddy * dScale).xyz * 2.0 - 1.0;
  nts = normalize(vec3(nts.xy + dn.xy * uDetail, nts.z));
  vec3 albedo = pow(A.rgb, vec3(2.2));
  vec3 emis = pow(E.rgb, vec3(2.2));

  vec3 N = normalize(vNormal);
  vec3 Nb = normalize(vEast * nts.x + vNorth * nts.y + N * nts.z);
  vec3 L = uSunDir;
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Sun: a soft wide crescent, nothing on the far side
  float terminator = smoothstep(-0.45, 0.3, dot(N, L));
  float wrap = smoothstep(-0.35, 0.55, dot(Nb, L));
  float diff = wrap * terminator;
  float nvb = clamp(dot(Nb, V), 0.0, 1.0);
  float nv = clamp(dot(N, V), 0.0, 1.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(Nb, H), 0.0), 28.0) * 0.3 * diff;

  vec3 color = albedo * (0.02 + 1.2 * diff);
  // Cool ambient from space plus a dim warm key from the front so the face reads
  vec3 skyDir = normalize(vec3(-0.4, 0.8, 0.3));
  float sky = 0.5 + 0.5 * dot(Nb, skyDir);
  color += albedo * vec3(0.55, 0.60, 0.80) * 0.16 * sky;
  vec3 keyDir = normalize(vec3(0.55, 0.35, 0.75));
  color += albedo * vec3(0.7, 0.6, 0.5) * 0.18 * max(dot(Nb, keyDir), 0.0);
  // The smoky continents carry a faint glow of their own, like an emissive map
  color += albedo * uSelfGlow;
  color += vec3(1.0, 0.9, 0.8) * spec * 0.7;
  float fres = pow(1.0 - nv, 3.0);
  color += vec3(0.20, 0.30, 0.50) * fres * (0.10 + 0.4 * terminator) * (0.6 + 0.4 * nvb);
  color += vec3(0.55, 0.35, 0.20) * pow(1.0 - nv, 6.0) * terminator * 0.9;

  float pulse = 0.85 + 0.15 * sin(uTime * 1.6 + E.a * TAU);
  color += emis * uEmissive * pulse;
  fragColor = vec4(min(color, vec3(3.0)), 1.0);
}
`

export function Globe() {
  const { gl } = useThree()
  const earth = useLoader(THREE.TextureLoader, EARTH_MAP_URL)
  const maps = useMemo(() => bakeGlobe(gl, earth), [gl, earth])
  const detail = useMemo(() => makeDetailNormal(), [])
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      tAlbedo: { value: maps.albedo },
      tEmissive: { value: maps.emissive },
      tNormal: { value: maps.normal },
      tDetail: { value: detail },
      uDetail: { value: 0.55 },
      uTime: { value: 0 },
      uEmissive: { value: 3.3 },
      uSelfGlow: { value: 0.14 },
      uDisp: { value: 0.03 },
      uSunDir: { value: SUN_DIR.clone() },
    }),
    [maps, detail],
  )
  const atmoUniforms = useMemo(() => ({ uSunDir: { value: SUN_DIR.clone() } }), [])

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt
  })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 256, 192]} />
        <shaderMaterial
          ref={matRef}
          glslVersion={THREE.GLSL3}
          vertexShader={surfaceVertex}
          fragmentShader={surfaceFragment}
          uniforms={uniforms}
        />
      </mesh>
      <mesh scale={1.02}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <shaderMaterial
          vertexShader={atmoVertex}
          fragmentShader={atmoFragment}
          uniforms={atmoUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
