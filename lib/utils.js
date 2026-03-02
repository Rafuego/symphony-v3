// Utility functions for Symphony

/**
 * Calculate business hours remaining (skips weekends)
 */
export function getBusinessHoursRemaining(startDate, totalBusinessHours, now = new Date()) {
  const start = new Date(startDate)
  let businessHoursElapsed = 0
  let current = new Date(start)
  
  while (current < now && businessHoursElapsed < totalBusinessHours * 2) {
    const dayOfWeek = current.getDay()
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const nextHour = new Date(current.getTime() + 60 * 60 * 1000)
      if (nextHour <= now) {
        businessHoursElapsed += 1
        current = nextHour
      } else {
        businessHoursElapsed += (now - current) / (60 * 60 * 1000)
        break
      }
    } else {
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
    }
  }
  
  const businessHoursRemaining = Math.max(0, totalBusinessHours - businessHoursElapsed)
  
  if (businessHoursRemaining <= 0) {
    return { expired: true, hours: 0, minutes: 0, percentRemaining: 0, totalHours: totalBusinessHours }
  }
  
  const hours = Math.floor(businessHoursRemaining)
  const minutes = Math.floor((businessHoursRemaining - hours) * 60)
  const percentRemaining = (businessHoursRemaining / totalBusinessHours) * 100
  
  return { expired: false, hours, minutes, percentRemaining, totalHours: totalBusinessHours }
}

/**
 * Simple markdown to HTML converter
 */
export function renderMarkdown(text) {
  if (!text) return ''
  
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br />')
  
  return html
}
