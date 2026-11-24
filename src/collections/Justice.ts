import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'
import type { CaseRecord, CaseAction } from '@/components/nyayasetu/case-model'
import { updateCase } from '@/components/nyayasetu/case-model'

const admin: Access = ({ req }) => req.user?.collection === 'admins'
const adminField: FieldAccess = ({ req }) => req.user?.collection === 'admins'
type Identity = { id: string; collection: string; role?: string; station?: string; name?: string }
const scope: Access = ({ req }) => {
  const user = req.user as Identity | null
  if (user?.collection === 'admins') return true
  if (user?.collection !== 'users') return false
  if (['sho', 'co', 'sp'].includes(user.role || '') && !user.station) return false
  switch (user.role) {
    case 'sho':
      return { station: { equals: user.station } } as Where
    case 'io':
      return { assignedOfficer: { equals: user.id } } as Where
    case 'co':
    case 'sp':
      return { station: { equals: user.station } } as Where
    case 'citizen':
      return { citizen: { equals: user.id } } as Where
    default:
      return { participants: { contains: user.id } } as Where
  }
}
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'name', group: 'NyayaSetu' },
  access: {
    admin: () => false,
    create: ({ req }) => req.user?.collection === 'admins' || !req.user,
    read: ({ req }) => {
      const user = req.user as Identity | null
      if (user?.collection === 'admins') return true
      if (user?.collection !== 'users') return false
      if (user.role === 'sho')
        return {
          or: [
            { id: { equals: user.id } },
            { and: [{ station: { equals: user.station } }, { role: { equals: 'io' } }] },
          ],
        } as Where
      return { id: { equals: user.id } } as Where
    },
    update: ({ req }) =>
      req.user?.collection === 'admins'
        ? true
        : req.user?.collection === 'users'
          ? { id: { equals: req.user.id } }
          : false,
    delete: admin,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user?.collection !== 'admins') {
          data.role = 'citizen'
          data.station = 'Hazratganj Police Station'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'citizen',
      saveToJWT: true,
      options: ['io', 'sho', 'co', 'sp', 'citizen', 'lab', 'advocate', 'judge'],
      access: { create: adminField, update: adminField },
    },
    {
      name: 'station',
      type: 'text',
      defaultValue: 'Hazratganj Police Station',
      saveToJWT: true,
      access: { create: adminField, update: adminField },
    },
    {
      name: 'availability',
      type: 'select',
      defaultValue: 'On duty',
      options: ['On duty', 'Leave', 'Court duty', 'VIP duty', 'Transferred'],
      access: { create: adminField, update: adminField },
    },
    { name: 'language', type: 'select', options: ['English'], defaultValue: 'English' },
    { name: 'notificationsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'signature', type: 'text' },
  ],
}
const serverField = { create: adminField, update: adminField }
const noDelete: Access = () => false
export const CaseFiles: CollectionConfig = {
  slug: 'case-files',
  admin: { useAsTitle: 'reference', group: 'NyayaSetu' },
  access: {
    create: ({ req }) =>
      (req.user?.collection === 'users' && req.user.role === 'citizen') ||
      req.user?.collection === 'admins',
    read: scope,
    update: scope,
    delete: noDelete,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc, operation }) => {
        const actor = req.user as Identity | null
        if (actor?.collection === 'admins') return data
        if (actor?.collection !== 'users') throw new Error('Sign in required')
        if (operation === 'create') {
          const title = typeof data.title === 'string' ? data.title.trim() : ''
          const summary = typeof data.summary === 'string' ? data.summary.trim() : ''
          if (
            actor.role !== 'citizen' ||
            title.length < 5 ||
            title.length > 120 ||
            summary.length < 15 ||
            summary.length > 2000
          )
            throw new Error('Valid subject and description are required.')
          const at = new Date().toISOString(),
            id = `NS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
          const state: CaseRecord = {
            id,
            title,
            summary,
            category:
              typeof data.category === 'string' &&
              ['Cybercrime', 'Identity theft', 'Lost property', 'Other'].includes(data.category)
                ? data.category
                : 'Other',
            fir: 'Pending registration',
            ack: id,
            evidence: 'Not requested',
            station: actor.station!,
            citizen: {
              id: actor.id,
              name: actor.name || 'Citizen',
              initials: (actor.name || 'C').slice(0, 2),
              email: '',
              phone: '',
            },
            roles: ['citizen', 'sho', 'io', 'co', 'sp'],
            stage: 'Initial review',
            progress: 0,
            labProgress: 0,
            labStage: 'Not requested',
            fileLocation: 'io',
            coRequired: false,
            priority: 'Normal',
            deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            archived: false,
            documents: [],
            requests: [],
            messages: [],
            requiredSteps: [],
            identifiers: [],
            approvals: [],
            audit: [
              {
                id: crypto.randomUUID(),
                at,
                title: 'Citizen complaint received; awaiting IO assignment',
                actor: 'citizen',
                public: true,
              },
            ],
            notifications: [
              {
                id: crypto.randomUUID(),
                at,
                title: 'New citizen complaint awaiting assignment',
                to: ['sho'],
              },
            ],
          }
          return {
            title,
            summary,
            category: state.category,
            reference: id,
            station: actor.station,
            citizen: actor.id,
            file: state,
          }
        }
        const command = data.command as CaseAction | undefined
        if (!command || typeof command.type !== 'string')
          throw new Error('Use a supported workflow action.')
        const allowed = [
          'flow',
          'grievance',
          'supervise',
          'assign',
          'submitApproval',
          'reviewApproval',
          'progress',
          'lab',
          'message',
          'request',
          'archive',
          'restore',
        ]
        if (!allowed.includes(command.type)) throw new Error('This operation is not supported yet.')
        if (actor.role === 'citizen' && !['message', 'grievance'].includes(command.type))
          throw new Error('This action is restricted to authorized staff.')
        if (
          command.type === 'message' &&
          (typeof command.text !== 'string' || command.text.length > 3000)
        )
          throw new Error('Message is invalid.')
        if (
          command.type === 'reviewApproval' &&
          (!['Approved', 'Returned'].includes(command.decision) ||
            typeof command.remarks !== 'string' ||
            command.remarks.length > 2000)
        )
          throw new Error('Review is invalid.')
        if (command.type === 'assign') {
          const officer = await req.payload.findByID({
            collection: 'users',
            id: command.officerId,
            overrideAccess: true,
            req,
          })
          if (
            officer.role !== 'io' ||
            officer.station !== actor.station ||
            ['Leave', 'Transferred'].includes(officer.availability || '')
          )
            throw new Error('Choose an available IO from this station.')
          if (
            originalDoc.assignedOfficer &&
            (!('reason' in command) ||
              typeof command.reason !== 'string' ||
              command.reason.trim().length < 10)
          )
            throw new Error('Reassignment needs a reason of at least 10 characters.')
          data.assignedOfficer = officer.id
        }
        // User-facing read masks must never become the source of a persisted update.
        const stored = await req.payload.findByID({
          collection: 'case-files',
          id: originalDoc.id,
          overrideAccess: true,
          req: { ...req, context: { ...req.context, justiceInternal: true } },
          depth: 0,
        })
        const file = stored.file as unknown as CaseRecord
        const actorFile = {
          ...file,
          roles: [...new Set([...file.roles, actor.role as Parameters<typeof updateCase>[1]])],
          assignedIO: actor.role === 'io' ? 'io-arjun' : file.assignedIO,
        }
        const roster =
          command.type === 'assign'
            ? [{ id: command.officerId, name: 'Assigned station officer', capacity: 4 }]
            : undefined
        const next = updateCase(
          actorFile,
          actor.role as Parameters<typeof updateCase>[1],
          command,
          new Date().toISOString(),
          crypto.randomUUID(),
          roster,
        )
        if (actor.role === 'io') next.assignedIO = file.assignedIO
        next.audit[0].title = `${actor.name || actor.id}: ${next.audit[0].title}`
        return {
          ...originalDoc,
          file: next,
          ...(data.assignedOfficer ? { assignedOfficer: data.assignedOfficer } : {}),
          command: null,
        }
      },
    ],
    afterRead: [
      ({ doc, req }) => {
        if (req.user?.collection === 'admins' || req.context.justiceInternal) return doc
        const role = (req.user as Identity | null)?.role
        const file = doc.file as CaseRecord
        if (!file) return doc
        const safe = structuredClone(file)
        if (role)
          safe.roles = [...new Set([...safe.roles, role as Parameters<typeof updateCase>[1]])]
        safe.messages = safe.messages.filter((item) => item.from === role || item.to === role)
        safe.documents = safe.documents.filter((item) => item.audience.includes(role as never))
        safe.requests = safe.requests.filter((item) => item.from === role || item.to === role)
        safe.notifications = safe.notifications?.filter((item) => item.to.includes(role as never))
        if (role === 'citizen') {
          safe.audit = safe.audit.filter((item) => item.public)
          safe.approvals = []
          safe.identifiers = []
        }
        if (role === 'lab') {
          safe.citizen = { id: '', name: 'Restricted', initials: '', phone: '', email: '' }
          safe.summary = 'Exhibit examination only'
          safe.approvals = []
          safe.messages = []
          safe.audit = safe.audit.filter((item) => item.actor === 'lab')
          safe.identifiers = []
        }
        if (role === 'co' || role === 'sp') {
          safe.citizen = { id: '', name: 'Restricted', initials: '', phone: '', email: '' }
          safe.documents = []
          safe.messages = []
        }
        doc.file = safe
        return doc
      },
    ],
  },
  fields: [
    { name: 'reference', type: 'text', index: true, access: serverField },
    { name: 'title', type: 'text' },
    { name: 'summary', type: 'textarea' },
    { name: 'category', type: 'text' },
    { name: 'station', type: 'text', index: true, access: serverField },
    { name: 'citizen', type: 'relationship', relationTo: 'users', access: serverField },
    { name: 'assignedOfficer', type: 'relationship', relationTo: 'users', access: serverField },
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      access: serverField,
    },
    { name: 'file', type: 'json', access: serverField },
    { name: 'command', type: 'json', access: { read: () => false } },
  ],
}
