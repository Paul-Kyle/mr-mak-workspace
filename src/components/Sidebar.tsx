import { useEffect, useState, type RefObject } from 'react'
import type { WorkspaceEntity } from '../types'
import { entityHash } from '../lib/route'
import { categoryIcon } from '../lib/categories'
import { contentUrl } from '../desktop/client'
import MakLogo from './MakLogo'
import MakText from './MakText'
import { EntityStatusButton } from './EntityControls'

interface SidebarProps {
  pinned: WorkspaceEntity[]
  grouped: Map<string, WorkspaceEntity[]>
  activeId: string | null
  /** Index of the open tab on the active card; -1 when no card is open. */
  activeStep: number
  query: string
  onQuery: (q: string) => void
  searchRef: RefObject<HTMLInputElement | null>
  archivedCount: number
  showArchived: boolean
  onToggleArchived: () => void
  total: number
  offline: boolean
  lastSync: Date | null
  onCollapse: () => void
}

/* The sidebar is a tree: category › card › tabs. A card with more than one tab shows a
   twisty; the open card is always expanded; other cards and whole categories remember
   their state in localStorage so the menu looks the same tomorrow. */

function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[]) } catch { return new Set() }
}
function writeSet(key: string, value: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...value])) } catch { /* Private window or blocked storage. */ }
}

function Item({ entity, active, activeStep, expanded, onToggle }: {
  entity: WorkspaceEntity; active: boolean; activeStep: number; expanded: boolean; onToggle: () => void
}) {
  const branches = entity.steps.length > 1
  const open = active || expanded
  return (
    <div className="sidebar-item-row" data-card={entity.id}>
      <a
        href={entityHash(entity.id)}
        className={`sidebar-item${active ? ' active' : ''}${entity.pinned ? ' pinned' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <span className="item-icon" aria-hidden="true">
          {entity.icon ? <img src={contentUrl(`/workspace/${entity.folder}/${entity.icon}`)} width="24" height="24" alt="" decoding="async" /> : categoryIcon(entity.category)}
        </span>
        <span className="item-text">{entity.title}</span>
      </a>
      {branches && (
        <button
          className="sidebar-twist"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Hide the tabs of ${entity.title}` : `Show the tabs of ${entity.title}`}
          title={`${entity.steps.length} tabs`}
        >
          {open ? '▾' : '▸'}
        </button>
      )}
      <EntityStatusButton entity={entity} />
      {branches && open && (
        <div className="sidebar-steps" role="list">
          {entity.steps.map((step, index) => (
            <a
              key={`${entity.id}/${index}`}
              role="listitem"
              href={entityHash(entity.id, index)}
              className={`sidebar-step${active && index === activeStep ? ' active' : ''}`}
              aria-current={active && index === activeStep ? 'page' : undefined}
            >
              {step.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  pinned,
  grouped,
  activeId,
  activeStep,
  query,
  onQuery,
  searchRef,
  archivedCount,
  showArchived,
  onToggleArchived,
  total,
  offline,
  lastSync,
  onCollapse,
}: SidebarProps) {
  const empty = pinned.length === 0 && grouped.size === 0
  const [expanded, setExpanded] = useState<Set<string>>(() => readSet('mak.sidebarExpanded'))
  const [closedSections, setClosedSections] = useState<Set<string>>(() => readSet('mak.sidebarClosedSections'))
  useEffect(() => writeSet('mak.sidebarExpanded', expanded), [expanded])
  useEffect(() => writeSet('mak.sidebarClosedSections', closedSections), [closedSections])

  const toggleCard = (id: string) => setExpanded(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleSection = (cat: string) => setClosedSections(current => {
    const next = new Set(current)
    if (next.has(cat)) next.delete(cat); else next.add(cat)
    return next
  })
  // A search always shows everything it matched.
  const sectionOpen = (cat: string) => !!query || !closedSections.has(cat)

  const item = (e: WorkspaceEntity) => (
    <Item
      key={e.id}
      entity={e}
      active={e.id === activeId}
      activeStep={activeStep}
      expanded={expanded.has(e.id)}
      onToggle={() => toggleCard(e.id)}
    />
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <MakLogo size={54} animated={activeId !== 'my-dream-game'} />
        <div className="brand-text">
          <MakText height={26} animated={activeId !== 'my-dream-game'} />
          <span className="brand-sub">workspace</span>
        </div>
        <button
          className="sidebar-collapse"
          onClick={onCollapse}
          title="Hide menu ( [ )"
          aria-label="Hide menu"
        >
          ‹
        </button>
      </div>

      <div className="sidebar-search">
        <span className="search-icon" aria-hidden="true">
          {'⌕'}
        </span>
        <input
          ref={searchRef}
          value={query}
          onChange={ev => onQuery(ev.target.value)}
          onKeyDown={ev => {
            if (ev.key === 'Escape') {
              onQuery('')
              ev.currentTarget.blur()
            }
          }}
          placeholder="Search…  ( / )"
          aria-label="Search entities"
        />
        {query && (
          <button className="search-clear" onClick={() => onQuery('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      <nav className="sidebar-list">
        {pinned.length > 0 && (
          <div>
            <div className="sidebar-section">
              <span className="sidebar-label">{'\u{1F4CC}'} pinned</span>
            </div>
            {pinned.map(item)}
          </div>
        )}

        {[...grouped.entries()].map(([cat, list]) => (
          <div key={cat}>
            <div className="sidebar-section">
              <button
                className="sidebar-section-toggle"
                onClick={() => toggleSection(cat)}
                aria-expanded={sectionOpen(cat)}
                aria-label={`${sectionOpen(cat) ? 'Collapse' : 'Expand'} ${cat.replace(/-/g, ' ')}`}
              >
                <span className="sidebar-twist" aria-hidden="true">{sectionOpen(cat) ? '▾' : '▸'}</span>
                <span className="sidebar-label">{cat.replace(/-/g, ' ')}</span>
                <span className="sidebar-count">{list.length}</span>
              </button>
            </div>
            {sectionOpen(cat) && list.map(item)}
          </div>
        ))}

        {empty && <div className="sidebar-empty">Nothing matches, sir.</div>}

        {archivedCount > 0 && !query && (
          <button className="sidebar-archive-toggle" onClick={onToggleArchived}>
            {showArchived
              ? `▼ Hide archive (${archivedCount})`
              : `▶ Show archive (${archivedCount})`}
          </button>
        )}
      </nav>

      <footer className="sidebar-foot">
        <span className={`sync-dot${offline ? ' offline' : ''}`} />
        <span>
          {total} entities ·{' '}
          {offline
            ? 'offline'
            : lastSync
              ? `synced ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'syncing…'}
        </span>
      </footer>
    </aside>
  )
}
