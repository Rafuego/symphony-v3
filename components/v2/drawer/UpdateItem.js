'use client'

import { statusConfig } from '@/lib/supabase'
import LinkList from '@/components/v2/primitives/LinkList'
import FileList from '@/components/v2/primitives/FileList'
import { timestamp } from '@/components/v2/lib/dateUtils'

const KIND_BADGE = {
  new_requirement: { label: 'New Requirement', cls: 'bg-rose-100 text-rose-700' },
  changes: { label: 'Changes', cls: 'bg-amber-100 text-amber-700' },
}

function statusLabel(status) {
  return statusConfig[status]?.label || status
}

function systemText(u) {
  const m = u.event_meta || {}
  const who = u.author_name
  switch (u.event_type) {
    case 'created':
      return `${who || 'Someone'} created this request`
    case 'status_changed': {
      const base = `Status changed to ${statusLabel(m.to)}`
      return m.assignee ? `${base} · ${m.assignee} assigned` : base
    }
    case 'assigned':
      return m.assignee ? `${m.assignee} assigned` : 'Assignment updated'
    case 'file_uploaded':
      return `${who || 'Someone'} uploaded ${m.file || 'a file'}${m.target ? ` to ${m.target}` : ''}`
    case 'file_removed':
      return `${who || 'Someone'} removed ${m.file || 'a file'}`
    default:
      return 'Activity'
  }
}

// One entry in the Updates feed: a system event line, or a typed user post card.
export default function UpdateItem({ update, unread }) {
  if (update.kind === 'system') {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
        <span className="flex-1">{systemText(update)}</span>
        <span className="text-gray-400">{timestamp(update.created_at)}</span>
      </div>
    )
  }

  const badge = KIND_BADGE[update.kind]
  return (
    <div
      className={`rounded-lg border p-3 ${
        unread ? 'border-[#8B7355]/40 bg-[#8B7355]/[0.03]' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {badge && (
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
        )}
        <span className="text-sm font-medium text-gray-900">{update.author_name || 'Update'}</span>
        <span className="text-xs text-gray-400">added an update · {timestamp(update.created_at)}</span>
      </div>
      {update.body && <p className="text-sm text-gray-600 whitespace-pre-wrap">{update.body}</p>}
      {update.links?.length > 0 && (
        <div className="mt-2">
          <LinkList links={update.links} />
        </div>
      )}
      {update.files?.length > 0 && (
        <div className="mt-2">
          <FileList files={update.files} />
        </div>
      )}
    </div>
  )
}
