import { createClient } from '@1password/sdk'
import dotenv from 'dotenv'
import * as core from '@actions/core'
import fs from 'node:fs/promises'

const envFiles = core.getMultilineInput('files')

const client = await createClient({
  auth: process.env.OP_SERVICE_ACCOUNT_TOKEN!,
  integrationName: '1Password Secret Loader',
  integrationVersion: '1.0.0',
})

const combined: Record<string, string> = {}

for (const path of envFiles) {
  try {
    const file = dotenv.parse(await fs.readFile(path))
    Object.assign(combined, file)
    core.info(`Loaded ${Object.keys(file).length} items from ${path}`)
  } catch (e) {
    core.warning(`Failed to load ${path}: ${(e as Error).message}`)
  }
}

const onlyOpRefs = Object.fromEntries(
  Object.entries(combined).filter(([, value]) => value.startsWith('op://')),
)

core.info(`Resolving ${Object.keys(onlyOpRefs).length} secrets`)
const resolvedSecrets = await client.secrets.resolveAll(Object.values(onlyOpRefs))

let resolveSuccessCount = 0
let resolveErrorCount = 0

for (const [key, value] of Object.entries(combined)) {
  if (resolvedSecrets.individualResponses[value]) {
    if (resolvedSecrets.individualResponses[value].content) resolveSuccessCount++
    else resolveErrorCount++
  }
  const resolvedValue = resolvedSecrets.individualResponses[value]?.content?.secret ?? value
  if (onlyOpRefs[key]) core.setSecret(resolvedValue)
  core.exportVariable(key, resolvedValue)
}
core.info(`Resolved ${resolveSuccessCount} secrets. Failed: ${resolveErrorCount}`)
