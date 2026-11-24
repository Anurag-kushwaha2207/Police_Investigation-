import { StationRegister, StationOperations } from './StationTools'
import { useState } from 'react'
import {
  ApprovalPanel,
  CaseList,
  CaseWorkspace,
  download,
  useWorkspace,
  WorkspacePage,
} from './Workspace'
import { officers, SHO_STATION, visibleCases, type CaseRecord } from './case-model'

export function stationMetrics(records: CaseRecord[], now = new Date()) {
  const today = new Date(now.toISOString().slice(0, 10)).getTime()
  const active = records.filter((record) => !record.archived)
  return [
    { label: 'Open cases', value: active.length, page: 'Station Cases', tone: 'blue' },
    {
      label: 'Unassigned FIRs',
      value: active.filter((record) => !record.assignedIO).length,
      page: 'Assignments',
      tone: 'purple',
    },
    {
      label: 'Deadlines in 7 days',
      value: active.filter((record) => {
        const time = Date.parse(record.deadline)
        return time >= today && time < today + 8 * 86400000
      }).length,
      page: 'Deadlines and Alerts',
      tone: 'amber',
    },
    {
      label: 'Delayed cases',
      value: active.filter((record) => Date.parse(record.deadline) < today && record.progress < 100)
        .length,
      page: 'Deadlines and Alerts',
      tone: 'red',
    },
    {
      label: 'Lab pending',
      value: active.filter(
        (record) => record.evidence !== 'Not requested' && record.labProgress < 100,
      ).length,
      page: 'Station Cases',
      tone: 'blue',
    },
    {
      label: 'Missing required steps',
      value: active.filter((record) => record.requiredSteps?.length).length,
      page: 'Deadlines and Alerts',
      tone: 'amber',
    },
  ]
}

export default function ShoDashboard({
  page,
  navigate,
}: {
  page: string
  navigate: (page: string) => void
}) {
  const { cases, act, search, officers } = useWorkspace()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [selection, setSelection] = useState<Record<string, string>>({})
  const records = visibleCases(cases, 'sho')
  const active = records.filter((record) => !record.archived)
  const metrics = stationMetrics(records)
  const open = (id: string) => navigate(`Case:${id}`)
  const match = (record: CaseRecord) =>
    `${record.fir} ${record.title} ${record.citizen.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  const approvals = records.filter((record) => record.approvals?.length && match(record))
  const alerts = active.filter(
    (record) =>
      Date.parse(record.deadline) < Date.now() + 7 * 86400000 || record.requiredSteps?.length,
  )
  const assignedName = (id?: string) =>
    officers.find((officer) => officer.id === id)?.name ?? 'Unassigned'

  if (page.startsWith('Case:'))
    return (
      <CaseWorkspace
        key={page}
        role="sho"
        caseId={page.slice(5)}
        onBack={() => navigate('Station Cases')}
      />
    )
  if (page === 'Station Cases' || page === 'Case directory') return <StationRegister open={open} />
  if (['Citizen Grievances', 'Station Compliance', 'Evidence & Process', 'Reports'].includes(page))
    return <StationOperations page={page} open={open} />
  if (['Case History'].includes(page)) return <WorkspacePage role="sho" page={page} open={open} />

  return (
    <>
      <section className="welcome-row">
        <div>
          <span className="page-kicker">SHO WORKSPACE · STATION SUPERVISION</span>
          <h1>{page === 'Overview' ? 'Station operations at a glance' : page}</h1>
          <p>{SHO_STATION} · Station-only access · Evidence is read-only</p>
        </div>
        {page === 'Reports' && (
          <button
            className="primary-button"
            onClick={() =>
              download(
                'hazratganj-station-report.json',
                JSON.stringify(
                  {
                    station: SHO_STATION,
                    generated: new Date().toISOString(),
                    metrics,
                    cases: records.map(({ fir, title, stage, progress, assignedIO }) => ({
                      fir,
                      title,
                      stage,
                      progress,
                      officer: assignedName(assignedIO),
                    })),
                  },
                  null,
                  2,
                ),
                'application/json',
              )
            }
          >
            Export station report
          </button>
        )}
      </section>

      {page === 'Overview' && (
        <>
          <section className="insight-banner">
            <span className="insight-icon">SHO</span>
            <div>
              <small>STATION PRIORITY BRIEF</small>
              <p>
                {metrics[1].value} FIRs need assignment. {metrics[3].value} cases are delayed;{' '}
                {metrics[5].value} cases have missing required steps. Review pending IO requests
                before taking supervisory action.
              </p>
            </div>
            <button onClick={() => navigate('Assignments')}>Review assignments ›</button>
          </section>
          <section className="stats-grid">
            {metrics.map((metric) => (
              <button
                className="stat-card sho-metric"
                key={metric.label}
                onClick={() => navigate(metric.page)}
              >
                <div className={`stat-icon ${metric.tone}`} aria-hidden="true">
                  ↗
                </div>
                <div className="stat-value">{metric.value}</div>
                <div className="stat-label">{metric.label}</div>
                <div className={`stat-delta ${metric.tone}`}>View station records ›</div>
              </button>
            ))}
          </section>
          <section className="dashboard-grid">
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <small>LIVE SESSION WORKFLOW</small>
                  <h3>Station case records</h3>
                </div>
                <button onClick={() => navigate('Station Cases')}>View all ›</button>
              </div>
              <CaseList role="sho" open={open} />
            </div>
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <small>NEXT ACTIONS</small>
                  <h3>Supervisory queue</h3>
                </div>
              </div>
              {[
                [
                  'Assignments',
                  `${metrics[1].value} unassigned FIRs`,
                  'Assign new Citizen Services records',
                ],
                [
                  'Approvals',
                  `${records.reduce((count, record) => count + (record.approvals ?? []).filter((item) => item.status === 'Pending').length, 0)} pending approvals`,
                  'Review freeze letters and chargesheets',
                ],
                [
                  'Deadlines and Alerts',
                  `${alerts.length} cases need review`,
                  'Deadlines, lab reports and missing steps',
                ],
              ].map(([target, title, detail]) => (
                <button className="history-row" key={target} onClick={() => navigate(target)}>
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                  <span>›</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {page === 'Assignments' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>CITIZEN SERVICES → STATION → IO</small>
              <h3>FIR assignment register</h3>
              <p>
                New citizen complaints arrive unassigned. Assign to Arjun Singh to preview the
                result in the IO portal.
              </p>
            </div>
          </div>
          {active.filter(match).map((record) => (
            <form
              className="assignment-row"
              key={record.id}
              onSubmit={(event) => {
                event.preventDefault()
                act(record.id, 'sho', {
                  type: 'assign',
                  reason: reasons[record.id],
                  officerId: selection[record.id] ?? record.assignedIO ?? officers[0]?.id ?? '',
                })
              }}
            >
              <button type="button" className="assignment-case" onClick={() => open(record.id)}>
                <strong>
                  {record.fir} · {record.title}
                </strong>
                <small>
                  {record.citizen.name} · {record.ack} · {assignedName(record.assignedIO)}
                </small>
              </button>
              <label>
                <span>Assign investigating officer</span>
                <select
                  aria-label={`Officer for ${record.fir}`}
                  value={selection[record.id] ?? record.assignedIO ?? officers[0]?.id ?? ''}
                  onChange={(event) =>
                    setSelection({ ...selection, [record.id]: event.target.value })
                  }
                >
                  {officers.map((officer) => (
                    <option value={officer.id} key={officer.id}>
                      {officer.name}
                    </option>
                  ))}
                </select>
              </label>
              {record.assignedIO && (
                <label>
                  Handover reason
                  <input
                    required
                    minLength={10}
                    value={reasons[record.id] || ''}
                    onChange={(e) => setReasons({ ...reasons, [record.id]: e.target.value })}
                  />
                </label>
              )}
              <button
                className="primary-button"
                disabled={
                  Boolean(record.assignedIO) &&
                  (!selection[record.id] || selection[record.id] === record.assignedIO)
                }
              >
                {record.assignedIO ? 'Reassign' : 'Assign IO'}
              </button>
            </form>
          ))}
          {!active.length && <p className="padded-note form-note">No FIRs awaiting review.</p>}
        </section>
      )}

      {page === 'Officer Workload' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>STATION OFFICERS</small>
              <h3>Workload & overdue register</h3>
            </div>
          </div>
          {officers.map((officer) => {
            const assigned = active.filter((record) => record.assignedIO === officer.id)
            const overdue = assigned.filter(
              (record) => Date.parse(record.deadline) < Date.now() && record.progress < 100,
            ).length
            const load =
              assigned.length >= officer.capacity
                ? 'High'
                : assigned.length >= officer.capacity / 2
                  ? 'Moderate'
                  : 'Available'
            return (
              <div className="workload-row" key={officer.id}>
                <div>
                  <strong>{officer.name}</strong>
                  <small>Investigating officer · {SHO_STATION}</small>
                </div>
                <span>{assigned.length} cases</span>
                <span>{overdue} overdue</span>
                <span
                  className={`status ${load === 'High' ? 'danger' : load === 'Moderate' ? 'warning' : 'success'}`}
                >
                  {load}
                </span>
                <button onClick={() => navigate('Assignments')}>Manage assignments ›</button>
              </div>
            )
          })}
        </section>
      )}

      {page === 'Approvals' && (
        <>
          {approvals.map((record) => (
            <section key={record.id}>
              <button className="case-context-link" onClick={() => open(record.id)}>
                {record.fir} · {record.title} · {assignedName(record.assignedIO)} ›
              </button>
              <ApprovalPanel record={record} role="sho" />
            </section>
          ))}
          {!approvals.length && (
            <section className="panel padded-note">
              <p className="form-note">
                No approval requests. The assigned IO can submit a freeze letter or chargesheet from
                the case detail page.
              </p>
            </section>
          )}
        </>
      )}

      {page === 'Deadlines and Alerts' && <StationOperations page={page} open={open} />}
      {page === 'Deadlines and Alerts' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>STATION EXCEPTIONS</small>
              <h3>Deadline & procedural alerts</h3>
              <p>Sample workflow dates only—not calculated statutory deadlines.</p>
            </div>
          </div>
          {alerts.filter(match).map((record) => (
            <button className="history-row" key={record.id} onClick={() => open(record.id)}>
              <span>
                <strong>
                  {record.fir} · {record.title}
                </strong>
                <small>
                  Review by {record.deadline} · {assignedName(record.assignedIO)}
                </small>
                <small>
                  {Date.parse(record.deadline) < Date.now()
                    ? 'Overdue review. '
                    : 'Review due within seven days. '}
                  {record.requiredSteps?.length
                    ? `Missing: ${record.requiredSteps.join(', ')}. `
                    : ''}
                  {record.evidence !== 'Not requested' && record.labProgress < 100
                    ? 'Forensic report pending.'
                    : ''}
                </small>
              </span>
              <span className="status danger">Review case ›</span>
            </button>
          ))}
          {!alerts.length && <p className="padded-note form-note">No station alerts.</p>}
        </section>
      )}

      {page === 'Linked Cases' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>PATTERN REVIEW</small>
              <h3>Repeat phones & bank accounts</h3>
              <p>
                Possible links are leads, not proof. External-station case details remain
                restricted.
              </p>
            </div>
          </div>
          {active.filter(match).map((record) => {
            const matches = cases.filter(
              (other) =>
                other.id !== record.id &&
                other.identifiers?.some((identifier) => record.identifiers?.includes(identifier)),
            )
            return matches.length ? (
              <div className="linked-case-row" key={record.id}>
                <button className="case-context-link" onClick={() => open(record.id)}>
                  {record.fir} · {record.title} ›
                </button>
                {matches.map((other) => (
                  <div className="history-row" key={other.id}>
                    <span>
                      <strong>
                        {other.station === SHO_STATION
                          ? other.fir
                          : 'Restricted external-station match'}
                      </strong>
                      <small>
                        {other.station} ·{' '}
                        {other.identifiers
                          ?.filter((identifier) => record.identifiers?.includes(identifier))
                          .join(' · ')}
                      </small>
                    </span>
                    {other.station === SHO_STATION ? (
                      <button onClick={() => open(other.id)}>Open case ›</button>
                    ) : (
                      <span>Detail access restricted</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null
          })}
          {!active.some((record) =>
            cases.some(
              (other) =>
                other.id !== record.id &&
                other.identifiers?.some((identifier) => record.identifiers?.includes(identifier)),
            ),
          ) && (
            <p className="padded-note form-note">
              No repeat identifiers detected in the sample dataset.
            </p>
          )}
        </section>
      )}

      {page === 'Reports' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <small>STATION REPORT</small>
              <h3>Current supervisory snapshot</h3>
              <p>Generated from your station’s current session data only.</p>
            </div>
          </div>
          {metrics.map((metric) => (
            <div className="history-row" key={metric.label}>
              <span>
                <strong>{metric.label}</strong>
              </span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
