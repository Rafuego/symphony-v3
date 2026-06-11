'use client'

import EmptyState from '@/components/v2/primitives/EmptyState'
import { ClientPlanBadge, ClientStatusBadge, NotionStatus, clientMRR } from '@/components/v2/admin/clientBadges'

// Grid of client cards (the Grid view toggle).
export default function ClientGrid({ clients, onOpen, onCopyLink, emptyTitle = 'No clients' }) {
  if (!clients || clients.length === 0) {
    return <EmptyState icon="📋" title={emptyTitle} />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => {
        const status = client.client_status || 'active'
        return (
          <div
            key={client.id}
            onClick={() => onOpen?.(client.id)}
            className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base overflow-hidden flex-shrink-0">
                  {client.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    client.logo || '🏢'
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 truncate">{client.name}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ClientPlanBadge client={client} />
                <ClientStatusBadge status={status} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span>{client.activeCount ?? 0} Active · {client.queuedCount ?? 0} Queued</span>
              <NotionStatus client={client} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-900">${clientMRR(client).toLocaleString()}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onCopyLink?.(client) }}
                className="text-gray-400 hover:text-gray-700"
                title="Copy portal link"
              >
                🔗
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
