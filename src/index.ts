import dotenv from 'dotenv'
import * as core from '@actions/core'
import fs from 'node:fs/promises'
import { resolveOpRefs } from './resolve-secrets.js'

const envFiles = core.getMultilineInput('files')

const combined: Record<string, string> = {}

for (const path of envFiles) {
  const file = dotenv.parse(await fs.readFile(path))
  Object.assign(combined, file)
  core.info(`Loaded ${Object.keys(file).length} items from ${path}`)
}

if (Object.keys(combined).length === 0) {
  core.warning('Nothing to do here :)')
  process.exit(0)
}

const opRefs = Object.fromEntries(
  Object.entries(combined).filter(([, value]) => value.startsWith('op://')),
)

const resolvedOpRefs = await resolveOpRefs(opRefs)

for (const [key, value] of Object.entries(combined)) {
  const resolvedOpRef = resolvedOpRefs[key] ?? value
  if (opRefs) core.setSecret(resolvedOpRef)
  core.exportVariable(key, resolvedOpRef)
}

core.info(`Exported items: ${Object.keys(combined).length}`)
core.info(`Resolved secrets: ${Object.keys(opRefs).length}`)
