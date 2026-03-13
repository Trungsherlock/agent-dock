import { useState, useEffect } from 'react'
import vscode from '../vscodeApi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SkillInfo {
  name: string
  description: string
  scope: 'global' | 'project'
  dirPath: string
  hasScripts: boolean
}

interface AgentConfig {
  name: string
  description: string
  model: string
  tools: string[]
  skills: string[]
  systemPrompt: string
  scope: 'global' | 'project'
  projectRoot: string
  cohortId: string
}

type ExtMsg =
  | { command: 'initData'; skills: SkillInfo[]; projectName: string }
  | { command: 'createError'; message: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const TOOL_OPTIONS = ['Read', 'Write', 'Edit', 'Bash', 'WebFetch', 'TodoRead', 'TodoWrite']
const MODEL_OPTIONS = [
  { label: 'Sonnet 4.6 (default)', value: 'claude-sonnet-4-6' },
  { label: 'Opus 4.6', value: 'claude-opus-4-6' },
  { label: 'Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
  { label: 'Inherit from session', value: '' },
]

// ── Style tokens (aligned with Card/List) ────────────────────────────────────

const S = {
  bg: '#0d1117',
  surface: '#12161f',
  card: '#161b2e',
  cardHover: '#1e2540',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.13)',
  textPrimary: '#dde1f0',
  textSecondary: '#b0bbd4',
  textMuted: '#8a97b4',
  textDim: '#6b7a96',
  accent: '#818cf8',
  accentBg: 'rgba(129,140,248,0.12)',
  error: '#ff4d6a',
  errorBg: 'rgba(255,77,106,0.1)',
  warning: '#f0a500',
  warningBg: 'rgba(240,165,0,0.1)',
  green: '#00d4aa',
  mono: 'monospace' as const,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: S.card,
  border: `1px solid ${S.border}`,
  borderRadius: '8px',
  padding: '8px 12px',
  color: S.textPrimary,
  fontFamily: S.mono,
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddAgentForm() {
  const [projectName, setProjectName] = useState('')
  const [skills, setSkills] = useState<SkillInfo[] | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [tools, setTools] = useState<string[]>([...TOOL_OPTIONS])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    vscode.postMessage({ command: 'ready' })
    const handler = (event: MessageEvent) => {
      const msg = event.data as ExtMsg
      if (msg.command === 'initData') {
        setProjectName(msg.projectName)
        setSkills(msg.skills)
      } else if (msg.command === 'createError') {
        setError(msg.message)
        setSubmitting(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const toggleTool = (tool: string) => {
    setTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])
  }

  const toggleSkill = (skillName: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillName) ? prev.filter(s => s !== skillName) : [...prev, skillName],
    )
  }

  const canSubmit = name.trim().length > 0 && description.trim().length > 0 && !submitting

  const handleSubmit = () => {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    const config: AgentConfig = {
      name: name.trim(),
      description: description.trim(),
      model,
      tools,
      skills: selectedSkills,
      systemPrompt: systemPrompt.trim(),
      scope: 'project',
      projectRoot: '',
      cohortId: '',
    }
    vscode.postMessage({ command: 'createAgent', config })
  }

  const handleCancel = () => vscode.postMessage({ command: 'cancel' })

  const projectSkills = skills?.filter(s => s.scope === 'project') ?? []
  const globalSkills = skills?.filter(s => s.scope === 'global') ?? []

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.textPrimary, fontFamily: S.mono }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${S.border}`,
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: S.textSecondary,
        }}>
          New Agent
        </span>
        {projectName && (
          <span style={{
            fontSize: '10px',
            color: S.textDim,
            fontWeight: 400,
          }}>
            — {projectName}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Basic Info */}
        <Section title="Basic Info">
          <Field label="Name *">
            <input
              style={inputStyle}
              placeholder="e.g. API Builder"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onFocus={e => { e.currentTarget.style.borderColor = `${S.accent}60` }}
              onBlur={e => { e.currentTarget.style.borderColor = S.border }}
            />
          </Field>
          <Field label="Description *">
            <input
              style={inputStyle}
              placeholder="What does this agent do?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = `${S.accent}60` }}
              onBlur={e => { e.currentTarget.style.borderColor = S.border }}
            />
          </Field>
          <Field label="Model">
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {MODEL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Tools */}
        <Section title="Tools">
          <p style={{ fontSize: '11px', color: S.textDim, margin: '0 0 8px' }}>
            Unselected tools will be blocked for this agent.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TOOL_OPTIONS.map(tool => (
              <CheckChip
                key={tool}
                label={tool}
                checked={tools.includes(tool)}
                onChange={() => toggleTool(tool)}
              />
            ))}
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills">
          {skills === null ? (
            <p style={{ fontSize: '11px', color: S.textDim }}>Loading skills...</p>
          ) : skills.length === 0 ? (
            <p style={{ fontSize: '11px', color: S.textDim }}>
              No skills found. Create skills in{' '}
              <code style={{ color: S.textMuted, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>
                .claude/skills/
              </code>{' '}
              to attach them here.
            </p>
          ) : (
            <>
              {selectedSkills.length > 8 && (
                <div style={{
                  background: S.warningBg,
                  border: `1px solid ${S.warning}40`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: S.warning,
                  marginBottom: '8px',
                }}>
                  Many skills selected — this may exceed Claude's context budget.
                </div>
              )}
              {projectSkills.length > 0 && (
                <SkillGroup title="Project" skills={projectSkills} selected={selectedSkills} onToggle={toggleSkill} />
              )}
              {globalSkills.length > 0 && (
                <SkillGroup title="Global" skills={globalSkills} selected={selectedSkills} onToggle={toggleSkill} />
              )}
            </>
          )}
        </Section>

        {/* System Prompt */}
        <Section title="System Prompt">
          <textarea
            style={{
              ...inputStyle,
              minHeight: '100px',
              resize: 'vertical',
              lineHeight: '1.6',
            }}
            placeholder="You are a specialized agent for..."
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = `${S.accent}60` }}
            onBlur={e => { e.currentTarget.style.borderColor = S.border }}
          />
        </Section>

        {/* Error banner */}
        {error && (
          <div style={{
            background: S.errorBg,
            border: `1px solid ${S.error}40`,
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '12px',
            color: S.error,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: S.surface,
        borderTop: `1px solid ${S.border}`,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
      }}>
        <button
          onClick={handleCancel}
          style={{
            background: 'transparent',
            border: `1px solid ${S.border}`,
            borderRadius: '8px',
            padding: '7px 18px',
            color: S.textMuted,
            fontFamily: S.mono,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = S.borderStrong
            e.currentTarget.style.color = S.textSecondary
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = S.border
            e.currentTarget.style.color = S.textMuted
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            background: canSubmit ? S.accentBg : 'rgba(255,255,255,0.04)',
            border: `1px solid ${canSubmit ? `${S.accent}50` : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '8px',
            padding: '7px 18px',
            color: canSubmit ? S.accent : S.textDim,
            fontFamily: S.mono,
            fontSize: '11px',
            fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (!canSubmit) return
            e.currentTarget.style.background = 'rgba(129,140,248,0.2)'
          }}
          onMouseLeave={e => {
            if (!canSubmit) return
            e.currentTarget.style.background = S.accentBg
          }}
        >
          {submitting ? 'Creating...' : 'Create Agent'}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: S.surface,
      border: `1px solid ${S.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${S.border}`,
        background: 'rgba(255,255,255,0.02)',
        fontFamily: S.mono,
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.8px',
        textTransform: 'uppercase' as const,
        color: S.textSecondary,
      }}>
        {title}
      </div>
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label: labelText, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontFamily: S.mono,
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        color: S.textDim,
        marginBottom: '6px',
      }}>
        {labelText}
      </label>
      {children}
    </div>
  )
}

function CheckChip({ label: labelText, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        background: checked ? S.accentBg : 'rgba(255,255,255,0.04)',
        border: `1px solid ${checked ? `${S.accent}50` : S.border}`,
        borderRadius: '99px',
        padding: '3px 10px',
        color: checked ? S.accent : S.textMuted,
        fontFamily: S.mono,
        fontSize: '10px',
        fontWeight: checked ? 700 : 400,
        cursor: 'pointer',
        transition: 'all 0.12s',
        letterSpacing: '0.3px',
      }}
    >
      {labelText}
    </button>
  )
}

function SkillGroup({
  title,
  skills,
  selected,
  onToggle,
}: {
  title: string
  skills: SkillInfo[]
  selected: string[]
  onToggle: (name: string) => void
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.6px',
        textTransform: 'uppercase' as const,
        color: S.textDim,
        marginBottom: '8px',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {skills.map(skill => {
          const isSelected = selected.includes(skill.name)
          return (
            <button
              key={skill.name}
              onClick={() => onToggle(skill.name)}
              style={{
                background: isSelected ? 'rgba(129,140,248,0.08)' : S.card,
                border: `1px solid ${isSelected ? `${S.accent}50` : S.border}`,
                borderRadius: '10px',
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.background = S.cardHover
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.background = S.card
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                border: `1.5px solid ${isSelected ? S.accent : S.border}`,
                background: isSelected ? S.accentBg : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: S.accent,
              }}>
                {isSelected ? '✓' : ''}
              </div>
              {/* Name + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: S.textPrimary, fontWeight: 600, fontFamily: S.mono }}>
                  {skill.name}
                </div>
                {skill.description && (
                  <div style={{
                    fontSize: '10px',
                    color: S.textDim,
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {skill.description}
                  </div>
                )}
              </div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <Badge label={skill.scope} color={skill.scope === 'project' ? S.green : S.accent} />
                {skill.hasScripts && <Badge label="scripts" color={S.warning} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: S.mono,
      fontSize: '9px',
      fontWeight: 600,
      color,
      background: `${color}18`,
      border: `1px solid ${color}35`,
      borderRadius: '99px',
      padding: '1px 7px',
      letterSpacing: '0.4px',
    }}>
      {label}
    </span>
  )
}
