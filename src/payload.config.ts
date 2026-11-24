import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Users, CaseFiles } from './collections/Justice'
import { Tags } from './collections/Tags'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const configPromise = buildFigmaConfig({
  secret: process.env.PAYLOAD_SECRET || 'nyayasetu-jwt-secret-key-32-chars-long-123456',
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { 'en': adminLanguage },
  },
  collections: [Admins, Media, Folders, Tags, Users, CaseFiles],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
  figma: {
    environmentId: process.env.FIGMA_EID || 'preview-env',
    contentSystemId: process.env.FIGMA_CONTENT_API_CONTENT_SYSTEM_ID || 'preview-system',
    useContentSystem: Boolean(process.env.FIGMA_CONTENT_API_ACCESS_KEY),
    storage: Boolean(process.env.FIGMA_CONTENT_API_ACCESS_KEY),
  },
}).catch((err) => {
  console.warn('[Payload] Figma backend unavailable; running in preview mode:', err?.message || err)
  return {
    secret: process.env.PAYLOAD_SECRET || 'nyayasetu-jwt-secret-key-32-chars-long-123456',
    admin: { user: Admins.slug },
    collections: [Admins, Media, Folders, Tags, Users, CaseFiles],
  } as any
})

export default configPromise
