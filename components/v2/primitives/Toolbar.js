'use client'

// Search field + sort/filter controls. The Table/Kanban toggle lives in the board
// header (next to the client name), so it is NOT here.
export default function Toolbar({ search, onSearch, sort, onSort }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 sm:flex-none sm:w-56">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden="true">
          ⌕
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
        />
      </div>
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
        title="Sort"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="due">Due date</option>
      </select>
    </div>
  )
}
