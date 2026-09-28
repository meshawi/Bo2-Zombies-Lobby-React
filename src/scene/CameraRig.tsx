import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Phase } from '../types'

export const ORBIT_DISTANCE = 6.8
export const CLOSE_DISTANCE = 3.15
const INTRO_START = new THREE.Vector3(3.5, 5.5, 24)
export const HOME = new THREE.Vector3(0, 0.6, ORBIT_DISTANCE)
/** Camera elevation above the equator plane, used to aim the globe at the camera. */
export const HOME_ELEVATION = Math.atan2(HOME.y, HOME.z)

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

type Tween = {
  from: THREE.Vector3
  to: THREE.Vector3
  duration: number
  elapsed: number
  ease: (t: number) => number
  next: Phase
}

type Props = {
  phase: Phase
  onArrive: (next: Phase) => void
}

/**
 * Drives the camera: the intro fly-in, the zoom toward the globe when a project is
 * selected, and the zoom back out. The camera always looks at the globe center and
 * never orbits; the globe itself rotates to face the selected marker.
 */
export function CameraRig({ phase, onArrive }: Props) {
  const { camera } = useThree()
  const tween = useRef<Tween | null>(null)
  const origin = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    const homeDir = HOME.clone().normalize()
    if (phase === 'intro') {
      camera.position.copy(INTRO_START)
      camera.lookAt(origin.current)
      tween.current = {
        from: INTRO_START.clone(),
        to: HOME.clone(),
        duration: 3.4,
        elapsed: 0,
        ease: easeInOut,
        next: 'globe',
      }
    } else if (phase === 'flyin') {
      tween.current = {
        from: camera.position.clone(),
        to: homeDir.multiplyScalar(CLOSE_DISTANCE),
        duration: 1.5,
        elapsed: 0,
        ease: easeInOut,
        next: 'lobby',
      }
    } else if (phase === 'flyout') {
      tween.current = {
        from: camera.position.clone(),
        to: HOME.clone(),
        duration: 1.2,
        elapsed: 0,
        ease: easeOut,
        next: 'globe',
      }
    } else {
      tween.current = null
      if (phase === 'lobby') {
        // Direct entry (e.g. ?lobby=id) or arrival: park at the close-up position.
        camera.position.copy(homeDir.multiplyScalar(CLOSE_DISTANCE))
        camera.lookAt(origin.current)
      }
    }
  }, [phase, camera])

  useFrame((_, dt) => {
    const tw = tween.current
    if (!tw) return
    tw.elapsed += dt
    const t = Math.min(tw.elapsed / tw.duration, 1)
    const k = tw.ease(t)
    // Interpolate along an arc so the camera never cuts through the globe.
    const fromLen = tw.from.length()
    const toLen = tw.to.length()
    const dir = tw.from.clone().normalize().lerp(tw.to.clone().normalize(), k).normalize()
    camera.position.copy(dir.multiplyScalar(THREE.MathUtils.lerp(fromLen, toLen, k)))
    camera.lookAt(origin.current)
    if (t >= 1) {
      tween.current = null
      onArrive(tw.next)
    }
  })

  return null
}
