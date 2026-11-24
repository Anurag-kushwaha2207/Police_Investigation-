'use client'
import type { AppData } from '@/lib/contracts'
import { mutateCase, createComplaint } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  roleLabels,
  visibleCases,
  visibleMessages,
  visibleDocuments,
  visibleRequests,
  visibleAudit,
  messageTargets,
  updateCase,
  canArchive,
  canEditProgress,
  type Role,
  type CaseRecord,
  type CaseAction,
  type CaseDocument,
} from './case-model'
import './workspace.css'

type Profile = { name: string; email: string; phone: string; office: string }
type Store = {
  cases: CaseRecord[]
  officers: AppData['officers']
  act: (id: string, role: Role, action: CaseAction) => Promise<boolean>
  create: (role: Role, title: string, description: string, category: string) => Promise<string>
  toast: (text: string) => void
  profiles: Partial<Record<Role, Profile>>
  saveProfile: (role: Role, profile: Profile) => void
  tasks: string[]
  toggleTask: (id: string) => void
  search: string
  setSearch: (value: string) => void
  trackUrl: (url: string) => void
}
const Context = createContext<Store | null>(null)
export function useWorkspace() {
  const context = useContext(Context)
  if (!context) throw new Error('Workspace provider is missing')
  return context
}
export function WorkspaceProvider({ children, data }: { children: ReactNode; data: AppData }) {
  const router = useRouter()
  const [cases, setCases] = useState(data.cases)
  useEffect(() => setCases(data.cases), [data.cases])
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 15000)
    return () => clearInterval(timer)
  }, [router])
  const [profiles, setProfiles] = useState<Store['profiles']>({
    [data.user.role]: {
      name: data.user.name,
      email: data.user.email,
      phone: '',
      office: data.user.station,
    },
  })
  const [tasks, setTasks] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const urls = useRef<string[]>([])
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      urls.current.forEach(URL.revokeObjectURL)
    },
    [],
  )
  const toast = (text: string) => {
    clearTimeout(timer.current)
    setNotice(text)
    timer.current = setTimeout(() => setNotice(''), 4500)
  }
  const act: Store['act'] = async (id, role, action) => {
    const result = await mutateCase(id, action)
    toast(result.error || 'Saved')
    router.refresh()
    return !result.error
  }
  const create: Store['create'] = async (role, title, description, category) => {
    const result = await createComplaint(title, description, category)
    toast(result.error || 'Complaint submitted')
    router.refresh()
    return result.reference || ''
  }
  return (
    <Context.Provider
      value={{
        cases,
        officers: data.officers,
        act,
        create,
        toast,
        profiles,
        saveProfile: (role, profile) => {
          setProfiles((items) => ({ ...items, [role]: profile }))
          toast('Profile updated for this demo session')
        },
        tasks,
        toggleTask: (id) =>
          setTasks((items) =>
            items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
          ),
        search,
        setSearch,
        trackUrl: (url) => {
          urls.current.push(url)
        },
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={async () => setNotice('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  )
}
const date = (value: string) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
export function download(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function Modal({
  title,
  children,
  close,
}: {
  title: string
  children: ReactNode
  close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="workspace-dialog"
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={close} aria-label="Close dialog">
          ×
        </button>
      </header>
      {children}
    </dialog>
  )
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="workspace-empty">
      <span>—</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  )
}
export function NewRecord({
  role,
  close,
  open,
}: {
  role: Role
  close: () => void
  open: (id: string) => void
}) {
  const { create } = useWorkspace()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Cybercrime')
  return (
    <Modal title={role === 'citizen' ? 'Register a complaint' : 'Create a case'} close={close}>
      <form
        className="workspace-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const id = await create(role, title, description, category)
          if (id) {
            close()
          }
        }}
      >
        <p className="form-note">
          Your complaint will be stored securely against your citizen account. Do not include
          passwords, OTPs or PINs.
        </p>
        <label>
          Subject
          <input
            required
            minLength={5}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Briefly describe the matter"
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {['Cybercrime', 'Identity theft', 'Lost property', 'Other'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Description
          <textarea
            required
            minLength={15}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add the details needed for initial review"
          />
        </label>
        <button className="primary-button">Create record</button>
      </form>
    </Modal>
  )
}
export function CaseList({
  role,
  open,
  includeArchived = false,
}: {
  role: Role
  open: (id: string) => void
  includeArchived?: boolean
}) {
  const { cases, search } = useWorkspace()
  const rows = visibleCases(cases, role).filter(
    (record) =>
      (includeArchived || !record.archived) &&
      `${record.id} ${record.fir} ${record.ack} ${record.evidence} ${record.title} ${record.citizen.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  return (
    <div className="work-list">
      {rows.length ? (
        rows.map((record) => (
          <button className="work-item" key={record.id} onClick={async () => open(record.id)}>
            <div className="work-id">
              {role === 'lab' ? record.evidence : role === 'citizen' ? record.ack : record.fir}
            </div>
            <div className="work-copy">
              <strong>{record.title}</strong>
              <span>
                {record.citizen.name} · {record.id}
              </span>
              <div className="progress">
                <i
                  style={{
                    width: `${role === 'lab' ? record.labProgress : record.progress}%`,
                    background: 'var(--role-accent)',
                  }}
                />
              </div>
            </div>
            <span
              className={`status ${record.archived ? 'warning' : record.priority === 'High' ? 'danger' : 'success'}`}
            >
              {record.archived ? 'Archived' : role === 'lab' ? record.labStage : record.stage}
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))
      ) : (
        <Empty
          title="No matching cases"
          detail="Try another name or case ID, or check archived records."
        />
      )}
    </div>
  )
}
export function CaseWorkspace({
  role,
  caseId,
  onBack,
}: {
  role: Role
  caseId: string
  onBack: () => void
}) {
  const { cases, act, toast, trackUrl } = useWorkspace()
  const record = visibleCases(cases, role).find((item) => item.id === caseId)
  const [tab, setTab] = useState('Overview')
  const [dialog, setDialog] = useState<'request' | 'archive' | null>(null)
  const [preview, setPreview] = useState<CaseDocument | null>(null)
  const [message, setMessage] = useState('')
  const [recipient, setRecipient] = useState<Role>(
    role === 'citizen' || role === 'lab' ? 'io' : 'citizen',
  )
  const [requestTitle, setRequestTitle] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [due, setDue] = useState('')
  const [reason, setReason] = useState('')
  const lab = role === 'lab'
  const [progress, setProgress] = useState(
    lab ? (record?.labProgress ?? 0) : (record?.progress ?? 0),
  )
  const [stage, setStage] = useState(lab ? (record?.labStage ?? '') : (record?.stage ?? ''))
  const fileRef = useRef<HTMLInputElement>(null)
  const [requestId, setRequestId] = useState<string>()
  if (!record)
    return (
      <section className="panel">
        <Empty
          title="Case unavailable"
          detail="This case is not assigned to your current workspace."
        />
        <button className="back-link" onClick={onBack}>
          Back to workspace
        </button>
      </section>
    )
  const targets = messageTargets(record, role)
  const target = targets.includes(recipient) ? recipient : targets[0]
  const editable = !record.archived && (canEditProgress(role) || lab)
  const documents = visibleDocuments(record, role)
  const requests = visibleRequests(record, role)
  const messages = visibleMessages(record, role)
  const events = visibleAudit(record, role)
  const archive = async () => {
    if (await act(record.id, role, { type: 'archive', reason })) {
      setDialog(null)
      toast('Case archived. History retained; authorized supervisors can restore it.')
    }
  }
  const upload = async (file?: File) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast('Choose a file smaller than 10 MB')
      return
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'text/plain'].includes(file.type)) {
      toast('Supported files: PDF, JPG, PNG or TXT')
      return
    }
    const url = URL.createObjectURL(file)
    trackUrl(url)
    const content = file.type === 'text/plain' ? await file.text() : ''
    if (
      await act(record.id, role, {
        type: 'upload',
        requestId,
        document: {
          id: crypto.randomUUID(),
          name: file.name,
          content,
          url,
          type: file.type,
          from: role,
          audience: [],
          at: '',
        },
      })
    )
      toast('File added to this demo session. It is not stored on a server.')
    setRequestId(undefined)
  }
  return (
    <div className="case-workspace">
      <FileTracker record={record} role={role} />
      {role === 'io' && <ApprovalPanel record={record} role={role} />}
      <div className="case-breadcrumb">
        <button onClick={onBack}>← Back to dashboard</button>
        <span>/</span>
        <strong>{record.fir}</strong>
      </div>
      <section className="case-hero">
        <div className="citizen-avatar">{record.citizen.initials}</div>
        <div className="case-title">
          <div className="case-labels">
            <span>{record.archived ? 'ARCHIVED CASE' : 'ACTIVE CASE'}</span>
            <i>Demo · {roleLabels[role]}</i>
          </div>
          <h1>{record.title}</h1>
          <p>
            {record.citizen.name} · {record.citizen.id} · {record.station}
          </p>
        </div>
        <div className="case-hero-actions">
          {canArchive(role) && (
            <button
              className="outline-button"
              onClick={async () =>
                record.archived ? act(record.id, role, { type: 'restore' }) : setDialog('archive')
              }
            >
              {record.archived ? 'Restore case' : 'Archive case'}
            </button>
          )}
          <button className="primary-button" onClick={async () => setTab('Messages')}>
            Open messages
          </button>
        </div>
      </section>
      <section className="linked-id-strip">
        {[
          ['UNIFIED CASE ID', record.id],
          ['FIR REFERENCE', record.fir],
          ['CITIZEN ACKNOWLEDGEMENT', record.ack],
          ['FORENSIC EVIDENCE', record.evidence],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
        <span className="sync-badge">Linked across demo workspaces</span>
      </section>
      {record.archived && (
        <div className="workspace-notice">
          Archived: {record.archiveReason}. Editing is disabled until the SHO or SP restores this
          case.
        </div>
      )}
      <nav className="case-tabs" aria-label="Case sections">
        {['Overview', 'Documents', 'Messages', 'Timeline'].map((item) => (
          <button
            key={item}
            className={tab === item ? 'active' : ''}
            onClick={async () => setTab(item)}
          >
            {item}
            {item === 'Documents'
              ? ` (${documents.length})`
              : item === 'Messages'
                ? ` (${messages.length})`
                : ''}
          </button>
        ))}
      </nav>
      {tab === 'Overview' && (
        <div className="case-layout">
          <div className="case-main-column">
            <section className="panel progress-panel">
              <div className="panel-heading">
                <div>
                  <small>{lab ? 'FORENSIC WORKFLOW' : 'CASE WORKFLOW'}</small>
                  <h3>{lab ? 'Examination progress' : 'Investigation progress'}</h3>
                </div>
                <strong className="progress-number">{progress}%</strong>
              </div>
              <div className="progress-editor">
                <div className="stage-row">
                  <label>
                    Current stage
                    <select
                      disabled={!editable}
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                    >
                      {(lab
                        ? [
                            'Not requested',
                            'Examination in progress',
                            'Peer review',
                            'Report issued',
                          ]
                        : [
                            'Initial review',
                            'Evidence collection',
                            'Evidence review',
                            'Final report preparation',
                            'Completed',
                          ]
                      ).map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned unit
                    <input readOnly value={lab ? 'Digital Forensics Division' : record.station} />
                  </label>
                </div>
                <input
                  aria-label="Progress percentage"
                  className="range-input"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  disabled={!editable}
                  onChange={(e) => setProgress(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>Registered</span>
                  <span>In progress</span>
                  <span>Review</span>
                  <span>Complete</span>
                </div>
                {editable ? (
                  <button
                    className="save-button"
                    onClick={async () => {
                      if (
                        await act(record.id, role, {
                          type: lab ? 'lab' : 'progress',
                          stage,
                          progress,
                        })
                      )
                        toast('Progress saved to shared session timeline')
                    }}
                  >
                    Save progress update
                  </button>
                ) : (
                  <p className="readonly-note">
                    Read-only ·{' '}
                    {record.archived
                      ? 'Archived record'
                      : 'Only the assigned IO can change investigation progress'}
                  </p>
                )}
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <small>CASE SUMMARY</small>
                  <h3>Background & next steps</h3>
                </div>
              </div>
              <div className="summary-body">
                <p>{record.summary}</p>
                <div>
                  <span>
                    Category<strong>{record.category}</strong>
                  </span>
                  <span>
                    Priority<strong>{record.priority}</strong>
                  </span>
                  <span>
                    Next review<strong>{record.deadline}</strong>
                  </span>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <small>RECENT ACTIVITY</small>
                  <h3>Shared timeline</h3>
                </div>
                <button onClick={async () => setTab('Timeline')}>View all ›</button>
              </div>
              <EventList events={events.slice(0, 3)} />
            </section>
          </div>
          <aside className="case-side-column">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <small>LINKED CITIZEN</small>
                  <h3>Citizen information</h3>
                </div>
                <span className="verified">Synthetic data</span>
              </div>
              <div className="citizen-details">
                {[
                  ['Full name', record.citizen.name],
                  ['Citizen ID', record.citizen.id],
                  ['Mobile', record.citizen.phone],
                  ['Email', record.citizen.email],
                  ['Preferred language', 'Hindi / English'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel quick-actions">
              <div className="panel-heading">
                <div>
                  <small>CASE PARTICIPANTS</small>
                  <h3>Connected services</h3>
                </div>
              </div>
              {targets.map((other) => (
                <button
                  key={other}
                  onClick={async () => {
                    setRecipient(other)
                    setTab('Messages')
                  }}
                >
                  <span>{other.toUpperCase().slice(0, 2)}</span>
                  <p>
                    <strong>{roleLabels[other]}</strong>
                    <small>Message using the same case ID</small>
                  </p>
                  <span>›</span>
                </button>
              ))}
            </section>
          </aside>
        </div>
      )}
      {tab === 'Documents' && (
        <section className="panel case-tab-panel">
          <div className="panel-heading">
            <div>
              <small>DOCUMENTS & REQUESTS</small>
              <h3>Case document vault</h3>
              <p>Only documents shared with your demo role are shown.</p>
            </div>
            <div className="button-row">
              <button
                disabled={record.archived || role === 'sho'}
                onClick={async () => toast('Protected file upload is not connected yet.')}
              >
                Upload file
              </button>
              {role !== 'citizen' && (
                <button
                  className="request-button"
                  disabled={record.archived || role === 'sho'}
                  onClick={async () => setDialog('request')}
                >
                  + Request document
                </button>
              )}
            </div>
          </div>
          <input
            hidden
            type="file"
            ref={fileRef}
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            onChange={(e) => {
              void upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <div className="request-list">
            {requests.map((request) => (
              <div key={request.id}>
                <div>
                  <strong>{request.title}</strong>
                  <small>
                    {roleLabels[request.from]} → {roleLabels[request.to]} · Due {request.due}
                  </small>
                  <p>{request.note}</p>
                </div>
                <span className="doc-status">{request.status}</span>
                {request.to === role && request.status === 'Pending' && (
                  <button
                    disabled={record.archived || role === 'sho'}
                    onClick={async () => {
                      toast('Protected file upload is not connected yet.')
                    }}
                  >
                    Respond with file
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="document-list">
            {documents.map((document) => (
              <div key={document.id}>
                <span className="doc-icon">DOC</span>
                <p>
                  <strong>{document.name}</strong>
                  <small>
                    {roleLabels[document.from]} · {date(document.at)}
                  </small>
                </p>
                <button onClick={async () => setPreview(document)}>Preview</button>
                <button
                  onClick={async () => {
                    if (document.url) {
                      const anchor = window.document.createElement('a')
                      anchor.href = document.url
                      anchor.download = document.name
                      anchor.click()
                    } else download(document.name, document.content)
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
          {!documents.length && (
            <Empty
              title="No documents yet"
              detail="Upload a sample file or request a document from a linked participant."
            />
          )}
        </section>
      )}
      {tab === 'Messages' && (
        <section className="panel case-tab-panel message-panel">
          <div className="panel-heading">
            <div>
              <small>CASE MESSAGES</small>
              <h3>Participant conversation</h3>
              <p>Only messages sent by or addressed to your role are visible.</p>
            </div>
            <label className="recipient-label">
              Send to
              <select
                aria-label="Message recipient"
                value={target}
                onChange={(e) => setRecipient(e.target.value as Role)}
              >
                {targets.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="message-history">
            {messages.length ? (
              messages.map((item) => (
                <div key={item.id} className={item.from === role ? 'sent' : 'received'}>
                  <p>
                    <strong>
                      {roleLabels[item.from]} → {roleLabels[item.to]}
                    </strong>
                    <small>{date(item.at)}</small>
                    {item.text}
                  </p>
                </div>
              ))
            ) : (
              <Empty
                title="Start a conversation"
                detail="Choose an assigned participant and send a case-specific message."
              />
            )}
          </div>
          <form
            className="case-message-input"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await act(record.id, role, { type: 'message', to: target, text: message })) {
                setMessage('')
                toast('Message added to the shared demo session')
              }
            }}
          >
            <input
              aria-label="Case message"
              required
              maxLength={3000}
              value={message}
              disabled={record.archived}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a case-specific message..."
            />
            <button disabled={record.archived || !message.trim()}>Send message</button>
          </form>
        </section>
      )}
      {tab === 'Timeline' && (
        <section className="panel case-tab-panel">
          <div className="panel-heading">
            <div>
              <small>SESSION ACTIVITY RECORD</small>
              <h3>Case history</h3>
              <p>
                This frontend history is a demonstration, not an immutable production audit log.
              </p>
            </div>
            <button
              onClick={async () =>
                download(
                  `${record.id}-history.txt`,
                  events
                    .map(
                      (event) => `${date(event.at)} | ${roleLabels[event.actor]} | ${event.title}`,
                    )
                    .join('\n'),
                )
              }
            >
              Export history
            </button>
          </div>
          <EventList events={events} />
        </section>
      )}
      {dialog === 'request' && (
        <Modal title="Request a document" close={() => setDialog(null)}>
          <form
            className="workspace-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (
                await act(record.id, role, {
                  type: 'request',
                  request: {
                    id: crypto.randomUUID(),
                    from: role,
                    to: target,
                    title: requestTitle,
                    due,
                    note: requestNote,
                    status: 'Pending',
                  },
                })
              ) {
                setDialog(null)
                setRequestTitle('')
                setRequestNote('')
                toast('Document request added to the recipient’s case workspace')
              }
            }}
          >
            <label>
              Request from
              <select value={target} onChange={(e) => setRecipient(e.target.value as Role)}>
                {targets.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Document name
              <input
                required
                maxLength={150}
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="e.g. Transaction statement"
              />
            </label>
            <label>
              Due date
              <input required type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label>
              Instructions
              <textarea
                maxLength={1000}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
              />
            </label>
            <button className="primary-button">Send request</button>
          </form>
        </Modal>
      )}
      {dialog === 'archive' && (
        <Modal title="Archive this case?" close={() => setDialog(null)}>
          <form
            className="workspace-form"
            onSubmit={async (e) => {
              e.preventDefault()
              archive()
            }}
          >
            <p>
              Archiving removes the case from active lists but preserves all history. Permanent
              deletion is intentionally unavailable for investigation records.
            </p>
            <label>
              Reason (minimum 10 characters)
              <textarea
                required
                minLength={10}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className="primary-button">Archive with reason</button>
          </form>
        </Modal>
      )}
      {preview && (
        <Modal title={preview.name} close={() => setPreview(null)}>
          {preview.type?.startsWith('image/') && preview.url ? (
            <p className="form-note padded-note">
              Image preview is unavailable until protected uploads are connected.
            </p>
          ) : preview.type === 'application/pdf' && preview.url ? (
            <iframe className="document-frame" title={preview.name} src={preview.url} />
          ) : (
            <pre className="document-content">{preview.content}</pre>
          )}
        </Modal>
      )}
    </div>
  )
}
function EventList({ events }: { events: CaseRecord['audit'] }) {
  return (
    <div className="case-activity expanded">
      {events.length ? (
        events.map((event) => (
          <div key={event.id}>
            <span>•</span>
            <p>
              <strong>{event.title}</strong>
              <small>
                {date(event.at)} · {roleLabels[event.actor]}
              </small>
            </p>
            <i>{event.public ? 'Citizen visible' : 'Staff activity'}</i>
          </div>
        ))
      ) : (
        <Empty title="No activity yet" detail="Case actions will appear here." />
      )}
    </div>
  )
}

export function WorkspacePage({
  role,
  page,
  open,
}: {
  role: Role
  page: string
  open: (id: string) => void
}) {
  const { cases, tasks, toggleTask, search, setSearch } = useWorkspace()
  const [archived, setArchived] = useState(false)
  const records = visibleCases(cases, role)
  const filtered = records.filter((record) =>
    `${record.id} ${record.title} ${record.citizen.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const history = /History|Custody|Updates/.test(page)
  const docs = /Documents|Drafts|Orders|Reports|Evidence Review/.test(page)
  const deadlines = /Deadline|Hearings|Calendar/.test(page)
  const people = /Officer|Supervision|Clients|Stations/.test(page)
  const analytics = /Analytics|Performance|Turnaround/.test(page)
  const checklist = /Plan|Task|Approval|Risk Review/.test(page)
  const allEvents = filtered
    .flatMap((record) => visibleAudit(record, role).map((event) => ({ ...event, record })))
    .sort((a, b) => b.at.localeCompare(a.at))
  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <span className="page-kicker">{roleLabels[role].toUpperCase()}</span>
          <h1>{page}</h1>
          <p>
            {history
              ? 'Connected activity from your accessible case records.'
              : 'Select a record to work with the linked citizen, investigation and lab services.'}
          </p>
        </div>
        <button
          className="outline-button export-button"
          onClick={async () =>
            download(
              `${page.toLowerCase().replace(/ /g, '-')}.json`,
              JSON.stringify(
                filtered.map(({ id, title, stage, progress }) => ({ id, title, stage, progress })),
                null,
                2,
              ),
              'application/json',
            )
          }
        >
          Export summary
        </button>
      </div>
      <label className="directory-search">
        <span>Filter records</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, case title or ID"
        />
      </label>
      {history ? (
        <section className="panel">
          <div className="panel-heading">
            <h3>Case activity</h3>
            <span className="count">{allEvents.length}</span>
          </div>
          {allEvents.length ? (
            allEvents.map((event) => (
              <button
                className="history-row"
                key={event.id}
                onClick={async () => open(event.record.id)}
              >
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {event.record.fir} · {roleLabels[event.actor]} · {date(event.at)}
                  </small>
                </span>
                <span>Open case ›</span>
              </button>
            ))
          ) : (
            <Empty title="No activity" detail="New case actions will appear here." />
          )}
        </section>
      ) : docs ? (
        <section className="panel">
          <div className="panel-heading">
            <h3>{page === 'Reports' ? 'Case reports & documents' : 'Documents by case'}</h3>
          </div>
          {filtered.map((record) => (
            <button className="history-row" key={record.id} onClick={async () => open(record.id)}>
              <span>
                <strong>{record.title}</strong>
                <small>
                  {record.fir} · {visibleDocuments(record, role).length} visible documents ·{' '}
                  {visibleRequests(record, role).filter((item) => item.status === 'Pending').length}{' '}
                  pending requests
                </small>
              </span>
              <span>Open vault ›</span>
            </button>
          ))}
        </section>
      ) : deadlines ? (
        <section className="panel">
          <div className="panel-heading">
            <h3>Upcoming case reviews & document deadlines</h3>
            <span className="verified">Demo schedule</span>
          </div>
          {filtered
            .filter((record) => !record.archived)
            .map((record) => (
              <button className="history-row" key={record.id} onClick={async () => open(record.id)}>
                <span className="deadline-date">{record.deadline}</span>
                <span>
                  <strong>{record.title}</strong>
                  <small>
                    {record.fir} · Case review · {record.stage}
                  </small>
                </span>
                <span>View case ›</span>
              </button>
            ))}
          <p className="form-note padded-note">
            Review dates are sample workflow dates, not calculated statutory or court deadlines.
          </p>
        </section>
      ) : people ? (
        <div className="people-grid">
          {(role === 'advocate' || page === 'Clients'
            ? filtered.map((record) => ({
                name: record.citizen.name,
                detail: record.fir,
                id: record.id,
              }))
            : filtered.map((record) => ({
                name: page === 'Police Stations' ? record.station : `Assigned team · ${record.fir}`,
                detail: `${record.progress}% complete · ${record.stage}`,
                id: record.id,
              }))
          ).map((person) => (
            <button
              key={person.id}
              className="panel person-card"
              onClick={async () => open(person.id)}
            >
              <span className="person-avatar">{person.name.slice(0, 2).toUpperCase()}</span>
              <strong>{person.name}</strong>
              <small>{person.detail}</small>
              <span>View assigned case ›</span>
            </button>
          ))}
        </div>
      ) : analytics ? (
        <section className="panel">
          <div className="panel-heading">
            <h3>Progress by assigned case</h3>
            <span className="verified">Live session data</span>
          </div>
          <div className="analytics-list">
            {filtered.map((record) => (
              <button key={record.id} onClick={async () => open(record.id)}>
                <span>{record.title}</span>
                <div className="analytics-track">
                  <i
                    style={{ width: `${role === 'lab' ? record.labProgress : record.progress}%` }}
                  />
                </div>
                <strong>{role === 'lab' ? record.labProgress : record.progress}%</strong>
              </button>
            ))}
          </div>
        </section>
      ) : checklist ? (
        <section className="panel">
          <div className="panel-heading">
            <h3>Case action checklist</h3>
            <span className="verified">Human review required</span>
          </div>
          {filtered
            .filter((record) => !record.archived)
            .map((record) => (
              <div className="checklist-group" key={record.id}>
                <button onClick={async () => open(record.id)}>
                  {record.fir} · {record.title} ›
                </button>
                {[
                  'Review complaint and documents',
                  'Check evidence gaps',
                  'Review draft before approval',
                  'Update citizen on progress',
                ].map((task, index) => {
                  const id = `${role}-${record.id}-${index}`
                  return (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={tasks.includes(id)}
                        onChange={() => toggleTask(id)}
                      />
                      <span>{task}</span>
                    </label>
                  )
                })}
              </div>
            ))}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h3>Assigned case directory</h3>
            <label className="archive-toggle">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
              />{' '}
              Include archived
            </label>
          </div>
          <CaseList role={role} open={open} includeArchived={archived} />
        </section>
      )}
    </div>
  )
}

export function ProfilePage({ role, name, color }: { role: Role; name: string; color: string }) {
  const { profiles, saveProfile } = useWorkspace()
  const initial = profiles[role] ?? {
    name,
    email: `${role}@example.test`,
    phone: 'Not provided',
    office: 'Lucknow District',
  }
  const [profile, setProfile] = useState(initial)
  const [editing, setEditing] = useState(false)
  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="large-avatar" style={{ background: color }}>
          {profile.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div>
          <span className="eyebrow">DEMO ACCOUNT</span>
          <h2>{profiles[role]?.name ?? name}</h2>
          <p>{roleLabels[role]} · Uttar Pradesh Justice Network</p>
        </div>
        <button className="outline-button" onClick={async () => setEditing(!editing)}>
          {editing ? 'Cancel editing' : 'Edit profile'}
        </button>
      </section>
      <div className="profile-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>ACCOUNT</small>
              <h3>Professional information</h3>
            </div>
          </div>
          <form
            className="workspace-form"
            onSubmit={async (e) => {
              e.preventDefault()
              saveProfile(role, profile)
              setEditing(false)
            }}
          >
            {(['name', 'email', 'phone', 'office'] as const).map((key) => (
              <label key={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
                <input
                  required
                  disabled={!editing}
                  type={key === 'email' ? 'email' : 'text'}
                  value={profile[key]}
                  onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                />
              </label>
            ))}
            {editing && <button className="primary-button">Save profile</button>}
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>IMPLEMENTATION STATUS</small>
              <h3>Privacy & access</h3>
            </div>
          </div>
          <div className="implementation-notes">
            <h4>Authenticated access</h4>
            <p>Your role and station are assigned by the administrator.</p>
            <h4>Durable case records</h4>
            <p>
              Supported case actions are stored in Payload. Protected file uploads and profile
              preference saving are still being connected.
            </p>
            <h4>Pending workflow tools</h4>
            <p>
              The full court-review chain, compliance registers and reporting tools are not yet
              complete.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export function AIAssistant({ role }: { role: Role }) {
  const { cases } = useWorkspace()
  const record = visibleCases(cases, role)[0]
  const [input, setInput] = useState('')
  const [chat, setChat] = useState<{ user: boolean; text: string }[]>([
    {
      user: false,
      text: 'Welcome. This is a scripted guidance preview, not a connected AI service. I can show a case summary, sample document checklist or next-step guidance using synthetic data.',
    },
  ])
  const ask = (question: string) => {
    if (!question.trim()) return
    const q = question.toLowerCase()
    const answer =
      /summary|status|explain|summarize/.test(q) && record
        ? `${record.fir}: ${record.title}. Current stage: ${record.stage}, progress ${record.progress}%. Pending requests visible to you: ${visibleRequests(record, role).filter((request) => request.status === 'Pending').length}. Open the case workspace to review the latest records.`
        : /fraud/.test(q)
          ? 'If you suspect financial cyber fraud, contact your bank immediately and report it through the official cybercrime helpline 1930 or the National Cyber Crime Reporting Portal. Preserve transaction references and screenshots. For immediate danger, contact emergency services. This is general information, not case-specific legal advice.'
          : /draft|freeze/.test(q)
            ? 'SAMPLE DRAFT — NOT READY TO SEND\nTo: [Bank nodal officer]\nSubject: Request for action concerning [case reference]\nPlease review the disputed transactions listed in the attached authorized request. Account details, legal authority, requested action and signatory must be verified by the responsible officer before use. No action is sent automatically.'
            : /document|list/.test(q)
              ? 'Sample checklist: complaint acknowledgement, disputed transaction references, relevant statements, screenshots and prior correspondence. Share only what your assigned officer formally requests. Never send passwords, OTPs or PINs.'
              : /gap|next|plan/.test(q)
                ? 'Suggested review checklist: verify the complaint facts, review missing documents, check evidence handling, confirm pending lab requests and review the next citizen update. The assigned officer must verify legal authority and deadlines before any action.'
                : 'This offline preview supports: case status, document checklist, fraud reporting guidance and sample investigation planning. For other questions, contact the assigned officer or a qualified advocate. No legal citations have been verified by this demo.'
    setChat((items) => [
      ...items,
      { user: true, text: question.trim() },
      { user: false, text: answer },
    ])
    setInput('')
  }
  return (
    <div className="ai-page">
      <section className="ai-main">
        <div className="ai-heading">
          <span className="ai-orb">AI</span>
          <div>
            <small>SCRIPTED DEMO · NOT LIVE AI</small>
            <h2>{role === 'citizen' ? 'Nyaya Guide' : 'Investigation Copilot'}</h2>
            <p>Sample guidance only · Human review required</p>
          </div>
        </div>
        <div className="chat-area interactive-chat">
          {chat.map((item, index) => (
            <div key={index} className={`assistant-bubble ${item.user ? 'user' : ''}`}>
              <small>{item.user ? 'You' : 'Guide preview'}</small>
              <p>{item.text}</p>
            </div>
          ))}
          <div className="suggestions">
            {['Explain my case status', 'Document checklist', 'Suggested next steps'].map(
              (item) => (
                <button key={item} onClick={async () => ask(item)}>
                  {item} ›
                </button>
              ),
            )}
          </div>
        </div>
        <form
          className="chat-input"
          onSubmit={async (e) => {
            e.preventDefault()
            ask(input)
          }}
        >
          <input
            aria-label="Ask the guide"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about status, documents or next steps..."
          />
          <button className="send-button" aria-label="Send question">
            ↑
          </button>
        </form>
      </section>
      <aside className="ai-sources">
        <small>RESPONSIBLE ASSISTANCE</small>
        <h3>Clear limitations</h3>
        <p>
          No external AI calls. No real case data. Responses are scripted and cannot decide arrests,
          charges or court outcomes.
        </p>
        <p>
          BNS, BNSS and BSA references must be verified against official sources. This demo does not
          claim grounded legal research.
        </p>
      </aside>
    </div>
  )
}

export function ApprovalPanel({ record, role }: { record: CaseRecord; role: Role }) {
  const { act } = useWorkspace()
  const [kind, setKind] = useState('Bank freeze letter')
  const [draft, setDraft] = useState('')
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-heading">
        <div>
          <small>SUPERVISORY REVIEW</small>
          <h3>IO approval requests & SHO remarks</h3>
        </div>
      </div>
      {role === 'io' && !record.archived && (
        <form
          className="workspace-form"
          onSubmit={async (e) => {
            e.preventDefault()
            await act(record.id, role, { type: 'submitApproval', kind, draft })
          }}
        >
          <label>
            Request type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option>Bank freeze letter</option>
              <option>Chargesheet</option>
              <option>Final report</option>
              <option>Telecom letter</option>
              <option>Platform notice</option>
              <option>Lab forwarding</option>
            </select>
          </label>
          <label>
            Draft for review
            <textarea
              required
              minLength={20}
              maxLength={20000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <p className="form-note">
            No draft is sent externally. Questioning, arrest and charge decisions remain with the
            IO.
          </p>
          <button className="primary-button">Submit to SHO</button>
        </form>
      )}
      {(record.approvals ?? []).map((item) => (
        <div className="workspace-form" key={item.id}>
          <strong>
            {item.kind} · {item.status}
          </strong>
          <p>{item.remarks || 'Awaiting SHO review'}</p>
          <small className="form-note">
            Pending for {Math.max(0, Math.floor((Date.now() - Date.parse(item.at)) / 3600000))}{' '}
            hours
          </small>
          <details>
            <summary>Preview draft</summary>
            <pre className="document-content">
              {item.draft || 'No draft attached to this legacy request.'}
            </pre>
          </details>
          {role === 'sho' && item.status === 'Pending' && !record.archived && (
            <form
              className="workspace-form"
              onSubmit={async (e) => {
                e.preventDefault()
              }}
            >
              <label>
                Review remarks
                <textarea
                  required
                  value={remarks[item.id] ?? ''}
                  onChange={(e) => setRemarks({ ...remarks, [item.id]: e.target.value })}
                />
              </label>
              <div className="button-row">
                {(['Approved', 'Returned'] as const).map((decision) => (
                  <button
                    type="button"
                    className="primary-button"
                    key={decision}
                    onClick={async () =>
                      await act(record.id, role, {
                        type: 'reviewApproval',
                        approvalId: item.id,
                        decision,
                        remarks: remarks[item.id] ?? '',
                      })
                    }
                  >
                    {decision === 'Approved' ? 'Approve' : 'Return to IO'}
                  </button>
                ))}
              </div>
            </form>
          )}
        </div>
      ))}
      {!record.approvals?.length && (
        <p className="padded-note form-note">No approval requests for this case.</p>
      )}
    </section>
  )
}

function FileTracker({ record, role }: { record: CaseRecord; role: Role }) {
  const { act } = useWorkspace()
  const [note, setNote] = useState('')
  const location = record.fileLocation || 'io'
  const labels: Record<string, string> = {
    io: 'Investigation Officer',
    sho: 'SHO review',
    co: 'CO review',
    advocate: 'Prosecution scrutiny',
    judge: 'Judicial Officer',
    order: 'Court order received',
    closed: 'Closed',
  }
  return (
    <section className="panel mb-4">
      <div className="panel-heading">
        <div>
          <small>WHERE IS THIS FILE NOW?</small>
          <h3>{labels[location]}</h3>
        </div>
        <span className="status success">{record.id}</span>
      </div>
      <div className="workspace-form">
        <p className="form-note">
          Citizen → IO → SHO → CO where required → Prosecution → Court → IO / SHO / Citizen →
          Closure. Officers must verify this flow against applicable UP Police rules and court
          directions.
        </p>
        {record.orderText && <p>{record.orderText}</p>}
        {((location === role && ['co', 'advocate', 'judge'].includes(role)) ||
          (location === 'order' && role === 'io')) && (
          <form
            className="workspace-form"
            onSubmit={async (e) => {
              e.preventDefault()
              await act(record.id, role, { type: 'flow', decision: 'advance', note })
            }}
          >
            <label>
              Review / order / closure note
              <textarea
                required
                minLength={10}
                maxLength={5000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button className="primary-button">
                {role === 'judge'
                  ? 'Record court order'
                  : role === 'io'
                    ? 'Close after order compliance'
                    : 'Approve and forward'}
              </button>
              {role !== 'io' && (
                <button
                  type="button"
                  className="outline-button"
                  onClick={async () => {
                    await act(record.id, role, { type: 'flow', decision: 'return', note })
                  }}
                >
                  Return to IO
                </button>
              )}
            </div>
          </form>
        )}
        {role === 'citizen' && (
          <form
            className="workspace-form"
            onSubmit={async (e) => {
              e.preventDefault()
              await act(record.id, role, { type: 'grievance', text: note })
            }}
          >
            <label>
              Report delay or missing updates
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button className="primary-button">Send grievance to SHO</button>
          </form>
        )}
      </div>
    </section>
  )
}
