import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'

export default function DataTable({ columns, data, search, searchPlaceholder }) {
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div>
      {search !== false && (
        <div className="mb-3">
          <input
            className="input input-bordered input-sm w-full max-w-xs"
            placeholder={searchPlaceholder || 'Search...'}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zinc table-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    aria-sort={header.column.getIsSorted() || undefined}
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-base-content/40 py-8" role="status">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="text-base-content/50">
          {table.getPageCount() > 0
            ? `Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`
            : 'No results'}
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-xs" aria-label="First page" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>««</button>
          <button className="btn btn-ghost btn-xs" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>«</button>
          <button className="btn btn-ghost btn-xs" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>»</button>
          <button className="btn btn-ghost btn-xs" aria-label="Last page" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>»»</button>
        </div>
      </div>
    </div>
  )
}
