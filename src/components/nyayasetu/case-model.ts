export type Role = 'io' | 'sho' | 'co' | 'sp' | 'advocate' | 'judge' | 'citizen' | 'lab'
export const roleLabels: Record<Role, string> = {
  io: 'Investigation Officer',
  sho: 'Station House Officer',
  co: 'Circle Officer',
  sp: 'Superintendent of Police',
  advocate: 'Advocate',
  judge: 'Judicial Officer',
  citizen: 'Citizen',
  lab: 'Forensic Laboratory',
}
export type Message = { id: string; from: Role; to: Role; text: string; at: string }
export type CaseDocument = {
  id: string
  name: string
  content: string
  url?: string
  type?: string
  from: Role
  audience: Role[]
  at: string
}
export type DocumentRequest = {
  id: string
  title: string
  to: Role
  from: Role
  due: string
  note: string
  status: 'Pending' | 'Submitted'
  documentId?: string
}
export type AuditEntry = { id: string; title: string; actor: Role; at: string; public: boolean }
export const SHO_STATION = 'Hazratganj Police Station'
export const officers = [
  { id: 'io-arjun', name: 'Arjun Singh', capacity: 3 },
  { id: 'io-yadav', name: 'P. Yadav', capacity: 4 },
  { id: 'io-khan', name: 'S. Khan', capacity: 4 },
]
export type Approval = {
  id: string
  kind: string
  status: 'Pending' | 'Approved' | 'Returned'
  remarks: string
  at: string
  draft?: string
}
export type CaseRecord = {
  fileLocation?: 'io' | 'sho' | 'co' | 'advocate' | 'judge' | 'order' | 'closed'
  coRequired?: boolean
  orderText?: string
  lastVictimUpdate?: string
  compliance?: string[]
  grievances?: { text: string; at: string; resolved: boolean }[]
  courtHearing?: string
  bankDue?: string
  summonsPending?: number
  warrantsPending?: number
  exhibitsHeld?: number
  assignedIO?: string
  requiredSteps?: string[]
  identifiers?: string[]
  approvals?: Approval[]
  notifications?: { id: string; title: string; to: Role[]; at: string }[]
  id: string
  fir: string
  ack: string
  evidence: string
  title: string
  citizen: { name: string; initials: string; id: string; email: string; phone: string }
  station: string
  summary: string
  category: string
  roles: Role[]
  stage: string
  progress: number
  labProgress: number
  labStage: string
  priority: 'High' | 'Normal'
  deadline: string
  archived: boolean
  archiveReason?: string
  documents: CaseDocument[]
  requests: DocumentRequest[]
  messages: Message[]
  audit: AuditEntry[]
}
const publicRoles: Role[] = ['io', 'sho', 'co', 'sp', 'advocate', 'judge', 'citizen']
export const canEditProgress = (role: Role) => role === 'io'
export const canArchive = (role: Role) => role === 'sho' || role === 'sp'
export const visibleCases = (cases: CaseRecord[], role: Role) =>
  cases.filter(
    (record) =>
      record.roles.includes(role) && (role !== 'sho' || record.station === SHO_STATION) && true,
  )
export const visibleMessages = (record: CaseRecord, role: Role) =>
  record.messages.filter((message) => message.from === role || message.to === role)
export const visibleDocuments = (record: CaseRecord, role: Role) =>
  record.documents.filter((document) => document.audience.includes(role))
export const visibleRequests = (record: CaseRecord, role: Role) =>
  record.requests.filter((request) => request.from === role || request.to === role)
export const visibleAudit = (record: CaseRecord, role: Role) =>
  record.audit.filter((event) => role !== 'citizen' || event.public)
export const messageTargets = (record: CaseRecord, role: Role): Role[] =>
  record.roles.filter(
    (other) =>
      other !== role &&
      (role === 'citizen' ? other === 'io' : role === 'lab' ? ['io', 'sho'].includes(other) : true),
  )
export type CaseAction =
  | { type: 'flow'; decision: 'advance' | 'return'; note: string }
  | { type: 'grievance'; text: string }
  | {
      type: 'supervise'
      task: 'escalate' | 'victimUpdate' | 'compliance' | 'resolveGrievances'
      note: string
    }
  | { type: 'progress'; stage: string; progress: number }
  | { type: 'lab'; stage: string; progress: number }
  | { type: 'message'; to: Role; text: string }
  | { type: 'request'; request: DocumentRequest }
  | { type: 'upload'; document: CaseDocument; requestId?: string }
  | { type: 'archive'; reason: string }
  | { type: 'restore' }
  | { type: 'assign'; officerId: string; reason?: string }
  | { type: 'submitApproval'; kind: string; draft?: string }
  | {
      type: 'reviewApproval'
      approvalId: string
      decision: 'Approved' | 'Returned'
      remarks: string
    }

// Pure transition rules; Payload enforces identity, station eligibility and persistence.
export function updateCase(
  record: CaseRecord,
  role: Role,
  action: CaseAction,
  at: string,
  eventId: string,
  roster = officers,
): CaseRecord {
  if (role === 'sho' && record.station !== SHO_STATION)
    throw new Error('Outside your station jurisdiction.')
  if (role === 'io' && record.assignedIO !== 'io-arjun')
    throw new Error('This case is not assigned to you.')
  if (role === 'sho' && ['progress', 'lab', 'upload'].includes(action.type))
    throw new Error('SHO case evidence is read-only.')
  if (!record.roles.includes(role)) throw new Error('This case is not assigned to your workspace.')
  if (record.archived && action.type !== 'restore')
    throw new Error('Restore this archived record before making changes.')
  let next = { ...record }
  let title = ''
  let isPublic = false
  let recipients: Role[] = []
  switch (action.type) {
    case 'flow': {
      if (
        typeof action.note !== 'string' ||
        action.note.trim().length < 10 ||
        action.note.length > 5000
      )
        throw new Error('A review note of 10–5,000 characters is required.')
      const location = record.fileLocation || 'io'
      if (
        !(['co', 'advocate', 'judge', 'io'] as Role[]).includes(role) ||
        (location !== role && !(location === 'order' && role === 'io'))
      )
        throw new Error('The file is not with your role for this action.')
      if (role === 'io' && location !== 'order')
        throw new Error('Submit a chargesheet or final-report draft through Approvals.')
      if (action.decision === 'return') {
        next.fileLocation = 'io'
        recipients = ['io', 'sho']
      } else if (role === 'co') {
        next.fileLocation = 'advocate'
        recipients = ['advocate', 'sho']
      } else if (role === 'advocate') {
        next.fileLocation = 'judge'
        recipients = ['judge', 'io', 'sho']
      } else if (role === 'judge') {
        next.fileLocation = 'order'
        next.orderText = action.note
        recipients = ['io', 'sho', 'citizen']
        isPublic = true
      } else {
        next.fileLocation = 'closed'
        next.stage = 'Completed'
        next.progress = 100
        recipients = ['sho', 'citizen']
        isPublic = true
      }
      title = `File ${action.decision === 'return' ? 'returned to IO' : 'moved to ' + next.fileLocation}: ${action.note.trim()}`
      break
    }
    case 'grievance':
      if (
        role !== 'citizen' ||
        typeof action.text !== 'string' ||
        action.text.trim().length < 10 ||
        action.text.length > 2000
      )
        throw new Error('Citizen grievance must contain 10–2,000 characters.')
      next.grievances = [
        ...(record.grievances || []),
        { text: action.text.trim(), at, resolved: false },
      ]
      title = `Citizen delay grievance: ${action.text.trim()}`
      recipients = ['sho', 'io']
      isPublic = true
      break
    case 'supervise':
      if (
        !['sho', 'io'].includes(role) ||
        typeof action.note !== 'string' ||
        !action.note.trim() ||
        action.note.length > 2000
      )
        throw new Error('A supervisory note is required.')
      if (action.task === 'victimUpdate') {
        next.lastVictimUpdate = at
        isPublic = true
        recipients = ['citizen', 'sho']
      } else if (action.task === 'escalate') {
        if (role !== 'sho' || Date.parse(record.deadline) >= Date.parse(at) - 7 * 86400000)
          throw new Error('CO escalation is available after seven overdue days.')
        recipients = ['co', 'sho']
      } else if (action.task === 'resolveGrievances') {
        if (role !== 'sho') throw new Error('SHO review required.')
        next.grievances = (record.grievances || []).map((item) => ({ ...item, resolved: true }))
        recipients = ['citizen', 'io']
        isPublic = true
      } else if (action.task === 'compliance') {
        if (role !== 'sho') throw new Error('SHO attestation required.')
        next.compliance = [...new Set([...(record.compliance || []), action.note.trim()])]
        recipients = ['io', 'co']
      } else throw new Error('Unsupported supervisory action.')
      title = `${action.task}: ${action.note.trim()}`
      break

    case 'assign':
      if (role !== 'sho' || !roster.some((officer) => officer.id === action.officerId))
        throw new Error('Only the station SHO may assign to a station officer.')
      next.assignedIO = action.officerId
      title = `Assigned to ${roster.find((officer) => officer.id === action.officerId)!.name}`
      recipients = ['sho', 'io']
      break
    case 'submitApproval':
      if (
        role !== 'io' ||
        ![
          'Bank freeze letter',
          'Telecom letter',
          'Platform notice',
          'Lab forwarding',
          'Chargesheet',
          'Final report',
        ].includes(action.kind)
      )
        throw new Error('Invalid approval request.')
      if (
        typeof action.draft !== 'string' ||
        action.draft.trim().length < 20 ||
        action.draft.length > 20000
      )
        throw new Error('Provide a draft of 20–20,000 characters for review.')
      if (record.approvals?.some((item) => item.kind === action.kind && item.status === 'Pending'))
        throw new Error('A matching request is already pending.')
      next.approvals = [
        ...(record.approvals ?? []),
        { id: eventId, kind: action.kind, status: 'Pending', remarks: '', at, draft: action.draft },
      ]
      if (['Chargesheet', 'Final report'].includes(action.kind)) next.fileLocation = 'sho'
      title = `${action.kind} submitted for SHO approval`
      recipients = ['sho']
      break
    case 'reviewApproval': {
      const approval = record.approvals?.find((item) => item.id === action.approvalId)
      if (role !== 'sho' || !approval || approval.status !== 'Pending')
        throw new Error('Pending station approval not found.')
      if (!action.remarks.trim()) throw new Error('Review remarks are required.')
      next.approvals = record.approvals!.map((item) =>
        item.id === approval.id
          ? { ...item, status: action.decision, remarks: action.remarks.trim(), at }
          : item,
      )
      if (['Chargesheet', 'Final report'].includes(approval.kind))
        next.fileLocation =
          action.decision === 'Returned' ? 'io' : record.coRequired ? 'co' : 'advocate'
      title = `${approval.kind} ${action.decision.toLowerCase()}: ${action.remarks.trim()}`
      recipients = [
        'sho',
        'io',
        ...(next.fileLocation === 'co'
          ? ['co' as Role]
          : next.fileLocation === 'advocate'
            ? ['advocate' as Role]
            : []),
      ]
      break
    }
    case 'progress':
      if (!canEditProgress(role))
        throw new Error('Only the assigned IO or SHO can update investigation progress.')
      if (
        !action.stage.trim() ||
        !Number.isFinite(action.progress) ||
        action.progress < 0 ||
        action.progress > 100
      )
        throw new Error('Enter a valid stage and progress from 0 to 100.')
      next = { ...next, stage: action.stage, progress: action.progress }
      title = `Investigation: ${action.stage} · ${action.progress}%`
      isPublic = true
      break
    case 'lab':
      if (role !== 'lab')
        throw new Error('Only the assigned forensic laboratory can update examination progress.')
      if (
        !action.stage.trim() ||
        !Number.isFinite(action.progress) ||
        action.progress < 0 ||
        action.progress > 100
      )
        throw new Error('Enter valid examination progress.')
      next = { ...next, labStage: action.stage, labProgress: action.progress }
      title = `Forensic examination: ${action.stage} · ${action.progress}%`
      break
    case 'message':
      if (!messageTargets(record, role).includes(action.to))
        throw new Error('Recipient is not an authorized case participant.')
      if (!action.text.trim()) throw new Error('Write a message first.')
      next.messages = [
        ...record.messages,
        { id: eventId, from: role, to: action.to, text: action.text.trim(), at },
      ]
      title = `Message sent to ${roleLabels[action.to]}`
      isPublic = role === 'citizen' || action.to === 'citizen'
      break
    case 'request':
      if (role === 'citizen' || !messageTargets(record, role).includes(action.request.to))
        throw new Error('You cannot request a document from this participant.')
      if (!action.request.title.trim() || !action.request.due)
        throw new Error('Document name and due date are required.')
      next.requests = [...record.requests, { ...action.request, from: role, status: 'Pending' }]
      title = `Document requested: ${action.request.title} from ${roleLabels[action.request.to]}`
      isPublic = action.request.to === 'citizen'
      break
    case 'upload': {
      const request = record.requests.find((item) => item.id === action.requestId)
      if (action.requestId && (!request || request.to !== role || request.status !== 'Pending'))
        throw new Error('This request is not pending with your workspace.')
      const audience = request
        ? [...new Set([role, request.from])]
        : role === 'citizen'
          ? publicRoles
          : role === 'lab'
            ? record.roles.filter(
                (participant) => participant !== 'citizen' && participant !== 'advocate',
              )
            : record.roles
      next.documents = [...record.documents, { ...action.document, audience, from: role, at }]
      next.requests = record.requests.map((item) =>
        item.id === action.requestId
          ? { ...item, status: 'Submitted', documentId: action.document.id }
          : item,
      )
      title = `Document uploaded: ${action.document.name}`
      isPublic = audience.includes('citizen')
      break
    }
    case 'archive':
      if (!canArchive(role)) throw new Error('Only SHO or SP can archive a case.')
      if (action.reason.trim().length < 10)
        throw new Error('Please provide an archive reason of at least 10 characters.')
      next.archived = true
      next.archiveReason = action.reason.trim()
      title = `Case archived: ${action.reason.trim()}`
      isPublic = true
      break
    case 'restore':
      if (!canArchive(role)) throw new Error('Only SHO or SP can restore a case.')
      next.archived = false
      next.archiveReason = undefined
      title = 'Case restored to active work'
      isPublic = true
      break
  }
  if (!recipients.length)
    recipients =
      action.type === 'message'
        ? [action.to]
        : action.type === 'request'
          ? [action.request.to]
          : action.type === 'upload'
            ? ['io']
            : isPublic
              ? ['citizen', 'sho', 'io']
              : ['sho', 'io']
  next.notifications = [{ id: eventId, title, to: recipients, at }, ...(record.notifications ?? [])]
  next.audit = [{ id: eventId, actor: role, at, title, public: isPublic }, ...record.audit]
  return next
}
