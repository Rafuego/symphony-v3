'use client'

import { useState, useEffect } from 'react'

export default function AlertsPanel({ onSelectClient }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unread'

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications${filter === 'unread' ? '?unread=true' : ''}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [filter])

  const markAsRead = async (ids) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_request': return '📥'
      case 'status_change': return '🔄'
      case 'extension_request': return '⏰'
      case 'client_created': return '👤'
      default: return '🔔'
    }
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead([notification.id])
    }
    // Navigate to client if available
    if (notification.client_id && onSelectClient) {
      onSelectClient(notification.client_id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                filter === 'unread' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-[#8B7355] hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔔</div>
          <h3 className="font-serif text-xl text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-500">
            {filter === 'unread' ? 'All caught up! No unread notifications.' : 'Notifications will appear here when clients submit requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                notification.read 
                  ? 'bg-white border-gray-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{getTimeAgo(notification.created_at)}</span>
                    {notification.clients?.name && (
                      <>
                        <span>•</span>
                        <span>{notification.clients.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
