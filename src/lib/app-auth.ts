import 'server-only'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

export function createAppAuth(collection: 'users') {
  return {
    async currentUser() {
      try {
        const token = (await cookies()).get('app-session')?.value
        if (!token) return null
        const payload = await getPayload({ config })
        const { user } = await payload.auth({
          headers: new Headers({ Authorization: `JWT ${token}` }),
        })
        return user?.collection === collection ? user : null
      } catch {
        return null
      }
    },
    async login(email: string, password: string) {
      const payload = await getPayload({ config })
      const { token } = await payload.login({ collection, data: { email, password } })
      if (!token) throw new Error('Sign in failed')
      ;(await cookies()).set('app-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7200,
      })
    },
    async logout() {
      ;(await cookies()).delete('app-session')
    },
  }
}
export const appAuth = createAppAuth('users')
