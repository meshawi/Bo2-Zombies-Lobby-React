import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { projects, type Project } from './data/projects'
import { GlobeScene } from './scene/GlobeScene'
import { Hud } from './ui/Hud'
import { Lobby } from './ui/Lobby'
import type { Phase } from './types'
import './ui/ui.css'

// Dev shortcut: /?lobby=<project id> opens that lobby directly, skipping the intro.
const directLobby = projects.find((p) => p.id === new URLSearchParams(window.location.search).get('lobby')) ?? null

export default function App() {
  const [phase, setPhase] = useState<Phase>(directLobby ? 'lobby' : 'intro')
  /** The focused project: the globe turns to face it. Null means the globe spins freely. */
  const [selected, setSelected] = useState<Project | null>(directLobby)
  const [hovered, setHovered] = useState<Project | null>(null)

  // Left/right step through projects west to east so the globe sweeps naturally
  const ordered = useMemo(() => [...projects].sort((a, b) => a.location.lon - b.location.lon), [])

  /** First click focuses the project; a second click on the focused one opens its lobby. */
  const select = useCallback(
    (p: Project) => {
      if (phase !== 'globe') return
      setHovered(null)
      if (selected?.id === p.id) setPhase('flyin')
      else setSelected(p)
    },
    [phase, selected],
  )

  const enter = useCallback(() => {
    if (phase === 'globe' && selected) setPhase('flyin')
  }, [phase, selected])

  const back = useCallback(() => {
    if (phase === 'lobby') setPhase('flyout')
    else if (phase === 'globe' && selected) setSelected(null)
  }, [phase, selected])

  const step = useCallback(
    (dir: 1 | -1) => {
      if (phase !== 'globe') return
      const i = selected ? ordered.findIndex((p) => p.id === selected.id) : -1
      const next = i < 0 ? (dir > 0 ? 0 : ordered.length - 1) : (i + dir + ordered.length) % ordered.length
      setHovered(null)
      setSelected(ordered[next])
    },
    [phase, selected, ordered],
  )

  const arrive = useCallback((next: Phase) => setPhase(next), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Enter' && phase === 'globe') enter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, step, enter, phase])

  return (
    <div className={`app phase-${phase}${selected && phase === 'globe' ? ' is-focused' : ''}`}>
      <GlobeScene
        projects={projects}
        phase={phase}
        selected={selected}
        hovered={hovered}
        onHover={(p) => phase === 'globe' && setHovered(p)}
        onSelect={select}
        onArrive={arrive}
      />
      <Hud phase={phase} hovered={hovered} selected={selected} />
      <AnimatePresence>
        {phase === 'lobby' && selected && <Lobby key={selected.id} project={selected} onBack={back} />}
      </AnimatePresence>
    </div>
  )
}
