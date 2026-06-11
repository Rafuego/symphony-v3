'use client'

import TaskBoardView from '@/components/v2/TaskBoardView'

// Thin client-portal wrapper — all UI lives in the shared TaskBoardView.
export default function ClientPortalV2({ client, onRefresh }) {
  return <TaskBoardView client={client} role="client" onRefresh={onRefresh} />
}
