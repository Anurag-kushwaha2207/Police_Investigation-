'use client'
import { useState } from 'react'
import { useWorkspace, download } from './Workspace'
import { visibleCases, type CaseRecord } from './case-model'

const days = (date: string) => Math.ceil((Date.parse(date) - Date.now()) / 86400000)
const age = (record: CaseRecord) =>
  Math.max(
    0,
    Math.floor(
      (Date.now() - Date.parse(record.audit.at(-1)?.at || new Date().toISOString())) / 86400000,
    ),
  )
export function StationRegister({ open }: { open: (id: string) => void }) {
  const { cases, officers, search } = useWorkspace()
  const [io, setIO] = useState('')
  const [stage, setStage] = useState('')
  const [exception, setException] = useState('')
  const records = visibleCases(cases, 'sho').filter((record) => !record.archived)
  const rows = records.filter(
    (record) =>
      (!io || record.assignedIO === io) &&
      (!stage || record.stage === stage) &&
      (!exception ||
        (exception === 'delayed' && days(record.deadline) < 0) ||
        (exception === 'lab' && record.evidence !== 'Not requested' && record.labProgress < 100)) &&
      `${record.title} ${record.fir} ${record.citizen.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <small>STATION CASE REGISTER</small>
          <h3>Cases and investigation ownership</h3>
        </div>
      </div>
      <div className="workspace-form">
        <div className="stage-row">
          <label>
            Investigating officer
            <select value={io} onChange={(e) => setIO(e.target.value)}>
              <option value="">All IOs</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All stages</option>
              {[...new Set(records.map((record) => record.stage))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Exception
            <select value={exception} onChange={(e) => setException(e.target.value)}>
              <option value="">All cases</option>
              <option value="delayed">Delayed</option>
              <option value="lab">Lab pending</option>
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="border-b border-slate-100 text-slate-400">
            <tr>
              {['Case', 'Assigned IO', 'Stage', 'Priority', 'Days left'].map((value) => (
                <th className="p-4 font-medium" key={value}>
                  {value}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr key={record.id} className="border-b border-slate-100">
                <td className="p-4">
                  <button className="case-context-link" onClick={() => open(record.id)}>
                    {record.fir} · {record.title}
                  </button>
                </td>
                <td className="p-4">
                  {officers.find((officer) => officer.id === record.assignedIO)?.name ||
                    'Unassigned'}
                </td>
                <td className="p-4">{record.stage}</td>
                <td className="p-4">
                  <span className={`status ${record.priority === 'High' ? 'danger' : 'success'}`}>
                    {record.priority}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`status ${days(record.deadline) < 0 ? 'danger' : days(record.deadline) <= 7 ? 'warning' : 'success'}`}
                  >
                    {days(record.deadline) < 0
                      ? `${-days(record.deadline)} overdue`
                      : `${days(record.deadline)} left`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="padded-note form-note">No cases match these filters.</p>}
      </div>
    </section>
  )
}
export function StationOperations({ page, open }: { page: string; open: (id: string) => void }) {
  const { cases, officers, act } = useWorkspace()
  const records = visibleCases(cases, 'sho').filter((record) => !record.archived)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [period, setPeriod] = useState('30')
  const filtered = records.filter((record) => age(record) <= Number(period))
  const reportCSV = () =>
    download(
      'station-review.csv',
      [
        ['Case', 'IO', 'Stage', 'Priority', 'Days left'].join(','),
        ...filtered.map((record) =>
          [
            record.id,
            officers.find((officer) => officer.id === record.assignedIO)?.name || 'Unassigned',
            record.stage,
            record.priority,
            days(record.deadline),
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(','),
        ),
      ].join('\n'),
      'text/csv',
    )
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <small>STATION SUPERVISION</small>
          <h3>{page}</h3>
        </div>
        {page === 'Reports' && (
          <div className="button-row">
            <select
              aria-label="Report period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
            <button onClick={reportCSV}>Export CSV</button>
            <button onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        )}
      </div>
      {page === 'Reports'
        ? officers.map((officer) => (
            <div className="history-row" key={officer.id}>
              <span>
                <strong>{officer.name}</strong>
                <small>
                  {filtered.filter((record) => record.assignedIO === officer.id).length} assigned in
                  selected period ·{' '}
                  {
                    filtered.filter(
                      (record) => record.assignedIO === officer.id && days(record.deadline) < 0,
                    ).length
                  }{' '}
                  overdue
                </small>
              </span>
            </div>
          ))
        : records.map((record) => (
            <div key={record.id} className="workspace-form">
              <button className="case-context-link" onClick={() => open(record.id)}>
                {record.fir} · {record.title} ›
              </button>
              {page === 'Citizen Grievances' && (
                <>
                  <p className="form-note">
                    Victim update:{' '}
                    {record.lastVictimUpdate
                      ? `last sent ${new Date(record.lastVictimUpdate).toLocaleDateString('en-IN')}`
                      : 'no update recorded'}{' '}
                    · {Math.max(0, 90 - age(record))} days to 90-day checkpoint
                  </p>
                  {(record.grievances || []).map((item, index) => (
                    <p key={index}>
                      {item.text} · {item.resolved ? 'Resolved' : 'Pending'} ·{' '}
                      {new Date(item.at).toLocaleDateString('en-IN')}
                    </p>
                  ))}
                </>
              )}
              {page === 'Station Compliance' && (
                <>
                  {[
                    'Search and seizure video-recording verified',
                    'Forensic expert attendance verified for applicable serious offence',
                    'Victim progress update verified',
                  ].map((step) => (
                    <label key={step} className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={record.compliance?.includes(step) || false}
                        disabled={record.compliance?.includes(step)}
                        onChange={async () => {
                          await act(record.id, 'sho', {
                            type: 'supervise',
                            task: 'compliance',
                            note: step,
                          })
                        }}
                      />
                      {step}
                    </label>
                  ))}
                  <p className="form-note">
                    Supervisory attestations only; the underlying IO evidence is not edited.
                  </p>
                </>
              )}
              {page === 'Evidence & Process' && (
                <p className="form-note">
                  Malkhana exhibits recorded: {record.exhibitsHeld ?? 'not recorded'} · Pending
                  summons: {record.summonsPending ?? 'not recorded'} · Pending warrants:{' '}
                  {record.warrantsPending ?? 'not recorded'}. Forensic status: {record.labStage}.
                </p>
              )}
              {(page === 'Citizen Grievances' || page === 'Deadlines and Alerts') && (
                <>
                  <label>
                    Supervisory note
                    <textarea
                      minLength={10}
                      value={notes[record.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [record.id]: e.target.value })}
                    />
                  </label>
                  <div className="button-row">
                    <button
                      className="primary-button"
                      onClick={async () => {
                        await act(record.id, 'sho', {
                          type: 'supervise',
                          task: page === 'Citizen Grievances' ? 'victimUpdate' : 'escalate',
                          note: notes[record.id] || '',
                        })
                      }}
                    >
                      {page === 'Citizen Grievances'
                        ? 'Record victim update'
                        : 'Escalate to CO (7+ days overdue)'}
                    </button>
                    {page === 'Citizen Grievances' && (
                      <button
                        className="outline-button"
                        onClick={async () => {
                          await act(record.id, 'sho', {
                            type: 'supervise',
                            task: 'resolveGrievances',
                            note: notes[record.id] || '',
                          })
                        }}
                      >
                        Resolve grievance
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
      {!records.length && <p className="padded-note form-note">No station records yet.</p>}
    </section>
  )
}
