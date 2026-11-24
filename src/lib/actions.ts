'use server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { appAuth } from './app-auth'
import type { CaseAction } from '@/components/nyayasetu/case-model'
export async function signIn(email: string, password: string, signup = false, name = '') {
  try {
    if (!email || email.length > 254 || password.length < 12 || password.length > 128)
      return { error: 'Enter an email and password of 12–128 characters.' }
    const payload = await getPayload({ config })
    if (signup)
      await payload.create({
        collection: 'users',
        overrideAccess: false,
        data: { name: name.trim().slice(0, 100), email, password },
      })
    await appAuth.login(email, password)
    return { ok: true }
  } catch {
    return {
      error:
        'Unable to sign in or create this account. Check your details or contact your administrator.',
    }
  }
}
export async function signOut() {
  try {
    await appAuth.logout()
  } catch {}
}
export async function mutateCase(reference: string, command: CaseAction) {
  try {
    const user = await appAuth.currentUser()
    if (!user) return { error: 'Sign in required.' }
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'case-files',
      overrideAccess: false,
      user,
      where: { reference: { equals: reference } },
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) return { error: 'Case unavailable to your account.' }
    await payload.update({
      collection: 'case-files',
      id: docs[0].id,
      overrideAccess: false,
      user,
      data: { command },
    })
    return { ok: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Action failed.' }
  }
}
export async function createComplaint(title: string, summary: string, category: string) {
  try {
    const user = await appAuth.currentUser()
    if (!user || user.role !== 'citizen') return { error: 'Citizen sign-in required.' }
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'case-files',
      overrideAccess: false,
      user,
      data: { title, summary, category },
    })
    return { ok: true, reference: created.reference || '' }
  } catch {
    return { error: 'Complaint could not be submitted. Check subject and description.' }
  }
}
