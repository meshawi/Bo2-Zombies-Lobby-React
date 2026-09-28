import { useMemo } from 'react'
import * as THREE from 'three'
import { SUN_DIR } from './Globe'
import { noiseGLSL } from './shaders'

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragment = /* glsl */ `
uniform vec3 uSunDir;
varying vec3 vDir;
${noiseGLSL}

void main() {
  vec3 d = normalize(vDir);
  // Dust clouds: broad structure plus finer wisps
  float n1 = fbm(d * 2.2 + vec3(3.0, 1.0, 7.0));
  float n2 = fbm(d * 6.0 + vec3(9.0, 2.0, 4.0));
  float clouds = smoothstep(-0.30, 0.70, n1 + 0.35 * n2);
  // A dust band along the ecliptic, like the streak in the reference
  float band = exp(-d.y * d.y * 22.0);
  float sun = max(dot(d, uSunDir), 0.0);
  float glow = pow(sun, 5.0) * 0.9 + pow(sun, 1.5) * 0.22;

  vec3 dustCol = mix(vec3(0.16, 0.11, 0.07), vec3(0.42, 0.30, 0.20), n2 * 0.5 + 0.5);
  vec3 col = dustCol * clouds * (0.035 + 0.5 * glow) * (0.3 + 0.7 * band);
  col += vec3(0.35, 0.22, 0.12) * pow(sun, 16.0) * 0.55;   // sun bloom caught in the dust
  col += vec3(0.012, 0.014, 0.022) * (0.4 + 0.6 * clouds); // faint cold space ambient
  gl_FragColor = vec4(col, 1.0);
}
`

/** Warm dust backdrop lit by the sun. Rendered first, behind everything. */
export function Nebula() {
  const uniforms = useMemo(() => ({ uSunDir: { value: SUN_DIR.clone() } }), [])
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[300, 48, 32]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
