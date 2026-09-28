import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js'
import { SUN_DIR } from './Globe'

function radialTexture(stops: [number, string][], size = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([o, col]) => g.addColorStop(o, col))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function streakTexture(size = 1024) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, size, 0)
  g.addColorStop(0, 'rgba(255,220,180,0)')
  g.addColorStop(0.5, 'rgba(255,235,210,1)')
  g.addColorStop(1, 'rgba(255,220,180,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, 64)
  const v = ctx.createLinearGradient(0, 0, 0, 64)
  v.addColorStop(0, 'rgba(0,0,0,1)')
  v.addColorStop(0.5, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = v
  ctx.fillRect(0, 0, size, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Sun() {
  const core = useMemo(
    () =>
      radialTexture([
        [0, 'rgba(255,255,252,1)'],
        [0.1, 'rgba(255,245,225,1)'],
        [0.25, 'rgba(255,200,140,0.6)'],
        [0.55, 'rgba(255,150,80,0.12)'],
        [1, 'rgba(255,120,60,0)'],
      ]),
    [],
  )
  const glow = useMemo(
    () =>
      radialTexture([
        [0, 'rgba(255,190,130,0.7)'],
        [0.3, 'rgba(255,150,90,0.28)'],
        [0.7, 'rgba(255,120,70,0.06)'],
        [1, 'rgba(255,110,60,0)'],
      ]),
    [],
  )
  const wide = useMemo(
    () =>
      radialTexture([
        [0, 'rgba(255,170,120,0.35)'],
        [0.5, 'rgba(255,140,90,0.10)'],
        [1, 'rgba(255,120,70,0)'],
      ]),
    [],
  )
  const streak = useMemo(() => streakTexture(), [])
  const ghostDisc = useMemo(
    () =>
      radialTexture(
        [
          [0, 'rgba(255,255,255,0.35)'],
          [0.75, 'rgba(255,255,255,0.35)'],
          [0.85, 'rgba(255,255,255,0.6)'],
          [1, 'rgba(255,255,255,0)'],
        ],
        128,
      ),
    [],
  )
  const ghostSoft = useMemo(
    () =>
      radialTexture(
        [
          [0, 'rgba(255,255,255,0.6)'],
          [0.5, 'rgba(255,255,255,0.15)'],
          [1, 'rgba(255,255,255,0)'],
        ],
        128,
      ),
    [],
  )

  // Lens ghosts along the axis from the sun through the screen centre
  const flare = useMemo(() => {
    const lf = new Lensflare()
    const dim = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k)
    lf.addElement(new LensflareElement(ghostSoft, 30, 0.3, dim('#ff9a55', 0.22)))
    lf.addElement(new LensflareElement(ghostSoft, 18, 0.55, dim('#8fb0ff', 0.14)))
    lf.addElement(new LensflareElement(ghostSoft, 44, 0.9, dim('#ff8a50', 0.12)))
    return lf
  }, [ghostDisc, ghostSoft])

  useEffect(() => () => flare.dispose(), [flare])

  const pos = SUN_DIR.clone().multiplyScalar(60)

  return (
    <group position={pos}>
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial map={core} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[26, 26, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.5} />
      </sprite>
      <sprite scale={[60, 60, 1]}>
        <spriteMaterial map={wide} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.3} />
      </sprite>
      <sprite scale={[160, 3.5, 1]}>
        <spriteMaterial map={streak} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.3} />
      </sprite>
      <primitive object={flare} />
    </group>
  )
}
