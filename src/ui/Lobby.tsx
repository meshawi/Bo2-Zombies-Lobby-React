import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Project } from '../data/projects'
import { KeyHint } from './Hud'

type Item = { id: string; label: string; value?: string; hint: string; run?: () => void }

const MAX_PLAYERS = 4

const open = (url?: string) => {
  if (url) window.open(url, '_blank', 'noopener')
}

const panel = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.07, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, transition: { duration: 0.18 } },
}

export function Lobby({ project, onBack }: { project: Project; onBack: () => void }) {
  const [cursor, setCursor] = useState(0)

  const menu: Item[] = [
    {
      id: 'start',
      label: 'START PROJECT',
      hint: project.links.live ? 'Open the live build in a new tab.' : 'This project has no public build.',
      run: () => open(project.links.live),
    },
    {
      id: 'source',
      label: 'VIEW SOURCE',
      hint: project.links.source ? 'Open the repository.' : 'The source for this project is private.',
      run: () => open(project.links.source),
    },
    { id: 'change', label: 'CHANGE PROJECT', hint: 'Return to the globe.', run: onBack },
  ]

  const settings: Item[] = [
    { id: 'type', label: 'TYPE', value: project.type, hint: 'What kind of software this is.' },
    { id: 'status', label: 'STATUS', value: project.status, hint: 'Live, in progress, or archived.' },
    { id: 'year', label: 'YEAR', value: project.year, hint: 'When the bulk of the work happened.' },
    { id: 'role', label: 'ROLE', value: project.role, hint: 'What I did on the project.' },
    { id: 'platform', label: 'PLATFORM', value: project.platform, hint: 'Where it runs.' },
    { id: 'license', label: 'LICENSE', value: project.license, hint: 'How the code is licensed.' },
    { id: 'team', label: 'TEAM', value: `${project.team.length} of ${MAX_PLAYERS}`, hint: 'People on the project. See the player list.' },
    { id: 'stack', label: 'STACK', value: project.stack.slice(0, 4).join(', '), hint: project.stack.join(', ') },
  ]

  const items = [...menu, ...settings]
  const active = items[cursor]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's') setCursor((c) => (c + 1) % items.length)
      else if (e.key === 'ArrowUp' || e.key === 'w') setCursor((c) => (c - 1 + items.length) % items.length)
      else if (e.key === 'Enter') items[cursor].run?.()
      else if (e.key === 'l' || e.key === 'L') open(project.links.live)
      else if (e.key === 'g' || e.key === 'G') open(project.links.source)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rowProps = (i: number) => ({
    className: `lb-item${i === cursor ? ' is-active' : ''}`,
    onMouseEnter: () => setCursor(i),
    onClick: () => items[i].run?.(),
  })

  return (
    <motion.div
      className="lobby"
      style={{ ['--accent' as string]: project.accent }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.35 }}
    >
      <div className="lobby-dim" />

      <motion.div className="lb-left" variants={panel} custom={0} initial="hidden" animate="show" exit="exit">
        <h1 className="lb-title">{project.title}</h1>
        <div className="lb-menu">
          {menu.map((it, i) => (
            <button key={it.id} {...rowProps(i)}>
              <span className="lb-key">{it.label}</span>
            </button>
          ))}
        </div>

        <div className="lb-settings">
          {settings.map((it, j) => {
            const i = menu.length + j
            return (
              <button key={it.id} {...rowProps(i)}>
                <span className="lb-key">{it.label}</span>
                <span className="lb-val">{it.value}</span>
              </button>
            )
          })}
        </div>
        <div className="lb-hint">
          <span className="lb-hint-arrow">▸</span> {active.hint}
        </div>

        <figure className="lb-frame">
          <img src={project.image} alt={`${project.title} screenshot`} />
          <figcaption>
            <span>
              {project.location.city.toUpperCase()}, {project.location.country.toUpperCase()}
            </span>
            <span>
              {project.title.toUpperCase()} / {project.mode.toUpperCase()}
            </span>
          </figcaption>
        </figure>
      </motion.div>

      <motion.aside className="lb-right" variants={panel} custom={1} initial="hidden" animate="show" exit="exit">
        <div className="lb-players-head">
          {project.team.length} {project.team.length === 1 ? 'Player' : 'Players'} ({MAX_PLAYERS} Max)
        </div>
        <ul className="lb-players">
          {project.team.map((m) => (
            <li key={m.name} className="lb-player">
              <span className="lb-emblem" style={{ background: m.emblem }} />
              <span className="lb-player-name">{m.name}</span>
              <span className="lb-player-role">{m.role}</span>
              <span className="lb-player-score">{m.score}</span>
            </li>
          ))}
        </ul>

        <div className="lb-brief">
          <div className="lb-brief-head">{project.subtitle.toUpperCase()}</div>
          <p>{project.description}</p>
          <ul>
            {project.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="lb-stack">
            {project.stack.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </motion.aside>

      <motion.footer className="lb-foot" variants={panel} custom={2} initial="hidden" animate="show" exit="exit">
        <div className="lb-foot-left">
          <KeyHint k="ESC" label="Back" />
        </div>
        <div className="lb-foot-right">
          <KeyHint k="↑↓" label="Navigate" />
          <KeyHint k="ENTER" label="Select" />
          <KeyHint k="L" label="Live build" />
          <KeyHint k="G" label="Source" />
        </div>
      </motion.footer>
    </motion.div>
  )
}
