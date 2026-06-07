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
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              className="input input-bordered input-sm w-full max-w-xs pl-9 text-sm"
              placeholder={searchPlaceholder || 'Search...'}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto mobile-card-view">
        <table className="table table-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    aria-sort={header.column.getIsSorted() || undefined}
                    className={`${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-slate-50' : ''}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: '↑', desc: '↓' }[header.column.getIsSorted()] ?? ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} data-label={flexRender(cell.column.columnDef.header, cell.getContext())}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-slate-400 py-12" role="status">
                  <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 mb-2 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    <p className="text-sm">No results found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="text-slate-400 text-xs">
          {table.getPageCount() > 0
            ? `Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`
            : 'No results'}
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-xs rounded" aria-label="First page" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>««</button>
          <button className="btn btn-ghost btn-xs rounded" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>«</button>
          <button className="btn btn-ghost btn-xs rounded" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>»</button>
          <button className="btn btn-ghost btn-xs rounded" aria-label="Last page" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>»»</button>
        </div>
      </div>
    </div>
  )
}
