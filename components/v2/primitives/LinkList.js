'use client'

import { useState } from 'react'
import IconButton from '@/components/v2/primitives/IconButton'
import { CopyIcon, CheckIcon, CloseIcon } from '@/components/v2/primitives/icons'

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function faviconFor(url) {
  try {
    const h = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${h}&sz=32`
  } catch {
    return null
  }
}

// Read-only or editable list of brief/reference links with favicons + copy buttons.
// links: string[]   onRemove(index) shown only when editable.
export default function LinkList({ links = [], editable = false, onRemove, emptyLabel = 'None' }) {
  const [copied, setCopied] = useState(null)

  const clean = (links || []).filter((l) => l && l.trim() !== '')
  if (clean.length === 0) {
    return <p className="text-sm text-gray-400">{emptyLabel}</p>
  }

  const copy = async (url, i) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(i)
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500)
    } catch {
      /* clipboard may be unavailable; no-op */
    }
  }

  return (
    <div className="space-y-2">
      {clean.map((url, i) => {
        const fav = faviconFor(url)
        return (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm group"
          >
            {fav ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fav} alt="" width={16} height={16} className="flex-shrink-0 rounded-sm" />
            ) : (
              <span className="text-gray-400" aria-hidden="true">🔗</span>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-gray-700 hover:text-[#8B7355]"
              title={url}
            >
              {hostname(url)}
              <span className="text-gray-400"> · {url.replace(/^https?:\/\//, '')}</span>
            </a>
            <IconButton
              icon={copied === i ? CheckIcon : CopyIcon}
              label={copied === i ? 'Copied' : 'Copy link'}
              size="sm"
              onClick={() => copy(url, i)}
              className="flex-shrink-0"
            />
            {editable && (
              <IconButton
                icon={CloseIcon}
                label="Remove link"
                variant="destructive"
                size="sm"
                onClick={() => onRemove?.(i)}
                className="flex-shrink-0"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
