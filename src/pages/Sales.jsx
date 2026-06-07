import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSales } from '../hooks/useSales'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import { createColumnHelper } from '@tanstack/react-table'
import { peso, dateFmt } from '../lib/format'

function rangeLabel(startDate, endDate) {
  if (startDate && endDate) return `from ${startDate} to ${endDate}`
  if (startDate) return `from ${startDate}`
  if (endDate) return `up to ${endDate}`
  return 'total'
}

export default function Sales() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { sales, loading, error } = useSales({ startDate, endDate })

  const rangeText = useMemo(() => rangeLabel(startDate, endDate), [startDate, endDate])

  function clearFilter() {
    setStartDate('')
    setEndDate('')
  }

  const columnHelper = createColumnHelper()
  const columns = [
    columnHelper.display({
      id: 'invoice_no',
      header: 'Invoice',
      enableSorting: false,
      cell: (info) => (
        <Link to={`/sales/${info.row.original.id}`} className="text-[#1e3a5f] font-medium hover:underline">
          {info.row.original.invoice_no}
        </Link>
      ),
    }),
    columnHelper.accessor((row) => row.customers?.name || 'Walk-in', {
      id: 'customer',
      header: 'Customer',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.sale_items?.[0]?.count ?? 0, {
      id: 'items',
      header: 'Items',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => Number(row.total) || 0, {
      id: 'total',
      header: 'Total',
      enableSorting: true,
      cell: (info) => peso(info.row.original.total),
    }),
    columnHelper.accessor('created_at', {
      header: 'Date',
      enableSorting: true,
      cell: (info) => dateFmt(info.getValue()),
    }),
  ]

  return (
    <div>
      <PageHeader
        title="Sales"
        description={loading ? 'Loading...' : `${sales.length} sale${sales.length !== 1 ? 's' : ''} ${rangeText}`}
        actions={
          <button className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" onClick={() => navigate('/sales/new')}>
            + New Sale
          </button>
        }
      />

      <div className="card-pro mb-4">
        <div className="p-3 flex-row items-end gap-3 flex-wrap flex">
          <label className="form-control" htmlFor="sales-from">
            <span className="label-text text-xs text-slate-500">From</span>
            <input
              id="sales-from"
              type="date"
              className="input input-bordered input-sm text-sm"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="form-control" htmlFor="sales-to">
            <span className="label-text text-xs text-slate-500">To</span>
            <input
              id="sales-to"
              type="date"
              className="input input-bordered input-sm text-sm"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          {(startDate || endDate) && (
            <button className="btn btn-ghost btn-sm text-slate-600" onClick={clearFilter}>Clear</button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span></div>
      ) : (
        <div className="card-pro">
          <div className="p-3">
            <DataTable columns={columns} data={sales} searchPlaceholder="Search invoices..." />
          </div>
        </div>
      )}
    </div>
  )
}
