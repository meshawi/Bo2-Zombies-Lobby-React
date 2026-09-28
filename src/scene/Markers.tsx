import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Project } from '../data/projects'
import { GLOBE_RADIUS } from './Globe'
import type { Phase } from '../types'

export function latLonToVec3(lat: number, lon: number, r: number) {
  const phi = THREE.MathUtils.degToRad(lat)
  const theta = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.sin(theta),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.cos(theta),
  )
}

const SkullIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2C7.6 2 4 5.4 4 9.7c0 2.6 1.3 4.8 3.2 6.2V19c0 .6.4 1 1 1h1v2h1.6v-2h2.4v2H14.8v-2h1c.6 0 1-.4 1-1v-3.1c1.9-1.4 3.2-3.6 3.2-6.2C20 5.4 16.4 2 12 2zm-3.4 9.9a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zm6.8 0a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zM12 15.5l-1.3-2.3h2.6L12 15.5z"
    />
  </svg>
)

type MarkerProps = {
  project: Project
  phase: Phase
  selected: boolean
  hovered: boolean
  onHover: (p: Project | null) => void
  onSelect: (p: Project) => void
}

function Marker({ project, phase, selected, hovered, onHover, onSelect }: MarkerProps) {
  const pos = useMemo(() => latLonToVec3(project.location.lat, project.location.lon, GLOBE_RADIUS * 1.035), [project])
  const el = useRef<HTMLDivElement>(null)
  const anchor = useRef<THREE.Group>(null)
  const worldPos = useMemo(() => new THREE.Vector3(), [])
  const normal = useMemo(() => new THREE.Vector3(), [])
  const toCam = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    const div = el.current
    if (!div || !anchor.current) return
    anchor.current.getWorldPosition(worldPos)
    normal.copy(worldPos).normalize()
    toCam.copy(camera.position).sub(worldPos).normalize()
    const facing = normal.dot(toCam)
    const interactive = phase === 'globe'
    const hideForLobby = (phase === 'lobby' || phase === 'flyin' || phase === 'flyout') && !selected
    const t = THREE.MathUtils.clamp((facing - 0.05) / 0.25, 0, 1)
    const opacity = hideForLobby ? 0 : t
    div.style.opacity = opacity.toFixed(3)
    div.style.pointerEvents = interactive && opacity > 0.6 ? 'auto' : 'none'
  })

  return (
    <group ref={anchor} position={pos}>
    <Html center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={el}
        className={`marker${hovered ? ' is-hover' : ''}${selected ? ' is-selected' : ''}`}
        style={{ ['--accent' as string]: project.accent }}
        onPointerEnter={() => onHover(project)}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(project)
        }}
      >
        <div className="marker-ring" />
        <div className="marker-badge">
          <SkullIcon />
        </div>
        <div className="marker-post" />
        <div className="marker-label">
          <span className="marker-label-title">{project.title}</span>
          <span className="marker-label-sub">{project.subtitle}</span>
        </div>
      </div>
    </Html>
    </group>
  )
}

type MarkersProps = {
  projects: Project[]
  phase: Phase
  selected: Project | null
  hovered: Project | null
  onHover: (p: Project | null) => void
  onSelect: (p: Project) => void
}

export function Markers({ projects, phase, selected, hovered, onHover, onSelect }: MarkersProps) {
  return (
    <group>
      {projects.map((p) => (
        <Marker
          key={p.id}
          project={p}
          phase={phase}
          selected={selected?.id === p.id}
          hovered={hovered?.id === p.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
