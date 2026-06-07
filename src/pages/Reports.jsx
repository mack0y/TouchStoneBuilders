import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports, convertToCSV, downloadCSV } from '../hooks/useReports'
import PageHeader from '../components/ui/PageHeader'
import DateRangePicker from '../components/ui/DateRangePicker'
import LoadingScreen from '../components/ui/LoadingScreen'
import { peso, dateFmt } from '../lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const tabs = [
  { id: 'daily', label: 'Daily Sales' },
  { id: 'category', label: 'By Category' },
  { id: 'products', label: 'Top Products' },
  { id: 'customers', label: 'By Customer' },
]

const CHART_COLORS = ['#1e3a5f', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#c2410c']

export default function Reports() {
  const [activeTab, setActiveTab] = useState('daily')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const { dailySales, salesByCategory, topProducts, salesByCustomer, loading, error } = useReports({ startDate, endDate, categoryFilter })

  function handleDateChange({ startDate: s, endDate: e }) {
    setStartDate(s)
    setEndDate(e)
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader title="Reports" description="Sales analytics and insights" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="card-pro mb-4">
        <div className="p-4">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
        </div>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-slate-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'daily' && dailySales && <DailySalesTab data={dailySales} startDate={startDate} endDate={endDate} />}
        {activeTab === 'category' && salesByCategory && <SalesByCategoryTab data={salesByCategory} startDate={startDate} endDate={endDate} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} />}
        {activeTab === 'products' && topProducts && <TopProductsTab data={topProducts} startDate={startDate} endDate={endDate} />}
        {activeTab === 'customers' && salesByCustomer && <SalesByCustomerTab data={salesByCustomer} startDate={startDate} endDate={endDate} />}
      </div>
    </div>
  )
}

/* ── Shared Components ── */

function KpiCard({ label, value, icon, color }) {
  return (
    <div className="kpi-card p-4 flex items-start gap-3">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color || 'bg-[#1e3a5f]/10 text-[#1e3a5f]'}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function ExportButton({ onClick, label }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm text-slate-600 no-print" onClick={onClick}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {label || 'Export CSV'}
    </button>
  )
}

function PrintButton() {
  return (
    <button type="button" className="btn btn-ghost btn-sm text-slate-600 no-print" onClick={() => window.print()}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m0 0a48.463 48.463 0 0110.5 0m-10.5 0V5.375c0-.621.504-1.125 1.125-1.125h4.125c.621 0 1.125.504 1.125 1.125v3.026" />
      </svg>
      Print
    </button>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-3 text-slate-300">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  )
}

/* ── Daily Sales Tab ── */

function DailySalesTab({ data, startDate, endDate }) {
  const navigate = useNavigate()

  function handleExport() {
    const csv = convertToCSV(
      data.sales.map(s => ({
        invoice: s.inv_no || `#${s.id}`,
        customer: s.customer,
        items: s.itemCount,
        total: s.total.toFixed(2),
        discount: s.discount.toFixed(2),
        date: new Date(s.created_at).toLocaleDateString('en-PH'),
      })),
      ['invoice', 'customer', 'items', 'total', 'discount', 'date']
    )
    downloadCSV(csv, `daily-sales-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  if (data.sales.length === 0) {
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger-children">
          <KpiCard label="Total Revenue" value={peso(0)} icon={<DollarIcon />} color="bg-green-50 text-green-600" />
          <KpiCard label="Transactions" value="0" icon={<ReceiptIcon />} color="bg-blue-50 text-blue-600" />
          <KpiCard label="Items Sold" value="0" icon={<BoxIcon />} color="bg-amber-50 text-amber-600" />
          <KpiCard label="Avg Order Value" value={peso(0)} icon={<ChartIcon />} color="bg-purple-50 text-purple-600" />
        </div>
        <EmptyState message="No sales found for this period" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4 no-print">
        <PrintButton />
        <ExportButton onClick={handleExport} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger-children">
        <KpiCard label="Total Revenue" value={peso(data.totalRevenue)} icon={<DollarIcon />} color="bg-green-50 text-green-600" />
        <KpiCard label="Transactions" value={data.totalSalesCount.toLocaleString()} icon={<ReceiptIcon />} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Items Sold" value={data.totalItems.toLocaleString()} icon={<BoxIcon />} color="bg-amber-50 text-amber-600" />
        <KpiCard label="Avg Order Value" value={peso(data.avgOrderValue)} icon={<ChartIcon />} color="bg-purple-50 text-purple-600" />
      </div>

      {data.totalDiscount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2">
          <span className="font-medium">Total Discounts Given:</span> {peso(data.totalDiscount)}
        </div>
      )}

      <div className="card-pro">
        <div className="p-3">
          <div className="overflow-x-auto mobile-card-view">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Total</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((sale, i) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <td className="text-slate-400 text-sm">{i + 1}</td>
                    <td data-label="Invoice" className="font-medium text-[#1e3a5f] text-sm">{sale.inv_no || `#${sale.id}`}</td>
                    <td data-label="Customer" className="text-slate-700">{sale.customer}</td>
                    <td data-label="Items" className="text-right text-sm">{sale.itemCount}</td>
                    <td data-label="Total" className="text-right font-semibold text-slate-800">{peso(sale.total)}</td>
                    <td data-label="Date" className="text-sm text-slate-500">{dateFmt(sale.created_at)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2 border-slate-200">
                  <td colSpan={3} className="text-sm">Total ({data.totalSalesCount} transactions)</td>
                  <td className="text-right text-sm">{data.totalItems.toLocaleString()}</td>
                  <td className="text-right text-green-600">{peso(data.totalRevenue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sales by Category Tab ── */

function SalesByCategoryTab({ data, startDate, endDate, categoryFilter, setCategoryFilter }) {
  const [expandedCategory, setExpandedCategory] = useState(null)

  // Get unique category names from the data for the dropdown
  const categoryNames = [...new Set(data.categories.map(c => c.name))].sort()

  function handleExport() {
    const rows = []
    data.categories.forEach(cat => {
      cat.products.forEach(p => {
        rows.push({
          category: cat.name,
          product: p.productName,
          sku: p.sku,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          subtotal: p.subtotal,
          invoice: p.invoiceNo,
          customer: p.customer,
          date: new Date(p.date).toLocaleDateString('en-PH'),
        })
      })
    })
    const csv = convertToCSV(rows, ['category', 'product', 'sku', 'quantity', 'unitPrice', 'subtotal', 'invoice', 'customer', 'date'])
    downloadCSV(csv, `sales-by-category-${categoryFilter || 'all'}-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  if (data.categories.length === 0) {
    return <EmptyState message="No sales data for this period" />
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 no-print">
          <label className="text-sm font-medium text-slate-600">Filter by category:</label>
          <select
            id="category-report-filter"
            name="categoryFilter"
            className="select select-bordered select-sm w-full sm:w-56"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categoryNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {categoryFilter && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-slate-500"
              onClick={() => setCategoryFilter('')}
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-2 no-print">
          <PrintButton />
          <ExportButton onClick={handleExport} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 stagger-children">
        <KpiCard label="Total Revenue" value={peso(data.grandTotal)} icon={<DollarIcon />} color="bg-green-50 text-green-600" />
        <KpiCard label="Categories" value={data.categories.length.toString()} icon={<TagIcon />} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Top Category" value={data.categories[0]?.name || '—'} icon={<StarIcon />} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card-pro p-4">
          <h3 className="font-semibold text-sm text-slate-700 mb-4">Revenue by Category</h3>
          <div style={{ minHeight: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.categories} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={120} />
                <Tooltip formatter={(value) => [peso(value), 'Revenue']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-pro p-4">
          <h3 className="font-semibold text-sm text-slate-700 mb-4">Revenue Share</h3>
          <div style={{ minHeight: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [peso(value), 'Revenue']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Summary Table */}
      <div className="card-pro mb-4">
        <div className="p-3">
          <div className="overflow-x-auto mobile-card-view">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="text-right">Items Sold</th>
                  <th className="text-right">Products</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat, i) => (
                  <tr
                    key={cat.name}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                  >
                    <td data-label="Category">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-medium text-slate-800">{cat.name}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                          className={`w-4 h-4 text-slate-400 transition-transform ${expandedCategory === cat.name ? 'rotate-180' : ''}`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </td>
                    <td data-label="Items Sold" className="text-right text-sm">{cat.qty.toLocaleString()}</td>
                    <td data-label="Products" className="text-right text-sm">{cat.products.length}</td>
                    <td data-label="Revenue" className="text-right font-semibold text-slate-800">{peso(cat.revenue)}</td>
                    <td data-label="Share" className="text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 hidden sm:block">
                          <div className="h-1.5 rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                        <span className="text-slate-600 font-medium">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2 border-slate-200">
                  <td>Total</td>
                  <td className="text-right text-sm">{data.categories.reduce((s, c) => s + c.qty, 0).toLocaleString()}</td>
                  <td className="text-right text-sm">{data.categories.reduce((s, c) => s + c.products.length, 0)}</td>
                  <td className="text-right text-green-600">{peso(data.grandTotal)}</td>
                  <td className="text-right text-sm">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Expanded Category Product Details */}
      {expandedCategory && (
        <div className="card-pro animate-fade-in">
          <div className="p-3">
            {(() => {
              const cat = data.categories.find(c => c.name === expandedCategory)
              if (!cat) return null

              const catTotal = cat.products.reduce((s, p) => s + p.subtotal, 0)

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm text-slate-700">
                      <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: CHART_COLORS[data.categories.indexOf(cat) % CHART_COLORS.length] }} />
                      {cat.name} — {peso(catTotal)}
                    </h4>
                    <span className="text-xs text-slate-400">{cat.products.length} products</span>
                  </div>

                  <div className="overflow-x-auto mobile-card-view">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Invoice</th>
                          <th>Customer</th>
                          <th className="text-right">Qty</th>
                          <th className="text-right">Unit Price</th>
                          <th className="text-right">Subtotal</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.products.map((p, i) => (
                          <tr key={i}>
                            <td data-label="Product">
                              <div className="font-medium text-sm text-slate-800">{p.productName}</div>
                              <div className="text-xs text-slate-400">{p.sku}</div>
                            </td>
                            <td data-label="Invoice" className="text-sm text-[#1e3a5f] font-medium">{p.invoiceNo}</td>
                            <td data-label="Customer" className="text-sm text-slate-600">{p.customer}</td>
                            <td data-label="Qty" className="text-right text-sm">{p.quantity.toLocaleString()}</td>
                            <td data-label="Unit Price" className="text-right text-sm text-slate-600">{peso(p.unitPrice)}</td>
                            <td data-label="Subtotal" className="text-right font-medium text-sm">{peso(p.subtotal)}</td>
                            <td data-label="Date" className="text-xs text-slate-500">{dateFmt(p.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold border-t-2 border-slate-200">
                          <td colSpan={3}>Total ({cat.products.length} items)</td>
                          <td className="text-right text-sm">{cat.qty.toLocaleString()}</td>
                          <td></td>
                          <td className="text-right text-green-600">{peso(catTotal)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Top Products Tab ── */

function TopProductsTab({ data, startDate, endDate }) {
  function handleExport() {
    const csv = convertToCSV(
      data.products.map((p, i) => ({
        rank: i + 1,
        product: p.name,
        sku: p.sku,
        category: p.category,
        quantitySold: p.totalQty,
        revenue: p.revenue.toFixed(2),
        cogs: p.cogs.toFixed(2),
        profit: p.profit.toFixed(2),
      })),
      ['rank', 'product', 'sku', 'category', 'quantitySold', 'revenue', 'cogs', 'profit']
    )
    downloadCSV(csv, `top-products-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  if (data.products.length === 0) {
    return <EmptyState message="No sales data for this period" />
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4 no-print">
        <PrintButton />
        <ExportButton onClick={handleExport} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger-children">
        <KpiCard label="Products Sold" value={data.products.length.toString()} icon={<BoxIcon />} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Total Revenue" value={peso(data.products.reduce((s, p) => s + p.revenue, 0))} icon={<DollarIcon />} color="bg-green-50 text-green-600" />
        <KpiCard label="Total COGS" value={peso(data.products.reduce((s, p) => s + p.cogs, 0))} icon={<ReceiptIcon />} color="bg-amber-50 text-amber-600" />
        <KpiCard label="Total Items" value={data.products.reduce((s, p) => s + p.totalQty, 0).toLocaleString()} icon={<ChartIcon />} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="card-pro p-4 mb-6">
        <h3 className="font-semibold text-sm text-slate-700 mb-4">Top 10 Products by Quantity</h3>
        <div style={{ minHeight: 300 }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.products.slice(0, 10)} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" angle={-30} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="totalQty" name="Quantity Sold" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-pro">
        <div className="p-3">
          <div className="overflow-x-auto mobile-card-view">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="text-right">Qty Sold</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">COGS</th>
                  <th className="text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p, i) => (
                  <tr key={p.sku || i}>
                    <td data-label="Rank">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i < 3 ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td data-label="Product">
                      <div className="font-medium text-sm text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.sku}</div>
                    </td>
                    <td data-label="Category" className="text-sm text-slate-500">{p.category}</td>
                    <td data-label="Qty Sold" className="text-right text-sm font-medium">{p.totalQty.toLocaleString()}</td>
                    <td data-label="Revenue" className="text-right text-sm">{peso(p.revenue)}</td>
                    <td data-label="COGS" className="text-right text-sm text-slate-500">{peso(p.cogs)}</td>
                    <td data-label="Profit" className={`text-right font-medium text-sm ${p.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {peso(p.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sales by Customer Tab ── */

function SalesByCustomerTab({ data, startDate, endDate }) {
  function handleExport() {
    const csv = convertToCSV(
      data.customers.map(c => ({
        customer: c.name,
        phone: c.phone,
        salesCount: c.salesCount,
        totalSpent: c.totalSpent.toFixed(2),
        avgOrder: c.avgOrder.toFixed(2),
      })),
      ['customer', 'phone', 'salesCount', 'totalSpent', 'avgOrder']
    )
    downloadCSV(csv, `sales-by-customer-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  if (data.customers.length === 0) {
    return <EmptyState message="No sales data for this period" />
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4 no-print">
        <PrintButton />
        <ExportButton onClick={handleExport} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger-children">
        <KpiCard label="Total Revenue" value={peso(data.totalRevenue)} icon={<DollarIcon />} color="bg-green-50 text-green-600" />
        <KpiCard label="Unique Customers" value={data.uniqueCustomers.toString()} icon={<UsersIcon />} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Walk-in Sales" value={(data.totalCustomers - data.uniqueCustomers).toString()} icon={<ReceiptIcon />} color="bg-amber-50 text-amber-600" />
        <KpiCard label="Avg Revenue/Customer" value={peso(data.uniqueCustomers > 0 ? data.totalRevenue / data.uniqueCustomers : 0)} icon={<ChartIcon />} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="card-pro p-4 mb-6">
        <h3 className="font-semibold text-sm text-slate-700 mb-4">Top Customers by Revenue</h3>
        <div style={{ minHeight: 300 }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.customers.slice(0, 10)} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [peso(value), 'Total Spent']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="totalSpent" name="Total Spent" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-pro">
        <div className="p-3">
          <div className="overflow-x-auto mobile-card-view">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="text-right">Sales</th>
                  <th className="text-right">Total Spent</th>
                  <th className="text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c, i) => (
                  <tr key={c.name + i}>
                    <td className="text-slate-400 text-sm">{i + 1}</td>
                    <td data-label="Customer" className="font-medium text-slate-800">
                      {c.name}
                      {c.name === 'Walk-in' && <span className="badge badge-ghost badge-xs ml-1">Walk-in</span>}
                    </td>
                    <td data-label="Phone" className="text-sm text-slate-500">{c.phone}</td>
                    <td data-label="Sales" className="text-right text-sm">{c.salesCount}</td>
                    <td data-label="Total Spent" className="text-right font-semibold text-slate-800">{peso(c.totalSpent)}</td>
                    <td data-label="Avg Order" className="text-right text-sm text-slate-500">{peso(c.avgOrder)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2 border-slate-200">
                  <td colSpan={3}>Total ({data.totalCustomers} customers)</td>
                  <td className="text-right text-sm">{data.customers.reduce((s, c) => s + c.salesCount, 0)}</td>
                  <td className="text-right text-green-600">{peso(data.totalRevenue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Icon Components ── */

function DollarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 015 17.119V5a2 2 0 012-2h6m4 0v.003m0 0c0 1.113.285 2.16.786 3.07M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07m0 0A4.125 4.125 0 0112 9.375a4.125 4.125 0 01-2.214 2.633M7.5 6.375a3 3 0 00-2.986 3.462A3 3 0 004 12.75c0 .968.48 1.832 1.218 2.352m5.82-6.627a3 3 0 00-2.986 3.462m0 0A3 3 0 007.5 12.75m0 0c0 .968.48 1.832 1.218 2.352m5.82-6.627V3.375m0 3.75a3 3 0 100 6h3.75" />
    </svg>
  )
}
