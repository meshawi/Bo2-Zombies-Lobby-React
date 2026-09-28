import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  SMAA,
  Vignette,
} from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Project } from '../data/projects'
import type { Phase } from '../types'
import { CameraRig, HOME, HOME_ELEVATION } from './CameraRig'
import { Debris } from './Debris'
import { GLOBE_RADIUS, Globe } from './Globe'
import { Markers } from './Markers'
import { Nebula } from './Nebula'
import { Rotator, type Focus } from './Rotator'
import { Sun } from './Sun'

const INITIAL_ROTATION = new THREE.Euler(0.08, 0.6, 0)

type Props = {
  projects: Project[]
  phase: Phase
  selected: Project | null
  hovered: Project | null
  onHover: (p: Project | null) => void
  onSelect: (p: Project) => void
  onArrive: (next: Phase) => void
}

/**
 * Globe orientation that puts a lat/lon marker directly in front of the camera.
 * With Euler order XYZ the group applies yaw (y) first, then tilt (x): yaw = -lon
 * brings the marker to the x = 0 plane, tilt = lat - elevation lines it up with
 * the camera's height.
 */
function focusFor(p: Project): Focus {
  return {
    tilt: THREE.MathUtils.degToRad(p.location.lat) - HOME_ELEVATION,
    yaw: -THREE.MathUtils.degToRad(p.location.lon),
  }
}

/** Keeps the depth-of-field focus on the nearest point of the globe surface. */
function FocusTracker({ target }: { target: THREE.Vector3 }) {
  useFrame(({ camera }) => {
    target.copy(camera.position).normalize().multiplyScalar(GLOBE_RADIUS)
  })
  return null
}

export function GlobeScene({ projects, phase, selected, hovered, onHover, onSelect, onArrive }: Props) {
  const globeRef = useRef<THREE.Group>(null)
  const focus = useMemo(() => (selected ? focusFor(selected) : null), [selected])
  const focusTarget = useMemo(() => new THREE.Vector3(0, 0, GLOBE_RADIUS), [])

  return (
    <Canvas
      className="scene"
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.1, far: 400, position: HOME.toArray() }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      onPointerMissed={() => onHover(null)}
    >
      <color attach="background" args={['#020202']} />
      <Nebula />
      <Stars radius={120} depth={60} count={2200} factor={1.8} saturation={0} fade speed={0.3} />
      <Sun />
      <group ref={globeRef} rotation={INITIAL_ROTATION}>
        <Suspense fallback={null}>
          <Globe />
        </Suspense>
        <Markers
          projects={projects}
          phase={phase}
          selected={selected}
          hovered={hovered}
          onHover={onHover}
          onSelect={onSelect}
        />
      </group>
      <Debris />
      <Rotator groupRef={globeRef} phase={phase} focus={focus} />
      <CameraRig phase={phase} onArrive={onArrive} />
      <FocusTracker target={focusTarget} />
      <EffectComposer multisampling={0}>
        <DepthOfField target={focusTarget} worldFocusRange={2.6} bokehScale={2.4} />
        <Bloom mipmapBlur luminanceThreshold={0.7} luminanceSmoothing={0.3} intensity={0.9} radius={0.85} />
        <ChromaticAberration offset={new THREE.Vector2(0.0007, 0.0007)} radialModulation modulationOffset={0.3} />
        <HueSaturation saturation={-0.12} />
        <BrightnessContrast brightness={-0.02} contrast={0.08} />
        <Vignette eskil={false} offset={0.18} darkness={0.85} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
