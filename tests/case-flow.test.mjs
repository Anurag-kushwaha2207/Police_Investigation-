import { test } from 'node:test'
import assert from 'node:assert/strict'
import { updateCase } from '../src/components/nyayasetu/case-model.ts'

const record = {
  id: 'TEST-CASE', fir: 'Test reference', ack: 'TEST-ACK', evidence: 'Not requested',
  title: 'Synthetic test case', citizen: { id: 'test-user', name: 'Test Citizen', initials: 'TC', phone: '', email: '' },
  station: 'Hazratganj Police Station', summary: 'For automated tests only', category: 'Other',
  roles: ['io', 'sho', 'co', 'advocate', 'judge', 'citizen', 'lab'], assignedIO: 'io-arjun',
  stage: 'Evidence review', progress: 60, labProgress: 0, labStage: 'Not requested',
  priority: 'Normal', deadline: '2030-01-01', archived: false,
  documents: [], requests: [], messages: [], audit: [], approvals: [],
}
let sequence = 0
const apply = (file, role, action) => updateCase(file, role, action, '2026-11-24T10:00:00Z', `event-${++sequence}`)

test('full report review chain reaches court order and IO closure', () => {
  let file = apply(record, 'io', { type: 'submitApproval', kind: 'Final report', draft: 'Synthetic final report draft for review only.' })
  assert.equal(file.fileLocation, 'sho')
  file = apply(file, 'sho', { type: 'reviewApproval', approvalId: file.approvals[0].id, decision: 'Approved', remarks: 'Reviewed for prosecution scrutiny.' })
  assert.equal(file.fileLocation, 'advocate')
  file = apply(file, 'advocate', { type: 'flow', decision: 'advance', note: 'Prosecution scrutiny complete.' })
  assert.equal(file.fileLocation, 'judge')
  file = apply(file, 'judge', { type: 'flow', decision: 'advance', note: 'Synthetic court order recorded for test.' })
  assert.deepEqual(file.notifications[0].to, ['io', 'sho', 'citizen'])
  file = apply(file, 'io', { type: 'flow', decision: 'advance', note: 'Order compliance verified for closure.' })
  assert.equal(file.fileLocation, 'closed')
  assert.equal(file.progress, 100)
  assert.equal(file.audit.length, 5)
  assert.equal(record.progress, 60)
})
test('CO-required files cannot skip the CO step', () => {
  let file = apply({ ...record, coRequired: true }, 'io', { type: 'submitApproval', kind: 'Chargesheet', draft: 'Synthetic chargesheet draft requiring review.' })
  file = apply(file, 'sho', { type: 'reviewApproval', approvalId: file.approvals[0].id, decision: 'Approved', remarks: 'Forward to the circle officer.' })
  assert.equal(file.fileLocation, 'co')
  assert.throws(() => apply(file, 'judge', { type: 'flow', decision: 'advance', note: 'Invalid attempt to skip review.' }))
  assert.equal(apply(file, 'co', { type: 'flow', decision: 'advance', note: 'Circle review completed.' }).fileLocation, 'advocate')
})
test('SHO evidence is read-only; returns require remarks', () => {
  assert.throws(() => apply(record, 'sho', { type: 'progress', stage: 'Completed', progress: 100 }))
  const submitted = apply(record, 'io', { type: 'submitApproval', kind: 'Telecom letter', draft: 'Synthetic draft telecom information request.' })
  assert.throws(() => apply(submitted, 'sho', { type: 'reviewApproval', approvalId: submitted.approvals[0].id, decision: 'Returned', remarks: '' }))
  const returned = apply(submitted, 'sho', { type: 'reviewApproval', approvalId: submitted.approvals[0].id, decision: 'Returned', remarks: 'Verify the subject reference.' })
  assert.equal(returned.approvals[0].status, 'Returned')
  assert.ok(!returned.notifications[0].to.includes('citizen'))
})
