import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { RefObject } from 'react'
import type { Phase } from '../types'

const AUTO_SPIN = 0.045 // rad/s
const DRAG_SPEED = 0.0055
const TILT_SPEED = 0.0028
const MAX_TILT = 0.55
const FOCUS_DURATION = 1.4

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Globe orientation (Euler x = tilt, y = yaw) that puts a marker in front of the camera. */
export type Focus = { tilt: number; yaw: number }

type Tween = { fromX: number; fromY: number; toX: number; toY: number; elapsed: number }

type Props = {
  groupRef: RefObject<THREE.Group | null>
  phase: Phase
  /** Orientation of the focused project, or null when nothing is focused. */
  focus: Focus | null
}

/** Shortest equivalent yaw so the globe never spins the long way round. */
function nearestYaw(target: number, current: number) {
  const twoPi = Math.PI * 2
  let y = target
  while (y - current > Math.PI) y -= twoPi
  while (y - current < -Math.PI) y += twoPi
  return y
}

/**
 * Spins the globe group slowly and lets the user drag it. The camera never
 * orbits, so the sun and the lit crescent stay fixed on screen (like the BO2 menu).
 * When a project is focused the globe turns to face it and holds there; dragging
 * still works and cancels the turn.
 */
export function Rotator({ groupRef, phase, focus }: Props) {
  const { gl } = useThree()
  const drag = useRef<{ x: number; y: number } | null>(null)
  const velocity = useRef(0)
  const tween = useRef<Tween | null>(null)
  const active = phase === 'globe'
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const g = groupRef.current
    if (!g || !focus) return
    if (phase === 'globe') {
      tween.current = {
        fromX: g.rotation.x,
        fromY: g.rotation.y,
        toX: focus.tilt,
        toY: nearestYaw(focus.yaw, g.rotation.y),
        elapsed: 0,
      }
    } else if (phase === 'lobby' && !tween.current) {
      // Direct entry (?lobby=id): snap into place.
      g.rotation.set(focus.tilt, focus.yaw, 0)
    }
  }, [phase, focus, groupRef])

  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      if (!activeRef.current || e.button !== 0) return
      drag.current = { x: e.clientX, y: e.clientY }
      velocity.current = 0
      tween.current = null // a drag takes over from any turn in progress
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const g = groupRef.current
      if (!drag.current || !g || !activeRef.current) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current = { x: e.clientX, y: e.clientY }
      g.rotation.y += dx * DRAG_SPEED
      g.rotation.x = THREE.MathUtils.clamp(g.rotation.x + dy * TILT_SPEED, -MAX_TILT, MAX_TILT)
      velocity.current = dx * DRAG_SPEED
    }
    const up = (e: PointerEvent) => {
      drag.current = null
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, groupRef])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return

    const tw = tween.current
    if (tw) {
      tw.elapsed += dt
      const k = easeInOut(Math.min(tw.elapsed / FOCUS_DURATION, 1))
      g.rotation.x = THREE.MathUtils.lerp(tw.fromX, tw.toX, k)
      g.rotation.y = THREE.MathUtils.lerp(tw.fromY, tw.toY, k)
      if (tw.elapsed >= FOCUS_DURATION) tween.current = null
      return
    }

    if (!active || drag.current) return
    // Inertia from a drag decays; the slow auto-spin and the return to level only
    // happen when nothing is focused, so a focused project stays in front
    velocity.current *= Math.exp(-dt * 2.5)
    g.rotation.y += velocity.current + (focus ? 0 : AUTO_SPIN * dt)
    if (!focus) g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0, 0.8, dt)
  })

  return null
}
