import { getPayload } from 'payload'
import config from '@payload-config'
import { appAuth } from '@/lib/app-auth'
import App from '@/components/nyayasetu/App'
import Login from '@/components/nyayasetu/Login'
import { demoCases } from '@/lib/demo-data'
import type { CaseRecord, Role } from '@/components/nyayasetu/case-model'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; demo?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  let user = null
  try {
    user = await appAuth.currentUser()
  } catch {
    user = null
  }

  if (!user && !params.role && !params.demo) {
    return <Login />
  }

  if (user) {
    try {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'case-files',
        overrideAccess: false,
        user,
        depth: 0,
        limit: 100,
        sort: '-updatedAt',
      })
      const roster = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user,
        where: { role: { equals: 'io' } },
        select: { name: true },
        limit: 100,
        depth: 0,
      })
      return (
        <App
          data={{
            user: {
              id: String(user.id),
              role: user.role as Role,
              name: user.name,
              station: user.station || '',
              email: user.email,
            },
            officers: roster.docs.map((officer) => ({
              id: String(officer.id),
              name: officer.name,
              capacity: 4,
            })),
            cases: docs.map((doc) => doc.file as unknown as CaseRecord).filter(Boolean),
          }}
        />
      )
    } catch {
      // Fall through to demo mode if payload backend is not provisioned
    }
  }

  // Demo / Role Preview Mode
  const requestedRole = (params.role as Role) || null
  const roleNameMap: Record<string, { name: string; email: string }> = {
    io: { name: 'Arjun Singh (SI / IO)', email: 'arjun.singh@uppolice.gov.in' },
    sho: { name: 'Meera Chauhan (SHO)', email: 'meera.chauhan@uppolice.gov.in' },
    co: { name: 'Vikram Sethi (CO)', email: 'vikram.sethi@uppolice.gov.in' },
    sp: { name: 'Riya Malhotra (SP)', email: 'sp.office@uppolice.gov.in' },
    advocate: { name: 'Kabir Anand (Advocate)', email: 'kabir.anand@barcouncil.in' },
    judge: { name: 'Hon. A. Verma (Sessions Judge)', email: 'court3.sessions@judiciary.gov.in' },
    citizen: { name: 'Aman Gupta (Citizen)', email: 'aman.gupta@example.com' },
    lab: { name: 'Dr. Neha Rao (FSL Director)', email: 'fsl.cyber@forensics.gov.in' },
  }

  const roleMeta = requestedRole ? roleNameMap[requestedRole] : null

  return (
    <App
      data={{
        user: {
          id: 'demo-user',
          role: requestedRole,
          name: roleMeta?.name || 'Authorized Officer',
          station: 'Hazratganj Police Station',
          email: roleMeta?.email || 'demo@nyayasetu.gov.in',
        },
        officers: [
          { id: 'io-arjun', name: 'Arjun Singh', capacity: 3 },
          { id: 'io-yadav', name: 'P. Yadav', capacity: 4 },
          { id: 'io-khan', name: 'S. Khan', capacity: 4 },
        ],
        cases: demoCases,
      }}
    />
  )
}
