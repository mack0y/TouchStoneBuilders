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
        <Link to={`/sales/${info.row.original.id}`} className="link link-primary font-medium">
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
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/sales/new')}>
            + New Sale
          </button>
        }
      />

      <div className="card bg-base-100 border border-base-300 mb-4">
        <div className="card-body p-3 flex-row items-end gap-3 flex-wrap">
          <label className="form-control" htmlFor="sales-from">
            <span className="label-text text-xs">From</span>
            <input
              id="sales-from"
              type="date"
              className="input input-bordered input-sm"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="form-control" htmlFor="sales-to">
            <span className="label-text text-xs">To</span>
            <input
              id="sales-to"
              type="date"
              className="input input-bordered input-sm"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          {(startDate || endDate) && (
            <button className="btn btn-soft btn-sm" onClick={clearFilter}>Clear</button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm mb-4" role="alert">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-3">
            <DataTable columns={columns} data={sales} searchPlaceholder="Search invoices..." />
          </div>
        </div>
      )}
    </div>
  )
}
