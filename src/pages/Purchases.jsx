import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePurchases } from '../hooks/usePurchases'
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

export default function Purchases() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { purchases, loading, error } = usePurchases({ startDate, endDate })

  const rangeText = useMemo(() => rangeLabel(startDate, endDate), [startDate, endDate])

  function clearFilter() {
    setStartDate('')
    setEndDate('')
  }

  const columnHelper = createColumnHelper()
  const columns = [
    columnHelper.accessor('created_at', {
      header: 'Date',
      enableSorting: true,
      cell: (info) => dateFmt(info.getValue()),
    }),
    columnHelper.accessor((row) => row.products?.name || 'Unknown', {
      id: 'product',
      header: 'Product',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.products?.sku || '-', {
      id: 'sku',
      header: 'SKU',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.suppliers?.name || 'Direct', {
      id: 'supplier',
      header: 'Supplier',
      enableSorting: true,
    }),
    columnHelper.accessor('quantity', {
      header: 'Qty',
      enableSorting: true,
      cell: (info) => Number(info.getValue()).toLocaleString(),
    }),
    columnHelper.accessor((row) => row.products?.unit || 'pcs', {
      id: 'unit',
      header: 'Unit',
      enableSorting: true,
    }),
    columnHelper.accessor('unit_cost', {
      header: 'Unit Cost',
      enableSorting: true,
      cell: (info) => peso(info.getValue()),
    }),
    columnHelper.accessor('total_cost', {
      header: 'Total Cost',
      enableSorting: true,
      cell: (info) => peso(info.getValue()),
    }),
  ]

  return (
    <div>
      <PageHeader
        title="Stock In"
        description={loading ? 'Loading...' : `${purchases.length} record${purchases.length !== 1 ? 's' : ''} ${rangeText}`}
        actions={
          <button className="btn btn-primary btn-sm shadow-sm" onClick={() => navigate('/stock-in/new')}>
            + New Stock In
          </button>
        }
      />

      <div className="card bg-base-100 border border-base-200/80 card-hover mb-4">
        <div className="card-body p-3 flex-row items-end gap-3 flex-wrap">
          <label className="form-control" htmlFor="purchases-from">
            <span className="label-text text-xs">From</span>
            <input
              id="purchases-from"
              type="date"
              className="input input-bordered input-sm"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="form-control" htmlFor="purchases-to">
            <span className="label-text text-xs">To</span>
            <input
              id="purchases-to"
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
        <div className="card bg-base-100 border border-base-200/80 card-hover">
          <div className="card-body p-3">
            <            DataTable columns={columns} data={purchases} searchPlaceholder="Search stock in records..." />
          </div>
        </div>
      )}
    </div>
  )
}
