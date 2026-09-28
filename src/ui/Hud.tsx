import { AnimatePresence, motion } from 'framer-motion'
import type { Project } from '../data/projects'
import type { Phase } from '../types'

export function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="keyhint">
      <span className="keyhint-key">{k}</span>
      <span className="keyhint-label">{label}</span>
    </span>
  )
}

type Props = { phase: Phase; hovered: Project | null; selected: Project | null }

export function Hud({ phase, hovered, selected }: Props) {
  const onGlobe = phase === 'globe'
  // The focused project owns the title area; a hover only shows when nothing is focused
  const shown = selected ?? hovered

  return (
    <div className="hud">
      <div className="grain" />
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            key="intro-fade"
            className="intro-fade"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <div className="hud-topright">
        <span>PORTFOLIO 0.1.0</span>
      </div>

      <AnimatePresence>
        {onGlobe && (
          <motion.div
            key="select-title"
            className="hud-topleft"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="eyebrow">PROJECTS</div>
            <div className="hud-title">SELECT PROJECT</div>
            <AnimatePresence mode="wait">
              {shown ? (
                <motion.div
                  key={`${shown.id}-${selected ? 'sel' : 'hov'}`}
                  className={`hud-hover${selected ? ' is-focused' : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="hud-hover-name" style={{ color: shown.accent }}>
                    {shown.title.toUpperCase()}
                  </span>
                  <span className="hud-hover-sub">
                    {shown.location.city.toUpperCase()}, {shown.location.country.toUpperCase()} · {shown.mode.toUpperCase()}
                  </span>
                  {selected && <span className="hud-hover-cta">Click again or press Enter to open</span>}
                </motion.div>
              ) : (
                <motion.div
                  key="none"
                  className="hud-hover muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Drag to rotate. Click a marker to bring it round.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {onGlobe && (
          <motion.div
            key="globe-hints"
            className="hud-bottomleft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <KeyHint k="← →" label="Next project" />
            {selected ? <KeyHint k="ENTER" label="Open" /> : <KeyHint k="LMB" label="Select" />}
            <KeyHint k="ESC" label={selected ? 'Release' : 'Back'} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
