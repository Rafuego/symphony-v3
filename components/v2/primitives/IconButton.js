'use client'

// Consistent icon button: 32x32 boxed with a hover state. Two variants:
//   default     — neutral gray hover, for edit/close/copy/download/etc
//   destructive — red hover, for delete/remove
//
// Usage:
//   <IconButton icon={PencilIcon} label="Edit" onClick={...} />
//   <IconButton icon={TrashIcon} label="Delete" variant="destructive" onClick={...} />
//
// The icon prop is a component (e.g. TrashIcon from ./icons). label is required
// for a11y (rendered as title + aria-label). size prop can override 'md' (32px).
export default function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const box = size === 'sm'
    ? 'w-7 h-7'
    : size === 'lg'
      ? 'w-9 h-9'
      : 'w-8 h-8'

  const variantClass = variant === 'destructive'
    ? 'text-gray-400 border-gray-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200'
    : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`${box} inline-flex items-center justify-center rounded-md border bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...rest}
    >
      <Icon size={size === 'sm' ? 14 : 16} />
    </button>
  )
}
