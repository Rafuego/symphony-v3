'use client'

import UpdateItem from '@/components/v2/drawer/UpdateItem'

// Renders the activity feed newest-first, split into Unread / Read groups
// (matching the Figma). `updates` arrives newest-first from the API.
export default function UpdatesFeed({ updates, lastReadAt }) {
  if (!updates || updates.length === 0) {
    return <p className="text-sm text-gray-400">No activity yet.</p>
  }

  const readTs = lastReadAt ? new Date(lastReadAt).getTime() : 0
  const isUnread = (u) => new Date(u.created_at).getTime() > readTs
  const unread = updates.filter(isUnread)
  const read = updates.filter((u) => !isUnread(u))

  return (
    <div className="space-y-4">
      {unread.length > 0 && read.length > 0 ? (
        <>
          <Group label="Unread updates" items={unread} unread />
          <Group label="Read updates" items={read} />
        </>
      ) : (
        <div className="space-y-2">
          {updates.map((u) => (
            <UpdateItem key={u.id} update={u} unread={isUnread(u)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Group({ label, items, unread }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">{label}</div>
      <div className="space-y-2">
        {items.map((u) => (
          <UpdateItem key={u.id} update={u} unread={unread} />
        ))}
      </div>
    </div>
  )
}
