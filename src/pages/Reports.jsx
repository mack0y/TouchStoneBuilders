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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{error}</div>}

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
        {activeTab === 'sales' && salesReport && renderSalesTab(salesReport, startDate, endDate)}
        {activeTab === 'inventory' && inventoryReport && renderInventoryTab(inventoryReport)}
        {activeTab === 'profit' && profitReport && renderProfitTab(profitReport, startDate, endDate)}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card-pro animate-fade-in-up p-4">
      <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold text-slate-800 ${color || ''}`}>{value}</p>
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
        <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Sales" value={report.totalSales.toLocaleString()} />
        <SummaryCard label="Total Revenue" value={peso(report.totalRevenue)} color="text-green-600" />
        <SummaryCard label="Total Discount" value={peso(report.totalDiscount)} color="text-amber-600" />
        <SummaryCard label="Items Sold" value={report.totalItems.toLocaleString()} />
        <SummaryCard label="Avg Order Value" value={peso(report.avgOrderValue)} color="text-blue-600" />
      </div>

      <div className="text-xs text-slate-400 font-medium">
        Showing report: <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">{suffix}</span>
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
        <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Products" value={report.totalProducts.toLocaleString()} />
        <SummaryCard label="Stock Value (Selling)" value={peso(report.totalStockValue)} color="text-blue-600" />
        <SummaryCard label="Stock Value (Cost)" value={peso(report.totalCostValue)} color="text-amber-600" />
        <SummaryCard label="Low Stock Items" value={report.lowStockCount.toLocaleString()} color={report.lowStockCount > 0 ? 'text-red-600' : ''} />
        <SummaryCard label="Out of Stock" value={report.outOfStockCount.toLocaleString()} color={report.outOfStockCount > 0 ? 'text-red-600' : ''} />
      </div>

      <div className="card-pro">
        <div className="p-3">
          <div className="overflow-x-auto mobile-card-view">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {report.products.map((p) => (
                  <tr key={p.id} className={p.stock <= 0 ? 'bg-red-50/50' : ''}>
                    <td data-label="Product" className="font-medium text-slate-800">{p.name}</td>
                    <td data-label="SKU" className="text-slate-500 text-sm">{p.sku}</td>
                    <td data-label="Category" className="text-slate-500 text-sm">{p.category}</td>
                    <td data-label="Stock" className={`text-right ${p.stock <= 0 ? 'text-red-600 font-medium' : ''}`}>
                      {p.stock.toLocaleString()} {p.unit}
                    </td>
                    <td data-label="Price" className="text-right text-sm">{peso(p.price)}</td>
                    <td data-label="Cost" className="text-right text-sm">{peso(p.cost)}</td>
                    <td data-label="Value" className="text-right font-medium text-slate-700">{peso(p.stockValue)}</td>
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
        <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export Summary
        </button>
        {report.topProductsByProfit.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={handleProductExport}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export Products
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Revenue" value={peso(report.totalRevenue)} color="text-green-600" />
        <SummaryCard label="Total COGS" value={peso(report.totalCOGS)} color="text-amber-600" />
        <SummaryCard label="Gross Profit" value={peso(report.grossProfit)} color={report.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
        <SummaryCard label="Profit Margin" value={`${report.profitMargin.toFixed(1)}%`} color={report.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="card-pro">
        <div className="p-3">
          <h3 className="font-semibold text-sm text-slate-700 mb-3">Top Products by Profit</h3>
          {report.topProductsByProfit.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No sales data</p>
          ) : (
            <div className="overflow-x-auto mobile-card-view">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">COGS</th>
                    <th className="text-right">Profit</th>
                    <th className="text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProductsByProfit.map((p, i) => (
                    <tr key={p.sku || i}>
                      <td data-label="Product">
                        <div className="font-medium text-sm text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.sku}</div>
                      </td>
                      <td data-label="Qty" className="text-right text-sm">{p.qty.toLocaleString()}</td>
                      <td data-label="Revenue" className="text-right text-sm">{peso(p.revenue)}</td>
                      <td data-label="COGS" className="text-right text-sm">{peso(p.cogs)}</td>
                      <td data-label="Profit" className={`text-right font-medium text-sm ${p.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {peso(p.profit)}
                      </td>
                      <td data-label="Margin" className={`text-right text-sm ${p.margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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
