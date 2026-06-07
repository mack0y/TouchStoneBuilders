import { useState } from 'react'
import { useReports, convertToCSV, downloadCSV } from '../hooks/useReports'
import PageHeader from '../components/ui/PageHeader'
import DateRangePicker from '../components/ui/DateRangePicker'
import LoadingScreen from '../components/ui/LoadingScreen'
import { peso } from '../lib/format'

const tabs = [
  { id: 'sales', label: 'Sales Report' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'profit', label: 'Profit & Loss' },
]

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const { salesReport, inventoryReport, profitReport, loading, error } = useReports({ startDate, endDate })

  function handleDateChange({ startDate: s, endDate: e }) {
    setStartDate(s)
    setEndDate(e)
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader title="Reports" description="Sales, inventory, and profit analysis" />

      {error && <div className="alert alert-error text-sm mb-4" role="alert">{error}</div>}

      <div className="card bg-base-100 border border-base-200/80 card-hover mb-4">
        <div className="card-body p-4">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
        </div>
      </div>

      <div role="tablist" className="tabs tabs-bordered mb-4 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`tab transition-all duration-150 ${activeTab === tab.id ? 'tab-active font-semibold' : 'hover:bg-base-200/50'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'sales' && salesReport && renderSalesTab(salesReport, startDate, endDate)}
        {activeTab === 'inventory' && inventoryReport && renderInventoryTab(inventoryReport)}
        {activeTab === 'profit' && profitReport && renderProfitTab(profitReport, startDate, endDate)}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="card bg-base-100 border border-base-200/80 card-hover animate-fade-in-up">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-base-content/50 font-medium">{label}</p>
          {icon}
        </div>
        <p className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 ${color || ''}`}>{value}</p>
      </div>
    </div>
  )
}

function renderSalesTab(report, startDate, endDate) {
  const suffix = startDate || endDate ? 'Filtered' : 'All Time'

  function handleExport() {
    const csv = convertToCSV(
      [
        { metric: 'Total Sales (Count)', value: report.totalSales },
        { metric: 'Total Revenue', value: report.totalRevenue },
        { metric: 'Total Discount', value: report.totalDiscount },
        { metric: 'Items Sold', value: report.totalItems },
        { metric: 'Avg Order Value', value: report.avgOrderValue },
      ],
      ['metric', 'value']
    )
    downloadCSV(csv, `sales-report-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Sales" value={report.totalSales.toLocaleString()} />
        <SummaryCard label="Total Revenue" value={peso(report.totalRevenue)} color="text-success" />
        <SummaryCard label="Total Discount" value={peso(report.totalDiscount)} color="text-warning" />
        <SummaryCard label="Items Sold" value={report.totalItems.toLocaleString()} />
        <SummaryCard label="Avg Order Value" value={peso(report.avgOrderValue)} color="text-info" />
      </div>

      <div className="text-xs text-base-content/40 font-medium">
        Showing report: <span className="badge badge-ghost badge-sm">{suffix}</span>
      </div>
    </div>
  )
}

function renderInventoryTab(report) {
  function handleExport() {
    const csv = convertToCSV(report.products, ['name', 'sku', 'category', 'stock', 'unit', 'price', 'cost', 'stockValue', 'costValue'])
    downloadCSV(csv, `inventory-report-${new Date().toISOString().split('T')[0]}.csv`)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Products" value={report.totalProducts.toLocaleString()} />
        <SummaryCard label="Stock Value (Selling)" value={peso(report.totalStockValue)} color="text-info" />
        <SummaryCard label="Stock Value (Cost)" value={peso(report.totalCostValue)} color="text-warning" />
        <SummaryCard label="Low Stock Items" value={report.lowStockCount.toLocaleString()} color={report.lowStockCount > 0 ? 'text-error' : ''} />
        <SummaryCard label="Out of Stock" value={report.outOfStockCount.toLocaleString()} color={report.outOfStockCount > 0 ? 'text-error' : ''} />
      </div>

      <div className="card bg-base-100 border border-base-200/80">
        <div className="card-body p-3">
          <div className="overflow-x-auto mobile-card-view">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th className="text-xs uppercase tracking-wider">Product</th>
                  <th className="text-xs uppercase tracking-wider">SKU</th>
                  <th className="text-xs uppercase tracking-wider">Category</th>
                  <th className="text-xs text-right uppercase tracking-wider">Stock</th>
                  <th className="text-xs text-right uppercase tracking-wider">Price</th>
                  <th className="text-xs text-right uppercase tracking-wider">Cost</th>
                  <th className="text-xs text-right uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                {report.products.map((p) => (
                  <tr key={p.id} className={`hover:bg-base-200/30 transition-colors ${p.stock <= 0 ? 'bg-error/5' : ''}`}>
                    <td data-label="Product" className="font-medium">{p.name}</td>
                    <td data-label="SKU" className="text-base-content/50 text-sm">{p.sku}</td>
                    <td data-label="Category" className="text-base-content/50 text-sm">{p.category}</td>
                    <td data-label="Stock" className={`text-right ${p.stock <= 0 ? 'text-error font-medium' : ''}`}>
                      {p.stock.toLocaleString()} {p.unit}
                    </td>
                    <td data-label="Price" className="text-right text-sm">{peso(p.price)}</td>
                    <td data-label="Cost" className="text-right text-sm">{peso(p.cost)}</td>
                    <td data-label="Value" className="text-right font-medium">{peso(p.stockValue)}</td>
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

function renderProfitTab(report, startDate, endDate) {
  function handleExport() {
    const csv = convertToCSV(
      [
        { metric: 'Total Revenue', value: `₱${report.totalRevenue.toFixed(2)}` },
        { metric: 'Total COGS', value: `₱${report.totalCOGS.toFixed(2)}` },
        { metric: 'Total Discount', value: `₱${report.totalDiscount.toFixed(2)}` },
        { metric: 'Gross Profit', value: `₱${report.grossProfit.toFixed(2)}` },
        { metric: 'Profit Margin', value: `${report.profitMargin.toFixed(2)}%` },
      ],
      ['metric', 'value']
    )
    downloadCSV(csv, `profit-report-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  function handleProductExport() {
    const csv = convertToCSV(
      report.topProductsByProfit.map(p => ({
        name: p.name,
        sku: p.sku,
        revenue: `₱${p.revenue.toFixed(2)}`,
        cogs: `₱${p.cogs.toFixed(2)}`,
        profit: `₱${p.profit.toFixed(2)}`,
        margin: `${p.margin.toFixed(2)}%`,
        qty: p.qty,
      })),
      ['name', 'sku', 'revenue', 'cogs', 'profit', 'margin', 'qty']
    )
    downloadCSV(csv, `profit-products-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4 flex-wrap">
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export Summary
        </button>
        {report.topProductsByProfit.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleProductExport}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export Products
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Revenue" value={peso(report.totalRevenue)} color="text-success" />
        <SummaryCard label="Total COGS" value={peso(report.totalCOGS)} color="text-warning" />
        <SummaryCard label="Gross Profit" value={peso(report.grossProfit)} color={report.grossProfit >= 0 ? 'text-success' : 'text-error'} />
        <SummaryCard label="Profit Margin" value={`${report.profitMargin.toFixed(1)}%`} color={report.profitMargin >= 0 ? 'text-success' : 'text-error'} />
      </div>

      <div className="card bg-base-100 border border-base-200/80">
        <div className="card-body p-3">
          <h3 className="font-semibold text-sm mb-3">Top Products by Profit</h3>
          {report.topProductsByProfit.length === 0 ? (
            <p className="text-sm text-base-content/30 py-8 text-center">No sales data</p>
          ) : (
            <div className="overflow-x-auto mobile-card-view">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th className="text-xs uppercase tracking-wider">Product</th>
                    <th className="text-xs text-right uppercase tracking-wider">Qty</th>
                    <th className="text-xs text-right uppercase tracking-wider">Revenue</th>
                    <th className="text-xs text-right uppercase tracking-wider">COGS</th>
                    <th className="text-xs text-right uppercase tracking-wider">Profit</th>
                    <th className="text-xs text-right uppercase tracking-wider">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProductsByProfit.map((p, i) => (
                    <tr key={p.sku || i} className="hover:bg-base-200/30 transition-colors">
                      <td data-label="Product">
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-base-content/40">{p.sku}</div>
                      </td>
                      <td data-label="Qty" className="text-right text-sm">{p.qty.toLocaleString()}</td>
                      <td data-label="Revenue" className="text-right text-sm">{peso(p.revenue)}</td>
                      <td data-label="COGS" className="text-right text-sm">{peso(p.cogs)}</td>
                      <td data-label="Profit" className={`text-right font-medium text-sm ${p.profit >= 0 ? 'text-success' : 'text-error'}`}>
                        {peso(p.profit)}
                      </td>
                      <td data-label="Margin" className={`text-right text-sm ${p.margin >= 0 ? 'text-success' : 'text-error'}`}>
                        {p.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
