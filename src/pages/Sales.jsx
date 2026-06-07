import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSales } from '../hooks/useSales'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import { createColumnHelper } from '@tanstack/react-table'
import { peso, dateFmt } from '../lib/format'
import ConfirmModal from '../components/ui/ConfirmModal'
import { supabase } from '../lib/supabaseClient'

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
  const [activeTab, setActiveTab] = useState('sales')
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

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 border-b border-slate-200 mb-4">
        <button
          role="tab"
          type="button"
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'sales' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('sales')}
        >
          All Sales
        </button>
        <button
          role="tab"
          type="button"
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'deliveries' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('deliveries')}
        >
          Deliveries
          {sales.filter(s => s.delivery_address).length > 0 && (
            <span className="ml-1.5 badge badge-primary badge-sm">
              {sales.filter(s => s.delivery_address).length}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span></div>
      ) : activeTab === 'sales' ? (
        <div className="card-pro">
          <div className="p-3">
            <DataTable columns={columns} data={sales} searchPlaceholder="Search invoices..." />
          </div>
        </div>
      ) : (
        <DeliveriesList sales={sales} />
      )}
    </div>
  )
}

function DeliveriesList({ sales }) {
  const navigate = useNavigate()
  const deliveries = useMemo(() => sales.filter(s => s.delivery_address), [sales])

  if (deliveries.length === 0) {
    return (
      <div className="card-pro">
        <div className="p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.142-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <p className="text-sm text-slate-400">No delivery orders yet</p>
          <p className="text-xs text-slate-300 mt-1">Create a sale with delivery to see it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deliveries.map((sale) => (
        <div
          key={sale.id}
          className="card-pro p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/sales/${sale.id}`)}
        >
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[#1e3a5f] text-sm">{sale.invoice_no}</span>
                <span className="badge badge-primary badge-sm">Delivery</span>
              </div>
              <p className="text-sm text-slate-600">{sale.customers?.name || 'Walk-in'}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">📍 {sale.delivery_address}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-[#1e3a5f]">{peso(sale.total)}</p>
              {Number(sale.delivery_fee) > 0 && (
                <p className="text-xs text-blue-600">incl. {peso(sale.delivery_fee)} delivery</p>
              )}
              <p className="text-xs text-slate-400 mt-1">{dateFmt(sale.created_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
