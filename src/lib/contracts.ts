import type { CaseRecord, Role } from '@/components/nyayasetu/case-model'
export type AppIdentity = { id: string; role: Role; station: string; name: string; email: string }
export type AppData = {
  user: AppIdentity
  officers: { id: string; name: string; capacity: number }[]
  cases: CaseRecord[]
}
