'use client'

import { useState } from 'react'
import FileDropzone from '@/components/v2/primitives/FileDropzone'
import FileList from '@/components/v2/primitives/FileList'

// Brand assets & working files tab — shared by client and admin Settings.
export default function BrandAssetsTab({ client, onRefresh }) {
  const [assets, setAssets] = useState(client.brand_assets || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const persist = async (next) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandAssets: next }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAssets(next)
      onRefresh?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onUploaded = (uploaded) => {
    const stamped = uploaded.map((f) => ({ ...f, uploadedBy: 'You' }))
    persist([...assets, ...stamped])
  }

  const onRemove = (index) => persist(assets.filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Brand assets and working files</h3>
        <p className="text-xs text-gray-400">
          Files designers reference for every request — guidelines, logos, fonts, photos.
        </p>
      </div>
      <FileDropzone clientId={client.id} onUploaded={onUploaded} disabled={saving} />
      <FileList files={assets} editable onRemove={onRemove} emptyLabel="No assets uploaded yet" />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
