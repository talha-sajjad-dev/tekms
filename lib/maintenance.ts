import { existsSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const MAINTENANCE_FILE = join(process.cwd(), '.maintenance')

export function isMaintenanceMode(): boolean {
  try {
    return existsSync(MAINTENANCE_FILE)
  } catch {
    return false
  }
}

export function enableMaintenanceMode(): void {
  try {
    writeFileSync(MAINTENANCE_FILE, 'maintenance mode enabled')
  } catch (error) {
    console.error('Failed to enable maintenance mode:', error)
  }
}

export function disableMaintenanceMode(): void {
  try {
    if (existsSync(MAINTENANCE_FILE)) {
      unlinkSync(MAINTENANCE_FILE)
    }
  } catch (error) {
    console.error('Failed to disable maintenance mode:', error)
  }
}