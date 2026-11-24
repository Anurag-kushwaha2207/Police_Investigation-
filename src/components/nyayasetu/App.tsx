'use client'
import { signOut } from '@/lib/actions'
import type { AppData } from '@/lib/contracts'
import ShoDashboard from './ShoDashboard'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WorkspaceProvider,
  useWorkspace,
  CaseWorkspace,
  CaseList,
  WorkspacePage,
  ProfilePage,
  AIAssistant,
  NewRecord,
} from './Workspace'
import { visibleCases, visibleAudit, visibleRequests } from './case-model'

type Role = 'io' | 'sho' | 'co' | 'sp' | 'advocate' | 'judge' | 'citizen' | 'lab'
type IconName =
  | 'grid'
  | 'case'
  | 'clock'
  | 'file'
  | 'users'
  | 'chart'
  | 'spark'
  | 'bell'
  | 'search'
  | 'menu'
  | 'close'
  | 'chevron'
  | 'shield'
  | 'profile'
  | 'logout'
  | 'check'
  | 'alert'
  | 'lab'
  | 'scale'
  | 'link'
  | 'send'
  | 'voice'

const iconPaths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  case: (
    <>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect x="3" y="7" width="18" height="13" rx="3" />
      <path d="M3 12h18M10 12v2h4v-2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M18 8a4 4 0 0 1 0 7.5M22 20v-2a4 4 0 0 0-3-3.9" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8zM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  close: (
    <>
      <path d="m5 5 14 14M19 5 5 19" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  shield: (
    <>
      <path d="M12 2 4.5 5v6c0 5 3.2 9.2 7.5 11 4.3-1.8 7.5-6 7.5-11V5z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3M15 4h5v16h-5" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  alert: (
    <>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6l-6 10a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3L14 9V3" />
      <path d="M7 16h10" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M5 6h14M4 6l-3 7h6zM20 6l-3 7h6zM8 21h8" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4zM22 2 11 13" />
    </>
  ),
  voice: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

const roleInfo: Record<
  Role,
  {
    title: string
    short: string
    name: string
    initials: string
    color: string
    icon: IconName
    description: string
  }
> = {
  io: {
    title: 'Investigation Officer',
    short: 'IO',
    name: 'Arjun Singh',
    initials: 'AS',
    color: '#2457d6',
    icon: 'shield',
    description: 'Plan, investigate and close assigned cases',
  },
  sho: {
    title: 'Station House Officer',
    short: 'SHO',
    name: 'Meera Chauhan',
    initials: 'MC',
    color: '#2457d6',
    icon: 'shield',
    description: 'Monitor station cases and officer workload',
  },
  co: {
    title: 'Circle Officer',
    short: 'CO',
    name: 'Vikram Sethi',
    initials: 'VS',
    color: '#7256b5',
    icon: 'chart',
    description: 'Supervise stations across your circle',
  },
  sp: {
    title: 'Superintendent of Police',
    short: 'SP',
    name: 'Riya Malhotra',
    initials: 'RM',
    color: '#b0532e',
    icon: 'chart',
    description: 'District command and investigation oversight',
  },
  advocate: {
    title: 'Advocate',
    short: 'Advocate',
    name: 'Kabir Anand',
    initials: 'KA',
    color: '#93651d',
    icon: 'scale',
    description: 'Manage matters, clients and legal filings',
  },
  judge: {
    title: 'Judicial Officer',
    short: 'Judge',
    name: 'Hon. A. Verma',
    initials: 'AV',
    color: '#6046a8',
    icon: 'scale',
    description: 'Review hearings, filings and case progress',
  },
  citizen: {
    title: 'Citizen Services',
    short: 'Citizen',
    name: 'Aman Gupta',
    initials: 'AG',
    color: '#0877a8',
    icon: 'users',
    description: 'Track complaints and access support',
  },
  lab: {
    title: 'Forensic Laboratory',
    short: 'FSL',
    name: 'Dr. Neha Rao',
    initials: 'NR',
    color: '#008174',
    icon: 'lab',
    description: 'Process evidence and publish lab findings',
  },
}

const roleGroups: { label: string; roles: Role[] }[] = [
  { label: 'Police & Investigation', roles: ['io', 'sho', 'co', 'sp'] },
  { label: 'Justice Services', roles: ['advocate', 'judge'] },
  { label: 'Public & Forensics', roles: ['citizen', 'lab'] },
]

const navByRole: Record<Role, { label: string; icon: IconName }[]> = {
  io: [
    { label: 'Overview', icon: 'grid' },
    { label: 'My Cases', icon: 'case' },
    { label: 'Investigation Plan', icon: 'check' },
    { label: 'Documents', icon: 'file' },
    { label: 'Deadlines', icon: 'clock' },
    { label: 'AI Copilot', icon: 'spark' },
    { label: 'Case History', icon: 'chart' },
  ],
  sho: [
    { label: 'Overview', icon: 'grid' },
    { label: 'Station Cases', icon: 'case' },
    { label: 'Officer Workload', icon: 'users' },
    { label: 'Assignments', icon: 'users' },
    { label: 'Deadlines and Alerts', icon: 'clock' },
    { label: 'Linked Cases', icon: 'link' },
    { label: 'Approvals', icon: 'check' },
    { label: 'Reports', icon: 'file' },
    { label: 'Citizen Grievances', icon: 'users' },
    { label: 'Station Compliance', icon: 'check' },
    { label: 'Evidence & Process', icon: 'lab' },
    { label: 'Case History', icon: 'chart' },
  ],
  co: [
    { label: 'Overview', icon: 'grid' },
    { label: 'Circle Cases', icon: 'case' },
    { label: 'Police Stations', icon: 'shield' },
    { label: 'Risk Review', icon: 'alert' },
    { label: 'Performance', icon: 'chart' },
    { label: 'Audit History', icon: 'clock' },
  ],
  sp: [
    { label: 'District Overview', icon: 'grid' },
    { label: 'Crime Analytics', icon: 'chart' },
    { label: 'Critical Cases', icon: 'alert' },
    { label: 'Supervision', icon: 'users' },
    { label: 'Related Cases', icon: 'link' },
    { label: 'Reports', icon: 'file' },
  ],
  advocate: [
    { label: 'Overview', icon: 'grid' },
    { label: 'My Matters', icon: 'case' },
    { label: 'Hearings', icon: 'clock' },
    { label: 'Legal Drafts', icon: 'file' },
    { label: 'Clients', icon: 'users' },
    { label: 'Activity History', icon: 'chart' },
  ],
  judge: [
    { label: 'Cause List', icon: 'grid' },
    { label: 'Case Docket', icon: 'case' },
    { label: 'Orders', icon: 'file' },
    { label: 'Evidence Review', icon: 'lab' },
    { label: 'Calendar', icon: 'clock' },
    { label: 'Case History', icon: 'chart' },
  ],
  citizen: [
    { label: 'Overview', icon: 'grid' },
    { label: 'My Complaints', icon: 'case' },
    { label: 'AI Legal Guide', icon: 'spark' },
    { label: 'Documents', icon: 'file' },
    { label: 'Updates', icon: 'bell' },
    { label: 'Request History', icon: 'clock' },
  ],
  lab: [
    { label: 'Overview', icon: 'grid' },
    { label: 'Evidence Queue', icon: 'lab' },
    { label: 'In Examination', icon: 'case' },
    { label: 'Reports', icon: 'file' },
    { label: 'Turnaround', icon: 'chart' },
    { label: 'Chain of Custody', icon: 'link' },
  ],
}

const dashboardData: Record<
  Role,
  {
    greeting: string
    insight: string
    stats: { label: string; value: string; delta: string; tone: string; icon: IconName }[]
    workTitle: string
    work: {
      id: string
      title: string
      meta: string
      status: string
      tone: string
      progress: number
    }[]
    tasks: { title: string; meta: string; urgent?: boolean }[]
  }
> = {
  io: {
    greeting: 'Your investigation desk is ready',
    insight:
      '3 priority actions can prevent delay today. The freeze request in FIR 184/25 should be approved first.',
    stats: [
      { label: 'Active cases', value: '18', delta: '4 high priority', tone: 'blue', icon: 'case' },
      { label: 'Due this week', value: '7', delta: '2 due today', tone: 'amber', icon: 'clock' },
      {
        label: 'Plans completed',
        value: '82%',
        delta: '+6% this month',
        tone: 'green',
        icon: 'check',
      },
      {
        label: 'Drafts pending',
        value: '5',
        delta: 'Awaiting review',
        tone: 'purple',
        icon: 'file',
      },
    ],
    workTitle: 'Priority investigations',
    work: [
      {
        id: 'FIR 184/25',
        title: 'Online investment fraud',
        meta: 'Cyber Cell · BNS 318(4)',
        status: 'Freeze request due',
        tone: 'danger',
        progress: 64,
      },
      {
        id: 'FIR 176/25',
        title: 'Identity theft & impersonation',
        meta: 'Hazratganj PS · BNS 319(2)',
        status: 'On track',
        tone: 'success',
        progress: 78,
      },
      {
        id: 'FIR 169/25',
        title: 'Digital payment fraud',
        meta: 'Gomti Nagar PS · BNS 318',
        status: 'Evidence pending',
        tone: 'warning',
        progress: 42,
      },
    ],
    tasks: [
      {
        title: 'Approve HDFC account freeze letter',
        meta: 'FIR 184/25 · Due in 2 hours',
        urgent: true,
      },
      { title: 'Record witness statement', meta: 'FIR 176/25 · Today, 2:30 PM' },
      { title: 'Send victim 90-day update', meta: 'FIR 142/25 · Tomorrow' },
    ],
  },
  sho: {
    greeting: 'Station operations at a glance',
    insight:
      'Two cases need your intervention. IO workload has exceeded the recommended limit in Cyber and Property units.',
    stats: [
      {
        label: 'Open station cases',
        value: '126',
        delta: '12 added this week',
        tone: 'blue',
        icon: 'case',
      },
      {
        label: 'Officers on cases',
        value: '24',
        delta: '3 overloaded',
        tone: 'purple',
        icon: 'users',
      },
      {
        label: 'At-risk deadlines',
        value: '8',
        delta: 'Needs attention',
        tone: 'red',
        icon: 'alert',
      },
      { label: 'Approval queue', value: '11', delta: '4 urgent', tone: 'amber', icon: 'check' },
    ],
    workTitle: 'Cases needing supervision',
    work: [
      {
        id: 'FIR 184/25',
        title: 'Online investment fraud',
        meta: 'IO Arjun Singh · 12 days active',
        status: 'Deadline risk',
        tone: 'danger',
        progress: 64,
      },
      {
        id: 'FIR 158/25',
        title: 'Commercial burglary',
        meta: 'IO P. Yadav · 21 days active',
        status: 'Review requested',
        tone: 'warning',
        progress: 72,
      },
      {
        id: 'FIR 147/25',
        title: 'Vehicle theft series',
        meta: 'IO S. Khan · Linked cases: 4',
        status: 'On track',
        tone: 'success',
        progress: 84,
      },
    ],
    tasks: [
      { title: 'Review arrest memo request', meta: 'FIR 158/25 · Submitted 40m ago', urgent: true },
      { title: 'Reassign unattended case', meta: 'FIR 121/25 · No update for 7 days' },
      { title: 'Station review briefing', meta: 'Today · 4:00 PM' },
    ],
  },
  co: {
    greeting: 'Circle supervision overview',
    insight:
      'Gomti Nagar station improved closure quality by 9%. Hazratganj needs support on 14 approaching deadlines.',
    stats: [
      {
        label: 'Cases in circle',
        value: '486',
        delta: 'Across 6 stations',
        tone: 'blue',
        icon: 'case',
      },
      {
        label: 'Compliance score',
        value: '91%',
        delta: '+3.2% this month',
        tone: 'green',
        icon: 'check',
      },
      { label: 'Critical reviews', value: '14', delta: '5 new today', tone: 'red', icon: 'alert' },
      {
        label: 'Avg. completion',
        value: '47d',
        delta: '4 days faster',
        tone: 'purple',
        icon: 'clock',
      },
    ],
    workTitle: 'Station performance',
    work: [
      {
        id: 'PS-01',
        title: 'Gomti Nagar Police Station',
        meta: '96 open · 89% compliance',
        status: 'Performing well',
        tone: 'success',
        progress: 89,
      },
      {
        id: 'PS-04',
        title: 'Hazratganj Police Station',
        meta: '112 open · 76% compliance',
        status: '14 deadline risks',
        tone: 'danger',
        progress: 76,
      },
      {
        id: 'PS-06',
        title: 'Vibhuti Khand Police Station',
        meta: '81 open · 84% compliance',
        status: 'Review due',
        tone: 'warning',
        progress: 84,
      },
    ],
    tasks: [
      { title: 'Review serious offence compliance', meta: 'Hazratganj PS · 5 cases', urgent: true },
      { title: 'Approve circle inspection note', meta: 'Gomti Nagar PS · Due today' },
      { title: 'Weekly SHO conference', meta: 'Tomorrow · 11:00 AM' },
    ],
  },
  sp: {
    greeting: 'District command centre',
    insight:
      'Financial cyber fraud is up 8% this month. ₹42.6 lakh is currently traceable across 17 active accounts.',
    stats: [
      { label: 'District cases', value: '2,418', delta: '32 stations', tone: 'blue', icon: 'case' },
      {
        label: 'Disposal rate',
        value: '73.8%',
        delta: '+4.1% vs last month',
        tone: 'green',
        icon: 'chart',
      },
      {
        label: 'Critical cases',
        value: '26',
        delta: '7 need command review',
        tone: 'red',
        icon: 'alert',
      },
      {
        label: 'Funds frozen',
        value: '₹1.84Cr',
        delta: '+₹28L this month',
        tone: 'purple',
        icon: 'shield',
      },
    ],
    workTitle: 'District priority watch',
    work: [
      {
        id: 'CYBER',
        title: 'Cyber & financial crime',
        meta: '342 active · ₹42.6L traceable',
        status: '+8% trend',
        tone: 'danger',
        progress: 68,
      },
      {
        id: 'WOMEN',
        title: 'Crimes against women',
        meta: '218 active · 94% reviewed',
        status: 'High compliance',
        tone: 'success',
        progress: 94,
      },
      {
        id: 'PROPERTY',
        title: 'Property offences',
        meta: '491 active · 71% disposal',
        status: 'Stable',
        tone: 'warning',
        progress: 71,
      },
    ],
    tasks: [
      {
        title: 'Review multi-district fraud cluster',
        meta: '12 linked FIRs · 4 districts',
        urgent: true,
      },
      { title: 'Approve monthly crime report', meta: 'Prepared by Crime Branch' },
      { title: 'Command conference', meta: 'Today · 5:30 PM' },
    ],
  },
  advocate: {
    greeting: 'Good morning, Mr. Anand',
    insight:
      'Your hearing in State v. Mehta begins at 11:30 AM. The prosecution filed one new document overnight.',
    stats: [
      {
        label: 'Active matters',
        value: '28',
        delta: '6 in court this week',
        tone: 'blue',
        icon: 'case',
      },
      {
        label: 'Today’s hearings',
        value: '4',
        delta: 'Next at 11:30 AM',
        tone: 'amber',
        icon: 'clock',
      },
      {
        label: 'Drafts in progress',
        value: '7',
        delta: '2 need review',
        tone: 'purple',
        icon: 'file',
      },
      {
        label: 'Client updates',
        value: '5',
        delta: 'Unread messages',
        tone: 'green',
        icon: 'users',
      },
    ],
    workTitle: 'Active legal matters',
    work: [
      {
        id: 'CRL 842/25',
        title: 'State v. Mehta',
        meta: 'Sessions Court 3 · Hearing today',
        status: 'New filing',
        tone: 'danger',
        progress: 75,
      },
      {
        id: 'BAIL 291/25',
        title: 'Kumar v. State',
        meta: 'High Court · Bail application',
        status: 'Arguments ready',
        tone: 'success',
        progress: 88,
      },
      {
        id: 'CRL 716/25',
        title: 'Rana v. State',
        meta: 'CJ Magistrate · Evidence stage',
        status: 'Brief pending',
        tone: 'warning',
        progress: 56,
      },
    ],
    tasks: [
      {
        title: 'Review supplementary evidence',
        meta: 'State v. Mehta · Before 11:00 AM',
        urgent: true,
      },
      { title: 'File written submissions', meta: 'Kumar v. State · Due tomorrow' },
      { title: 'Client conference: Ms. Rana', meta: 'Today · 4:15 PM' },
    ],
  },
  judge: {
    greeting: 'Today’s judicial docket',
    insight:
      'Two matters have custody deadlines approaching. Three forensic reports have been added to today’s evidence queue.',
    stats: [
      {
        label: 'Listed today',
        value: '32',
        delta: '8 priority matters',
        tone: 'blue',
        icon: 'scale',
      },
      { label: 'Orders pending', value: '6', delta: '2 due today', tone: 'amber', icon: 'file' },
      { label: 'Custody alerts', value: '2', delta: 'Time-sensitive', tone: 'red', icon: 'alert' },
      {
        label: 'Disposed this month',
        value: '84',
        delta: '+12% vs last month',
        tone: 'green',
        icon: 'check',
      },
    ],
    workTitle: 'Priority cause list',
    work: [
      {
        id: 'ITEM 04',
        title: 'State v. Mehta',
        meta: 'CRL 842/25 · Evidence',
        status: '11:30 AM',
        tone: 'warning',
        progress: 76,
      },
      {
        id: 'ITEM 09',
        title: 'Kumar v. State',
        meta: 'BAIL 291/25 · Final arguments',
        status: 'Custody alert',
        tone: 'danger',
        progress: 91,
      },
      {
        id: 'ITEM 16',
        title: 'State v. Sharma',
        meta: 'CRL 621/25 · Charge',
        status: 'Documents ready',
        tone: 'success',
        progress: 82,
      },
    ],
    tasks: [
      {
        title: 'Review custody extension record',
        meta: 'Kumar v. State · Before hearing',
        urgent: true,
      },
      { title: 'Sign digitally reserved order', meta: 'CRL 598/25 · Draft complete' },
      { title: 'Review DNA lab report', meta: 'State v. Sharma · Newly received' },
    ],
  },
  citizen: {
    greeting: 'Welcome back, Aman',
    insight:
      'Your complaint has progressed to evidence review. The investigating officer posted an update 2 hours ago.',
    stats: [
      {
        label: 'Active complaints',
        value: '2',
        delta: 'Both in progress',
        tone: 'blue',
        icon: 'case',
      },
      {
        label: 'New updates',
        value: '3',
        delta: 'Since your last visit',
        tone: 'green',
        icon: 'bell',
      },
      { label: 'Documents', value: '8', delta: 'Securely stored', tone: 'purple', icon: 'file' },
      { label: 'Next update', value: '12d', delta: 'By 18 June', tone: 'amber', icon: 'clock' },
    ],
    workTitle: 'My complaints',
    work: [
      {
        id: 'ACK 520184',
        title: 'Online investment fraud',
        meta: 'Filed 12 Mar 2025 · Cyber Cell',
        status: 'Evidence review',
        tone: 'success',
        progress: 68,
      },
      {
        id: 'ACK 518902',
        title: 'Lost identity document',
        meta: 'Filed 02 Mar 2025 · Gomti Nagar PS',
        status: 'Verification',
        tone: 'warning',
        progress: 46,
      },
    ],
    tasks: [
      {
        title: 'Confirm latest transaction list',
        meta: 'Requested by IO · Takes 2 minutes',
        urgent: true,
      },
      { title: 'Download progress acknowledgement', meta: 'Available now' },
      { title: 'Update emergency contact', meta: 'Recommended for your profile' },
    ],
  },
  lab: {
    greeting: 'Forensic operations workspace',
    insight:
      'Three high-priority cyber exhibits are due within 48 hours. Digital Lab 2 has available capacity today.',
    stats: [
      {
        label: 'Evidence received',
        value: '48',
        delta: '12 received today',
        tone: 'blue',
        icon: 'lab',
      },
      {
        label: 'In examination',
        value: '31',
        delta: '6 high priority',
        tone: 'purple',
        icon: 'case',
      },
      { label: 'Due in 48 hours', value: '7', delta: '3 critical', tone: 'red', icon: 'clock' },
      { label: 'Reports issued', value: '124', delta: 'This month', tone: 'green', icon: 'file' },
    ],
    workTitle: 'Priority evidence queue',
    work: [
      {
        id: 'FSL-D 1198',
        title: 'Mobile device extraction',
        meta: 'FIR 184/25 · Digital Forensics',
        status: 'Due in 18h',
        tone: 'danger',
        progress: 72,
      },
      {
        id: 'FSL-B 1184',
        title: 'DNA profiling',
        meta: 'FIR 151/25 · Biology Division',
        status: 'Analysis running',
        tone: 'warning',
        progress: 58,
      },
      {
        id: 'FSL-C 1169',
        title: 'Narcotics composition',
        meta: 'FIR 130/25 · Chemistry Division',
        status: 'Report ready',
        tone: 'success',
        progress: 96,
      },
    ],
    tasks: [
      {
        title: 'Validate extracted device hash',
        meta: 'FSL-D 1198 · Due in 3 hours',
        urgent: true,
      },
      { title: 'Authorize chemistry report', meta: 'FSL-C 1169 · Peer reviewed' },
      { title: 'Accept evidence transfer', meta: '4 sealed exhibits · Arriving 3:00 PM' },
    ],
  },
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Icon name="shield" size={compact ? 21 : 25} />
      </div>
      {!compact && (
        <div>
          <strong>NyayaSetu</strong>
          <span>Justice intelligence network</span>
        </div>
      )}
    </div>
  )
}

function Portal({ onSelect }: { onSelect: (role: Role) => void }) {
  const [filter, setFilter] = useState('')
  return (
    <main className="portal-page">
      <header className="portal-header">
        <Logo />
        <div className="secure-pill">
          <span></span> Interactive frontend demo
        </div>
      </header>
      <section className="portal-intro">
        <div className="eyebrow">
          <Icon name="spark" size={15} /> INVESTIGATION COPILOT
        </div>
        <h1>
          One justice network.
          <br />
          <em>Purpose-built workspaces.</em>
        </h1>
        <p>
          Explore role-specific workspaces for police, courts, citizens and forensic services.
          Choose a demo role to preview its connected case workflows.
        </p>
        <div className="portal-search">
          <Icon name="search" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find your workspace..."
            aria-label="Find your workspace"
          />
          <kbd>Search</kbd>
        </div>
      </section>
      <section className="role-groups">
        {roleGroups.map((group) => {
          const roles = group.roles.filter((role) =>
            `${roleInfo[role].title} ${roleInfo[role].short}`
              .toLowerCase()
              .includes(filter.toLowerCase()),
          )
          if (!roles.length) return null
          return (
            <div className="role-group" key={group.label}>
              <div className="group-title">
                <span>{group.label}</span>
                <i />
              </div>
              <div className="role-grid">
                {roles.map((role) => {
                  const item = roleInfo[role]
                  return (
                    <button
                      className="role-card"
                      key={role}
                      onClick={() => onSelect(role)}
                      style={{ '--accent': item.color } as React.CSSProperties}
                    >
                      <span className="role-icon">
                        <Icon name={item.icon} size={24} />
                      </span>
                      <span className="role-copy">
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                      <span className="role-arrow">
                        <Icon name="chevron" size={18} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
      <footer className="portal-footer">
        <span>
          <Icon name="shield" size={15} /> Synthetic data · Session-only frontend preview
        </span>
        <span>No production authentication or server storage connected</span>
      </footer>
    </main>
  )
}

function Sidebar({
  role,
  active,
  setActive,
  open,
  onClose,
  onLogout,
  gesturesEnabled,
  toggleGestures,
}: {
  role: Role
  active: string
  setActive: (value: string) => void
  open: boolean
  onClose: () => void
  onLogout: () => void
  gesturesEnabled: boolean
  toggleGestures: () => void
}) {
  const info = roleInfo[role]
  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close menu" />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="mobile-close" onClick={onClose} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace-tag" style={{ '--accent': info.color } as React.CSSProperties}>
          <span>
            <Icon name={info.icon} size={18} />
          </span>
          <div>
            <small>ACTIVE WORKSPACE</small>
            <strong>{info.short} Portal</strong>
          </div>
        </div>
        <nav className="side-nav" aria-label="Primary navigation">
          <span className="nav-label">WORKSPACE</span>
          {navByRole[role].map((item) => (
            <button
              key={item.label}
              className={active === item.label ? 'active' : ''}
              onClick={() => {
                setActive(item.label)
                onClose()
              }}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {active === item.label && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <label className="gesture-toggle">
            <input type="checkbox" checked={gesturesEnabled} onChange={toggleGestures} /> Swipe
            navigation <small>Edge swipe to open · swipe left to close</small>
          </label>
          <button
            onClick={() => setActive('Profile')}
            className={active === 'Profile' ? 'active' : ''}
          >
            <Icon name="profile" size={19} />
            <span>Profile & Settings</span>
          </button>
          <button onClick={onLogout}>
            <Icon name="logout" size={19} />
            <span>Secure sign out</span>
          </button>
          <div className="security-note">
            <Icon name="shield" size={15} />
            <span>Demo activity · Session only</span>
          </div>
        </div>
      </aside>
    </>
  )
}

function Dashboard({
  role,
  active,
  setActive,
}: {
  role: Role
  active: string
  setActive: (value: string) => void
}) {
  const data = dashboardData[role]
  const info = roleInfo[role]
  const store = useWorkspace()
  const [creating, setCreating] = useState(false)
  const openCase = (id: string) => setActive(`Case:${id}`)
  const records = visibleCases(store.cases, role).filter((record) => !record.archived)
  const pending = records.reduce(
    (total, record) =>
      total +
      visibleRequests(record, role).filter((request) => request.status === 'Pending').length,
    0,
  )
  const tasks = records.flatMap((record) =>
    visibleRequests(record, role)
      .filter((request) => request.status === 'Pending')
      .map((request) => ({
        title: request.title,
        meta: `${record.fir} · Due ${request.due}`,
        urgent: Date.parse(request.due) < Date.now(),
      })),
  )
  const stats = [
    {
      label: role === 'citizen' ? 'My active complaints' : 'Assigned active cases',
      value: String(records.length),
      delta: 'Shared session records',
      tone: 'blue',
      icon: 'case' as IconName,
    },
    {
      label: 'Pending document requests',
      value: String(pending),
      delta: 'Visible to your role',
      tone: 'amber',
      icon: 'file' as IconName,
    },
    {
      label: role === 'lab' ? 'Examination progress' : 'Average case progress',
      value: `${records.length ? Math.round(records.reduce((total, record) => total + (role === 'lab' ? record.labProgress : record.progress), 0) / records.length) : 0}%`,
      delta: 'Updates with case changes',
      tone: 'green',
      icon: 'chart' as IconName,
    },
    {
      label: 'Completed sample tasks',
      value: String(store.tasks.filter((task) => task.startsWith(`${role}-`)).length),
      delta: 'Saved for this session',
      tone: 'purple',
      icon: 'check' as IconName,
    },
  ]
  if (role === 'sho' && active !== 'Profile')
    return <ShoDashboard page={active} navigate={setActive} />
  if (active.startsWith('Case:'))
    return (
      <CaseWorkspace
        key={`${role}-${active}`}
        role={role}
        caseId={active.slice(5)}
        onBack={() =>
          setActive(
            role === 'sp' ? 'District Overview' : role === 'judge' ? 'Cause List' : 'Overview',
          )
        }
      />
    )
  if (active === 'Profile')
    return <ProfilePage key={role} role={role} name={info.name} color={info.color} />
  if (active.includes('AI') || active === 'AI Copilot')
    return <AIAssistant key={role} role={role} />
  if (!['Overview', 'District Overview', 'Cause List'].includes(active))
    return <WorkspacePage key={`${role}-${active}`} role={role} page={active} open={openCase} />

  return (
    <>
      {creating && <NewRecord role={role} close={() => setCreating(false)} open={openCase} />}
      <section className="welcome-row">
        <div>
          <span className="page-kicker">{info.short.toUpperCase()} WORKSPACE</span>
          <h1>
            {active === 'Overview' || active === 'District Overview' || active === 'Cause List'
              ? data.greeting
              : active}
          </h1>
          <p>
            {active === 'Overview' || active === 'District Overview' || active === 'Cause List'
              ? info.description
              : `Authorized ${active.toLowerCase()} records and actions for your workspace.`}
          </p>
        </div>
        <button
          className="primary-button"
          disabled={role !== 'citizen'}
          onClick={() => setCreating(true)}
        >
          <span>+</span>
          {role === 'citizen' ? 'New complaint' : 'New case'}
        </button>
      </section>

      <section className="insight-banner">
        <span className="insight-icon">
          <Icon name="spark" size={20} />
        </span>
        <div>
          <small>WORKSPACE BRIEF</small>
          <p>
            {records.length} active cases in your demo workspace. {pending} document requests are
            pending. Open a case to review linked citizen, investigation and lab updates.
          </p>
        </div>
        <button
          onClick={() =>
            setActive(
              role === 'citizen'
                ? 'AI Legal Guide'
                : role === 'io'
                  ? 'AI Copilot'
                  : navByRole[role][1].label,
            )
          }
        >
          Review now <Icon name="chevron" size={15} />
        </button>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className={`stat-icon ${stat.tone}`}>
              <Icon name={stat.icon} size={20} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-delta ${stat.tone}`}>{stat.delta}</div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel work-panel">
          <div className="panel-heading">
            <div>
              <small>ASSIGNED CASES</small>
              <h3>
                {role === 'lab'
                  ? 'Forensic case queue'
                  : role === 'citizen'
                    ? 'My complaints'
                    : 'Priority case records'}
              </h3>
            </div>
            <button onClick={() => setActive(navByRole[role][1].label)}>
              View all <Icon name="chevron" size={14} />
            </button>
          </div>
          <CaseList role={role} open={openCase} />
        </div>
        <div className="panel tasks-panel">
          <div className="panel-heading">
            <div>
              <small>SAMPLE NEXT ACTIONS</small>
              <h3>Task checklist preview</h3>
            </div>
            <span className="count">{tasks.length}</span>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <label className="task-item" key={task.title}>
                <input
                  type="checkbox"
                  checked={store.tasks.includes(`${role}-${task.title}`)}
                  onChange={() => store.toggleTask(`${role}-${task.title}`)}
                />
                <span className="custom-check" />
                <span className="task-copy">
                  <strong>{task.title}</strong>
                  <small className={task.urgent ? 'urgent' : ''}>{task.meta}</small>
                </span>
              </label>
            ))}
          </div>
          <button className="all-tasks" onClick={() => setActive('Tasks')}>
            Open full task list <Icon name="chevron" size={15} />
          </button>
        </div>
      </section>

      {role === 'io' && (
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="panel-heading">
            <div>
              <small>SHO REVIEW</small>
              <h3>Approval decisions & remarks</h3>
            </div>
          </div>
          {records.flatMap((record) =>
            (record.approvals ?? []).map((approval) => (
              <button key={approval.id} className="history-row" onClick={() => openCase(record.id)}>
                <span>
                  <strong>
                    {record.fir} · {approval.kind} · {approval.status}
                  </strong>
                  <small>{approval.remarks || 'Awaiting SHO review'}</small>
                </span>
                <span>Open request ›</span>
              </button>
            )),
          )}
        </section>
      )}
      <section className="bottom-strip">
        <div className="mini-chart">
          <div>
            <small>ILLUSTRATIVE TREND</small>
            <strong>Sample 30-day activity</strong>
          </div>
          <div className="bars">
            {[35, 48, 42, 62, 55, 73, 68, 84, 76, 91].map((height, i) => (
              <i
                key={i}
                style={{ height: `${height}%`, background: i > 7 ? info.color : undefined }}
              />
            ))}
          </div>
          <span className="trend">↗ 12.4%</span>
        </div>
        <div className="audit-card">
          <span>
            <Icon name="shield" size={18} />
          </span>
          <p>
            <strong>Connected case activity</strong>
            <small>Review role-filtered updates from this demo session</small>
          </p>
          <button onClick={() => setActive(role === 'lab' ? 'Chain of Custody' : 'Case History')}>
            View history
          </button>
        </div>
      </section>
    </>
  )
}

function AppContent({ data }: { data: AppData }) {
  const store = useWorkspace()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [role, setRole] = useState<Role | null>(data.user.role)
  const [active, setActive] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [gesturesEnabled, setGesturesEnabled] = useState(true)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeMenu)
    return () => window.removeEventListener('keydown', closeMenu)
  }, [])
  const [profileOpen, setProfileOpen] = useState(false)
  const info = role ? roleInfo[role] : null
  const profileName = role ? (store.profiles[role]?.name ?? info!.name) : ''
  const initials = useMemo(
    () =>
      profileName
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join(''),
    [profileName],
  )
  const assigned = role ? visibleCases(store.cases, role) : []
  const updates = role
    ? assigned.flatMap((record) =>
        (record.notifications ?? [])
          .filter((item) => item.to.includes(role))
          .map((item) => ({
            id: item.id,
            title: item.title,
            detail: record.fir,
            caseId: record.id,
          })),
      )
    : []

  if (!role)
    return (
      <Portal
        onSelect={(nextRole) => {
          store.setSearch('')
          setNotificationsOpen(false)
          setRole(nextRole)
          setActive(
            nextRole === 'sp'
              ? 'District Overview'
              : nextRole === 'judge'
                ? 'Cause List'
                : 'Overview',
          )
        }}
      />
    )

  return (
    <div
      className="app-shell"
      onTouchStart={(event) => {
        const touch = event.touches[0]
        touchStart.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        touchStart.current = null
        if (!gesturesEnabled || !start || window.innerWidth > 820) return
        const touch = event.changedTouches[0]
        if (Math.abs(touch.clientY - start.y) > 50) return
        if (start.x < 30 && touch.clientX - start.x > 70) setMenuOpen(true)
        if (menuOpen && start.x - touch.clientX > 70) setMenuOpen(false)
      }}
      style={{ '--role-accent': info!.color } as React.CSSProperties}
    >
      <Sidebar
        role={role}
        active={active}
        setActive={setActive}
        open={menuOpen}
        gesturesEnabled={gesturesEnabled}
        toggleGestures={() => setGesturesEnabled(!gesturesEnabled)}
        onClose={() => setMenuOpen(false)}
        onLogout={() => {
          void signOut().then(() => window.location.reload())
          setProfileOpen(false)
        }}
      />
      <div className="main-shell">
        <div className="demo-strip">
          Authenticated workspace · Station and role permissions enforced on the server
        </div>
        <header className="topbar">
          <button
            className="menu-button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={23} />
          </button>
          <div className="mobile-brand">
            <Logo compact />
          </div>
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              placeholder="Search cases, names or IDs..."
              aria-label="Search cases"
              value={store.search}
              onChange={(e) => {
                store.setSearch(e.target.value)
                setActive('Case directory')
              }}
            />
          </div>
          <div className="top-actions">
            <a
              href="/?demo=true"
              className="network-status"
              style={{ textDecoration: 'none', cursor: 'pointer' }}
              title="Click to switch dashboard role"
            >
              <i /> Switch Role (All 8 Roles)
            </a>
            <button
              className="icon-button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Icon name="bell" size={19} />
              <i>{updates.length}</i>
            </button>
            {notificationsOpen && (
              <div className="notification-panel">
                <h3>Case notifications</h3>
                {updates.length ? (
                  updates.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActive(`Case:${item.caseId}`)
                        setNotificationsOpen(false)
                      }}
                    >
                      <strong>{item.title}</strong>
                      <small>{item.detail} · Open case</small>
                    </button>
                  ))
                ) : (
                  <p>No new case updates.</p>
                )}
              </div>
            )}
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}>
                <span className="avatar" style={{ background: info!.color }}>
                  {initials}
                </span>
                <span className="profile-copy">
                  <strong>{profileName}</strong>
                  <small>{info!.title}</small>
                </span>
                <Icon name="chevron" size={14} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <a
                    href="/?demo=true"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      textDecoration: 'none',
                      color: 'inherit',
                      borderRadius: '6px',
                    }}
                  >
                    <Icon name="grid" size={17} /> Switch Role / Portal
                  </a>
                  <button
                    onClick={() => {
                      setActive('Profile')
                      setProfileOpen(false)
                    }}
                  >
                    <Icon name="profile" size={17} /> Profile & settings
                  </button>
                  <button
                    onClick={() => {
                      void signOut().then(() => {
                        window.location.href = '/'
                      })
                    }}
                  >
                    <Icon name="logout" size={17} /> Secure sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="dashboard-content">
          <Dashboard role={role} active={active} setActive={setActive} />
        </main>
      </div>
    </div>
  )
}

export default function App({ data }: { data: AppData }) {
  return (
    <WorkspaceProvider data={data}>
      <AppContent data={data} />
    </WorkspaceProvider>
  )
}
