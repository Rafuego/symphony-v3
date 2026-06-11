'use client'

import TaskBoardView from '@/components/v2/TaskBoardView'

// Thin admin single-client wrapper — shares the same TaskBoardView as the client
// portal, with role="admin" (editable status, back button, admin settings tabs).
export default function AdminClientDashboardV2({ client, onBack, onRefresh }) {
  return <TaskBoardView client={client} role="admin" onBack={onBack} onRefresh={onRefresh} />
}
