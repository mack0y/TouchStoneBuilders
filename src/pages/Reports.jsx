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

      <div className="card bg-base-100 border border-base-300 mb-4">
        <div className="card-body p-3">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
        </div>
      </div>

      <div role="tablist" className="tabs tabs-bordered mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && salesReport && renderSalesTab(salesReport, startDate, endDate)}
      {activeTab === 'inventory' && inventoryReport && renderInventoryTab(inventoryReport)}
      {activeTab === 'profit' && profitReport && renderProfitTab(profitReport, startDate, endDate)}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body p-4">
        <p className="text-sm text-base-content/60">{label}</p>
        <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
      </div>
    </div>
  )
}

function renderSalesTab(report, startDate, endDate) {
  const suffix = startDate || endDate ? 'Filtered' : 'All Time'

  function handleExport() {
    const csv = convertToCSV(
      [
        {
          metric: 'Total Sales (Count)',
          value: report.totalSales,
        },
        {
          metric: 'Total Revenue',
          value: report.totalRevenue,
        },
        {
          metric: 'Total Discount',
          value: report.totalDiscount,
        },
        {
          metric: 'Items Sold',
          value: report.totalItems,
        },
        {
          metric: 'Avg Order Value',
          value: report.avgOrderValue,
        },
      ],
      ['metric', 'value']
    )
    downloadCSV(csv, `sales-report-${startDate || 'all'}-${endDate || 'all'}.csv`)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button type="button" className="btn btn-soft btn-sm" onClick={handleExport}>Export CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Sales" value={report.totalSales.toLocaleString()} />
        <SummaryCard label="Total Revenue" value={peso(report.totalRevenue)} color="text-success" />
        <SummaryCard label="Total Discount" value={peso(report.totalDiscount)} color="text-warning" />
        <SummaryCard label="Items Sold" value={report.totalItems.toLocaleString()} />
        <SummaryCard label="Avg Order Value" value={peso(report.avgOrderValue)} color="text-info" />
      </div>

      <div className="text-sm text-base-content/50">
        Showing report: <strong>{suffix}</strong>
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
        <button type="button" className="btn btn-soft btn-sm" onClick={handleExport}>Export CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Products" value={report.totalProducts.toLocaleString()} />
        <SummaryCard label="Stock Value (At Selling Price)" value={peso(report.totalStockValue)} color="text-info" />
        <SummaryCard label="Stock Value (At Cost)" value={peso(report.totalCostValue)} color="text-warning" />
        <SummaryCard label="Low Stock Items" value={report.lowStockCount.toLocaleString()} color={report.lowStockCount > 0 ? 'text-error' : ''} />
        <SummaryCard label="Out of Stock" value={report.outOfStockCount.toLocaleString()} color={report.outOfStockCount > 0 ? 'text-error' : ''} />
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-3">
          <div className="overflow-x-auto">
            <table className="table table-zinc table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Selling Price</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {report.products.map((p) => (
                  <tr key={p.id} className={p.stock <= 0 ? 'bg-error/5' : ''}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-base-content/60">{p.sku}</td>
                    <td className="text-base-content/60">{p.category}</td>
                    <td className={`text-right ${p.stock <= 0 ? 'text-error font-medium' : ''}`}>
                      {p.stock.toLocaleString()} {p.unit}
                    </td>
                    <td className="text-right">{peso(p.price)}</td>
                    <td className="text-right">{peso(p.cost)}</td>
                    <td className="text-right font-medium">{peso(p.stockValue)}</td>
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
      <div className="flex justify-end gap-2 mb-4">
        <button type="button" className="btn btn-soft btn-sm" onClick={handleExport}>Export Summary CSV</button>
        {report.topProductsByProfit.length > 0 && (
          <button type="button" className="btn btn-soft btn-sm" onClick={handleProductExport}>Export Products CSV</button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Revenue" value={peso(report.totalRevenue)} color="text-success" />
        <SummaryCard label="Total COGS" value={peso(report.totalCOGS)} color="text-warning" />
        <SummaryCard label="Gross Profit" value={peso(report.grossProfit)} color={report.grossProfit >= 0 ? 'text-success' : 'text-error'} />
        <SummaryCard label="Profit Margin" value={`${report.profitMargin.toFixed(1)}%`} color={report.profitMargin >= 0 ? 'text-success' : 'text-error'} />
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-3">
          <h3 className="font-bold text-base mb-3">Top Products by Profit</h3>
          {report.topProductsByProfit.length === 0 ? (
            <p className="text-sm text-base-content/40 py-4 text-center">No sales data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zinc table-sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty Sold</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">COGS</th>
                    <th className="text-right">Profit</th>
                    <th className="text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProductsByProfit.map((p, i) => (
                    <tr key={p.sku || i}>
                      <td>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-base-content/50">{p.sku}</div>
                      </td>
                      <td className="text-right">{p.qty.toLocaleString()}</td>
                      <td className="text-right">{peso(p.revenue)}</td>
                      <td className="text-right">{peso(p.cogs)}</td>
                      <td className={`text-right font-medium ${p.profit >= 0 ? 'text-success' : 'text-error'}`}>
                        {peso(p.profit)}
                      </td>
                      <td className={`text-right ${p.margin >= 0 ? 'text-success' : 'text-error'}`}>
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