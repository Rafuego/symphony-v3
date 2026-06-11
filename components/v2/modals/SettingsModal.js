'use client'

import { useState } from 'react'
import Modal from '@/components/v2/primitives/Modal'
import PlanBillingTab from '@/components/v2/modals/settings/PlanBillingTab'
import BrandAssetsTab from '@/components/v2/modals/settings/BrandAssetsTab'
import AccountTab from '@/components/v2/modals/settings/AccountTab'
import IntegrationsTab from '@/components/v2/modals/settings/IntegrationsTab'
import NotificationsTab from '@/components/v2/modals/settings/NotificationsTab'

// Tabbed Settings modal. Tab set is role-gated:
//   client → Plan & billing · Brand assets · Account · Notifications
//   admin  → Plan & billing · Brand assets · Integrations · Account
export default function SettingsModal({ open, client, role, onClose, onRefresh }) {
  const isAdmin = role === 'admin'

  const tabs = isAdmin
    ? [
        { id: 'plan', label: 'Plan & billing' },
        { id: 'assets', label: 'Brand assets' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'account', label: 'Account' },
      ]
    : [
        { id: 'plan', label: 'Plan & billing' },
        { id: 'assets', label: 'Brand assets' },
        { id: 'account', label: 'Account' },
        { id: 'notifications', label: 'Notifications' },
      ]

  const [active, setActive] = useState('plan')

  return (
    <Modal open={open} onClose={onClose} title="Settings" subtitle={client?.name} maxWidth="max-w-2xl">
      <div className="flex items-center gap-5 border-b border-gray-200 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`pb-2.5 -mb-px text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === t.id
                ? 'text-gray-900 border-[#8B7355]'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'plan' && <PlanBillingTab client={client} role={role} onRefresh={onRefresh} />}
      {active === 'assets' && <BrandAssetsTab client={client} onRefresh={onRefresh} />}
      {active === 'integrations' && <IntegrationsTab client={client} onRefresh={onRefresh} />}
      {active === 'account' && <AccountTab client={client} role={role} onRefresh={onRefresh} />}
      {active === 'notifications' && <NotificationsTab />}
    </Modal>
  )
}
