import { createClient } from '@1password/sdk'
import * as core from '@actions/core'

const client = await createClient({
  auth: process.env.OP_SERVICE_ACCOUNT_TOKEN!,
  integrationName: '1Password Secret Loader',
  integrationVersion: '1.0.0',
})

export async function resolveOpRefs(
  opRefs: Record<string, string>,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {}

  const result = await client.secrets.resolveAll(Object.values(opRefs))

  let failedCount = 0
  for (const [key, value] of Object.entries(opRefs)) {
    const response = result.individualResponses[value]
    if (response?.content) {
      resolved[key] = response.content.secret
      continue
    }

    // secret not found for some reason
    failedCount++
    const errorMessage = response?.error
      ? `type: ${response.error.type}${response.error.message ? `message: ${response.error.message}` : ''}`
      : 'not found'
    core.error(`Failed to resolve ${key}=${value}: ${errorMessage}`)
  }

  if (failedCount > 0) {
    throw new Error(`Failed to resolve ${failedCount} secrets`)
  }

  return resolved
}
