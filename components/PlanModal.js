'use client'

import { useState } from 'react'
import { planConfig } from '@/lib/supabase'

export default function PlanModal({ currentPlan, customConfig, clientName, onSave, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [config, setConfig] = useState({
    price: customConfig.price || planConfig[currentPlan]?.defaultPrice.toString() || '2000',
    maxActive: customConfig.maxActive || planConfig[currentPlan]?.defaultMaxActive.toString() || '1',
    designers: customConfig.designers || planConfig[currentPlan]?.defaultDesigners || '1'
  })

  const getDefaultsForPlan = (planType) => {
    const defaults = {
      launch: { price: '2000', maxActive: '1', designers: '1' },
      growth: { price: '3500', maxActive: '3', designers: '2' },
      scale: { price: '5000', maxActive: '5', designers: '3-4' }
    }
    return defaults[planType] || defaults.launch
  }

  const handlePlanChange = (planType) => {
    setSelectedPlan(planType)
    if (planType !== currentPlan || !customConfig.price) {
      setConfig(getDefaultsForPlan(planType))
    }
  }

  const handleSave = () => {
    onSave(selectedPlan, config)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${
            selectedPlan === 'scale' ? 'bg-gray-900' : 'bg-[#8B7355]'
          }`}>
            {selectedPlan === 'launch' ? '🚀' : selectedPlan === 'growth' ? '📈' : '⚡'}
          </div>
          <h3 className="font-serif text-xl">
            Configure {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Set up custom pricing and capacity for {clientName}.
        </p>

        {/* Plan Type Selector */}
        <div className="mb-5">
          <label className="label">Plan Type</label>
          <div className="flex gap-2">
            {['launch', 'growth', 'scale'].map(plan => (
              <button
                key={plan}
                onClick={() => handlePlanChange(plan)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlan === plan 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {selectedPlan === 'launch' && 'Best for early-stage startups'}
            {selectedPlan === 'growth' && 'Best for Seed to Series B'}
            {selectedPlan === 'scale' && 'Best for Enterprise & beyond'}
          </p>
        </div>

        {/* Price */}
        <div className="mb-5">
          <label className="label">Monthly Price</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={config.price}
              onChange={(e) => setConfig({ ...config, price: e.target.value })}
              className="input pl-8 pr-16"
              placeholder="2000"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/month</span>
          </div>
        </div>

        {/* Max Active & Designers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Max Active Requests</label>
            <input
              type="text"
              value={config.maxActive}
              onChange={(e) => setConfig({ ...config, maxActive: e.target.value })}
              className="input"
              placeholder="e.g., 3"
            />
          </div>
          <div>
            <label className="label">Dedicated Designers</label>
            <input
              type="text"
              value={config.designers}
              onChange={(e) => setConfig({ ...config, designers: e.target.value })}
              className="input"
              placeholder="e.g., 2 or 3-4"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Plan Preview
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-serif text-xl text-gray-900">
                {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
              </div>
              <div className="text-sm text-gray-500">
                {selectedPlan === 'launch' && 'Early-Stage Startups'}
                {selectedPlan === 'growth' && 'Seed to Series B'}
                {selectedPlan === 'scale' && 'Enterprise & Beyond'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">
                ${parseInt(config.price || 0).toLocaleString()}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
            <span>✓ {config.maxActive} active request{parseInt(config.maxActive) !== 1 ? 's' : ''}</span>
            <span>✓ {config.designers} designer{config.designers !== '1' ? 's' : ''}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleSave} className="btn-primary flex-1">
            {currentPlan === selectedPlan ? 'Update Plan' : `Switch to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`}
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
