import { useState, useEffect } from 'react'
import vscode from '../vscodeApi'

// ── Types (mirror src/panels/AddAgentPanel.ts) ────────────────────────────────

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

// ── Shared style tokens ───────────────────────────────────────────────────────

const S = {
  bg: '#0e1117',
  surface: '#141720',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  textPrimary: '#c9d1e0',
  textMuted: '#8891a8',
  textDim: '#4e566a',
  accent: '#818cf8',
  accentHover: '#6366f1',
  error: '#ff4d6a',
  warning: '#f0a500',
  green: '#00d4aa',
  mono: 'monospace',
}

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: S.mono,
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: S.textMuted,
  marginBottom: '6px',
}

const input: React.CSSProperties = {
  width: '100%',
  background: '#1a1f2e',
  border: `1px solid ${S.border}`,
  borderRadius: '6px',
  padding: '7px 10px',
  color: S.textPrimary,
  fontFamily: S.mono,
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddAgentForm() {
  const [projectName, setProjectName] = useState('')
  const [skills, setSkills] = useState<SkillInfo[] | null>(null) // null = loading

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  // const [scope, setScope] = useState<'global' | 'project'>('project')
  const [tools, setTools] = useState<string[]>([...TOOL_OPTIONS])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Listen for messages from the extension
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
    setTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool],
    )
  }

  const toggleSkill = (skillName: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName],
    )
  }

  const canSubmit = name.trim().length > 0 && description.trim().length > 0 && !submitting

  const handleSubmit = () => {
    if (!canSubmit) { return }
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
      projectRoot: '',   // filled in by AddAgentPanel.ts
      cohortId: '',      // filled in by AddAgentPanel.ts
    }
    vscode.postMessage({ command: 'createAgent', config })
  }

  const handleCancel = () => {
    vscode.postMessage({ command: 'cancel' })
  }

  const projectSkills = skills?.filter(s => s.scope === 'project') ?? []
  const globalSkills = skills?.filter(s => s.scope === 'global') ?? []

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.textPrimary, fontFamily: S.mono }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${S.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: S.textPrimary }}>
          Add Agent
        </span>
        {projectName && (
          <span style={{ fontSize: '11px', color: S.textDim }}>— {projectName}</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Section 1: Basic Info ── */}
        <Section title="Basic Info">
          <Field label="Agent Name *">
            <input
              style={input}
              placeholder="e.g. API Builder"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Description *">
            <input
              style={input}
              placeholder="What does this agent do? Claude uses this to decide when to delegate."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Model">
              <select
                style={{ ...input, cursor: 'pointer' }}
                value={model}
                onChange={e => setModel(e.target.value)}
              >
                {MODEL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            {/* <Field label="Scope">
              <div style={{ display: 'flex', gap: '12px', paddingTop: '6px' }}>
                {(['project', 'global'] as const).map(s => (
                  <label
                    key={s}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: S.textPrimary }}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={s}
                      checked={scope === s}
                      onChange={() => setScope(s)}
                      style={{ accentColor: S.accent }}
                    />
                    {s === 'project' ? 'This project' : 'Global'}
                  </label>
                ))}
              </div>
            </Field> */}
          </div>
        </Section>

        {/* ── Section 2: Tools ── */}
        <Section title="Tools">
          <p style={{ fontSize: '11px', color: S.textDim, margin: '0 0 10px' }}>
            Unselected tools will be blocked for this agent.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

        {/* ── Section 3: Skills ── */}
        <Section title="Skills">
          {skills === null ? (
            <p style={{ fontSize: '11px', color: S.textDim }}>Loading skills...</p>
          ) : skills.length === 0 ? (
            <p style={{ fontSize: '11px', color: S.textDim }}>
              No skills found. Create skills in <code style={{ color: S.textMuted }}>.claude/skills/</code> to attach them here.
            </p>
          ) : (
            <>
              {selectedSkills.length > 8 && (
                <div style={{
                  background: 'rgba(240,165,0,0.1)',
                  border: `1px solid ${S.warning}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: S.warning,
                  marginBottom: '12px',
                }}>
                  Many skills selected — this may exceed Claude's context budget.
                </div>
              )}
              {projectSkills.length > 0 && (
                <SkillGroup
                  title="Project Skills"
                  skills={projectSkills}
                  selected={selectedSkills}
                  onToggle={toggleSkill}
                />
              )}
              {globalSkills.length > 0 && (
                <SkillGroup
                  title="Global Skills"
                  skills={globalSkills}
                  selected={selectedSkills}
                  onToggle={toggleSkill}
                />
              )}
            </>
          )}
        </Section>

        {/* ── Section 4: System Prompt ── */}
        <Section title="System Prompt">
          <textarea
            style={{
              ...input,
              minHeight: '120px',
              resize: 'vertical',
              lineHeight: '1.5',
            }}
            placeholder="You are a specialized agent for..."
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
          />
        </Section>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(255,77,106,0.1)',
            border: `1px solid ${S.error}`,
            borderRadius: '6px',
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
        gap: '10px',
      }}>
        <button
          onClick={handleCancel}
          style={{
            background: 'transparent',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            padding: '7px 16px',
            color: S.textMuted,
            fontFamily: S.mono,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            background: canSubmit ? S.accent : '#2a2f3d',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 16px',
            color: canSubmit ? '#fff' : S.textDim,
            fontFamily: S.mono,
            fontSize: '12px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Creating...' : 'Create Agent'}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontFamily: S.mono,
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.8px',
        textTransform: 'uppercase' as const,
        color: S.textMuted,
        marginBottom: '12px',
        paddingBottom: '6px',
        borderBottom: `1px solid ${S.border}`,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label: labelText, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={label}>{labelText}</label>
      {children}
    </div>
  )
}

function CheckChip({ label: labelText, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        background: checked ? 'rgba(129,140,248,0.15)' : '#1a1f2e',
        border: `1px solid ${checked ? S.accent : S.border}`,
        borderRadius: '6px',
        padding: '5px 12px',
        color: checked ? S.accent : S.textMuted,
        fontFamily: S.mono,
        fontSize: '11px',
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
    >
      {checked ? '✓ ' : ''}{labelText}
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
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '10px', color: S.textDim, marginBottom: '8px', letterSpacing: '0.5px' }}>
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
                background: isSelected ? 'rgba(129,140,248,0.1)' : '#1a1f2e',
                border: `1px solid ${isSelected ? S.accent : S.border}`,
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.1s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {/* Checkbox indicator */}
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                border: `1.5px solid ${isSelected ? S.accent : S.border}`,
                background: isSelected ? S.accent : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: '#fff',
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
                    fontSize: '11px',
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
      color,
      background: `${color}20`,
      border: `1px solid ${color}40`,
      borderRadius: '4px',
      padding: '1px 6px',
      letterSpacing: '0.4px',
    }}>
      {label}
    </span>
  )
}
