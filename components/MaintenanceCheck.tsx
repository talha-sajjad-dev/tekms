import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function MaintenanceCheck() {
  // This runs on the server and can access the database
  const cookieStore = await cookies()
  const maintenanceBypass = cookieStore.get('maintenance_bypass')?.value === 'true'
  
  // Check database for maintenance mode setting
  const setting = await db.settings.findUnique({
    where: { key: 'general.maintenance_mode' }
  })
  
  const maintenanceMode = setting?.value === 'true'
  
  // If maintenance mode is off, do nothing
  if (!maintenanceMode) {
    return null
  }
  
  // Check if user is admin
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  
  // Allow admins and users with bypass cookie
  if (isAdmin || maintenanceBypass) {
    return null
  }
  
  // Redirect to maintenance page
  redirect('/maintenance')
}