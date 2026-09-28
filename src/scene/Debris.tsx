import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SUN_DIR } from './Globe'
import { createSimplex } from './simplex'

type Rock = {
  /** Orbiting rocks live in ring space: radius, angle, height above the ring plane. */
  orbit: { r: number; theta: number; h: number; omega: number } | null
  pos: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
  scale: THREE.Vector3
  drift: THREE.Vector3
  variant: number
}

const CHUNK_VARIANTS = 3
const SPECK_VARIANTS = 3
const VARIANTS = CHUNK_VARIANTS + SPECK_VARIANTS

/** The debris ring is inclined so it sweeps from the upper right down to the lower left, near side on the right. */
const RING_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0, 0.38, 'XYZ'))

/** A broken chunk: a subdivided icosahedron carved by layered noise, then squashed. */
function makeRockGeometry(seed: number, detail: number) {
  const sx = createSimplex(seed)
  const g = new THREE.IcosahedronGeometry(1, detail)
  const p = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  const cutDir = new THREE.Vector3(0.3, 0.8, 0.5).normalize()
  const squash = new THREE.Vector3(1, 0.5 + sx.rand() * 0.5, 0.4 + sx.rand() * 0.6)
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize()
    const big = sx.fbm(v.x * 1.4, v.y * 1.4, v.z * 1.4, 3)
    const mid = sx.fbm(v.x * 3.2 + 5, v.y * 3.2, v.z * 3.2, 3)
    const chips = 1 - Math.abs(sx.noise(v.x * 5.5, v.y * 5.5 + 9, v.z * 5.5))
    let r = 1 + big * 0.45 + mid * 0.16 + chips * 0.12
    const cut = v.dot(cutDir)
    if (cut > 0.55) r *= 1 - (cut - 0.55) * 0.9
    v.multiplyScalar(r).multiply(squash)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

/** Grey rock texture with pores and streaks, used for colour and bump. Tileable. */
function makeRockTexture(size = 512) {
  const sx = createSimplex(99)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = (x / size) * Math.PI * 2
      const b = (y / size) * Math.PI * 2
      const px = Math.cos(a), py = Math.sin(a), pz = Math.cos(b), pw = Math.sin(b)
      const n1 = sx.fbm(px * 2 + pz * 2, py * 2 + pw * 2, pz * 1.3, 5)
      const n2 = sx.noise(px * 9 + pw * 9, py * 9, pz * 9 + 3)
      const pores = Math.max(0, n2 - 0.35) * 2.5
      const val = THREE.MathUtils.clamp(0.55 + n1 * 0.55 - pores * 0.45, 0.05, 1)
      const i = (y * size + x) * 4
      img.data[i] = val * 255
      img.data[i + 1] = val * 245
      img.data[i + 2] = val * 235
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const CAMERA = new THREE.Vector3(0, 0.6, 6.8)

/** True when a rock would sit between the camera and the globe and block the view. */
function blocksGlobe(pos: THREE.Vector3, size: number) {
  const dx = pos.x - CAMERA.x
  const dy = pos.y - CAMERA.y
  const depth = CAMERA.z - pos.z
  if (depth <= 0 || depth > CAMERA.z + 1) return false
  const lateral = Math.hypot(dx, dy)
  return lateral < depth * (0.34 + size * 0.5)
}

function makeRocks(seed: number): Rock[] {
  const sx = createSimplex(seed)
  const rand = sx.rand
  const gauss = () => (rand() + rand() + rand() - 1.5) * 0.8
  const rocks: Rock[] = []

  const push = (rock: Omit<Rock, 'rot' | 'spin' | 'drift'>, slow = false) => {
    rocks.push({
      ...rock,
      rot: new THREE.Euler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2),
      spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(slow ? 0.05 : 0.12),
      drift: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.05),
    })
  }
  const scaleOf = (base: number) => new THREE.Vector3(base, base * (0.8 + rand() * 0.4), base * (0.8 + rand() * 0.4))
  // Kepler-ish: inner debris orbits faster than outer
  const omegaAt = (r: number) => 0.11 / Math.pow(r, 1.5)

  // Ring specks: dense near the globe, thinning outward, in loose clumps along the ring
  const clumpAngles = Array.from({ length: 7 }, () => rand() * Math.PI * 2)
  for (let i = 0; i < 1400; i++) {
    const base = 0.008 + Math.pow(rand(), 2.2) * 0.045
    const r = 2.5 + Math.pow(rand(), 1.6) * 8
    const clumped = rand() < 0.45
    const theta = clumped ? clumpAngles[Math.floor(rand() * clumpAngles.length)] + gauss() * 0.5 : rand() * Math.PI * 2
    const h = gauss() * (0.06 + 0.06 * r)
    push({
      orbit: { r, theta, h, omega: omegaAt(r) * (0.85 + rand() * 0.3) },
      pos: new THREE.Vector3(),
      scale: scaleOf(base),
      variant: CHUNK_VARIANTS + Math.floor(rand() * SPECK_VARIANTS),
    })
  }

  // Ring chunks: sparse, small when close so they never cover the globe
  for (let i = 0; i < 34; i++) {
    const r = 3.4 + Math.pow(rand(), 1.2) * 8
    const base = r < 6 ? 0.06 + rand() * 0.14 : 0.1 + Math.pow(rand(), 1.5) * 0.4
    push({
      orbit: { r, theta: rand() * Math.PI * 2, h: gauss() * (0.08 + 0.08 * r), omega: omegaAt(r) },
      pos: new THREE.Vector3(),
      scale: scaleOf(base),
      variant: Math.floor(rand() * CHUNK_VARIANTS),
    })
  }

  // Strays drifting outside the ring
  for (let i = 0; i < 220; i++) {
    const base = 0.01 + Math.pow(rand(), 2) * 0.05
    let pos = new THREE.Vector3()
    for (let tries = 0; tries < 10; tries++) {
      pos = new THREE.Vector3((rand() - 0.5) * 30, (rand() - 0.5) * 18, (rand() - 0.5) * 30)
      if (pos.length() > 3.5 && !blocksGlobe(pos, base)) break
    }
    push({ orbit: null, pos, scale: scaleOf(base), variant: CHUNK_VARIANTS + Math.floor(rand() * SPECK_VARIANTS) })
  }

  // Large dark foreground chunks at the frame edges, out of focus like the reference
  const foreground: [number, number, number, number][] = [
    [1.6, -1.5, 5.0, 1.2],
    [2.3, 1.6, 4.6, 0.5],
    [2.7, -1.1, 3.3, 0.4],
  ]
  foreground.forEach(([x, y, z, s], i) =>
    push({ orbit: null, pos: new THREE.Vector3(x, y, z), scale: scaleOf(s), variant: i % CHUNK_VARIANTS }, true),
  )

  return rocks
}

export function Debris() {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const rocks = useMemo(() => makeRocks(1337), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const local = useMemo(() => new THREE.Vector3(), [])

  const geometries = useMemo(
    () => [
      ...Array.from({ length: CHUNK_VARIANTS }, (_, i) => makeRockGeometry(101 + i * 17, 3)),
      ...Array.from({ length: SPECK_VARIANTS }, (_, i) => makeRockGeometry(301 + i * 23, 1)),
    ],
    [],
  )
  const texture = useMemo(() => makeRockTexture(), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3a3430',
        map: texture,
        bumpMap: texture,
        bumpScale: 0.4,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true,
      }),
    [texture],
  )

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose())
      texture.dispose()
      material.dispose()
    },
    [geometries, texture, material],
  )

  const perVariant = useMemo(() => {
    const groups: Rock[][] = Array.from({ length: VARIANTS }, () => [])
    rocks.forEach((r) => groups[r.variant].push(r))
    return groups
  }, [rocks])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    perVariant.forEach((group, vi) => {
      const mesh = meshes.current[vi]
      if (!mesh) return
      group.forEach((r, i) => {
        r.rot.x += r.spin.x * dt
        r.rot.y += r.spin.y * dt
        r.rot.z += r.spin.z * dt
        if (r.orbit) {
          r.orbit.theta += r.orbit.omega * dt
          local.set(Math.cos(r.orbit.theta) * r.orbit.r, r.orbit.h, Math.sin(r.orbit.theta) * r.orbit.r)
          local.applyQuaternion(RING_QUAT)
          dummy.position.copy(local)
        } else {
          dummy.position.set(
            r.pos.x + Math.sin(t * 0.2 + i) * r.drift.x * 6,
            r.pos.y + Math.sin(t * 0.15 + i * 0.7) * r.drift.y * 6,
            r.pos.z + Math.cos(t * 0.18 + i * 1.3) * r.drift.z * 6,
          )
        }
        dummy.rotation.copy(r.rot)
        dummy.scale.copy(r.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  })

  return (
    <>
      <directionalLight position={SUN_DIR.clone().multiplyScalar(30)} intensity={3.0} color="#ffe2c0" />
      <ambientLight intensity={0.05} color="#5060a0" />
      <pointLight position={[2, 3, 10]} intensity={1.5} distance={40} decay={1.7} color="#9a8a7a" />
      <pointLight position={[0, 0, 0]} intensity={4} distance={12} decay={1.8} color="#ff5a14" />
      {perVariant.map((group, vi) => (
        <instancedMesh
          key={vi}
          ref={(m) => {
            meshes.current[vi] = m
          }}
          args={[geometries[vi], material, Math.max(1, group.length)]}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
