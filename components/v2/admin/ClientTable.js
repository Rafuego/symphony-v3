'use client'

import EmptyState from '@/components/v2/primitives/EmptyState'
import { ClientPlanBadge, ClientStatusBadge, NotionStatus, clientMRR } from '@/components/v2/admin/clientBadges'
import IconButton from '@/components/v2/primitives/IconButton'
import { LinkIcon, PencilIcon, ArrowRightIcon } from '@/components/v2/primitives/icons'

const COLUMNS = ['Client', 'Plan', 'Status', 'MRR', 'Active', 'Queued', 'Notion', '', '']

// The client accounts table. Paused clients appear here too (with a Paused badge).
export default function ClientTable({ clients, onOpen, onEdit, onCopyLink, emptyTitle = 'No clients' }) {
  if (!clients || clients.length === 0) {
    return <EmptyState icon="📋" title={emptyTitle} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {COLUMNS.map((col, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const status = client.client_status || 'active'
            return (
              <tr
                key={client.id}
                onClick={() => onOpen?.(client.id)}
                className="group border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
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
                </td>
                <td className="px-4 py-3"><ClientPlanBadge client={client} /></td>
                <td className="px-4 py-3"><ClientStatusBadge status={status} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">${clientMRR(client).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{client.activeCount ?? 0}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{client.queuedCount ?? 0}</td>
                <td className="px-4 py-3"><NotionStatus client={client} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 justify-end">
                    <IconButton icon={LinkIcon} label="Copy portal link" size="sm" onClick={() => onCopyLink?.(client)} />
                    <IconButton icon={PencilIcon} label="Edit client" size="sm" onClick={() => onEdit?.(client)} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center text-gray-300 group-hover:text-gray-600" aria-hidden="true">
                    <ArrowRightIcon size={16} />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
