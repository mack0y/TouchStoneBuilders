import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import PageHeader from '../components/ui/PageHeader'
import LoadingScreen from '../components/ui/LoadingScreen'
import { peso, dateFmt } from '../lib/format'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

export default function Dashboard() {
  const { profile } = useAuth()
  const { kpis, salesTrend, lowStockProducts, recentSales, topProducts, loading, error } = useDashboard()

  if (loading) return <LoadingScreen />
  if (error) return <div className="alert alert-error" role="alert">{error}</div>

  const chartData = salesTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    total: d.total,
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name || 'User'}!`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
            </div>
            <p className="text-2xl font-bold">{kpis.totalProducts.toLocaleString()}</p>
            <p className="text-sm text-base-content/60">Total Products</p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-warning"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12V12.75Z" /></svg>
            </div>
            <p className="text-2xl font-bold">{kpis.lowStockCount.toLocaleString()}</p>
            <p className="text-sm text-base-content/60">Low Stock Items</p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-success"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
            <p className="text-2xl font-bold">{kpis.todaySalesCount.toLocaleString()}</p>
            <p className="text-sm text-base-content/60">Today's Sales</p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-info"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.303-1.106 3.182 0ZM12 16.89V18a2.25 2.25 0 0 0 2.25 2.25h.008A2.25 2.25 0 0 0 16.5 18v-1.11m-4.5 0c-.162 0-.322-.017-.479-.05" /></svg>
            </div>
            <p className="text-2xl font-bold">{peso(kpis.todayRevenue)}</p>
            <p className="text-sm text-base-content/60">Today's Revenue</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base mb-4">Sales Trend (This Month)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => peso(v).replace('₱', '')} />
                  <Tooltip
                    formatter={(value) => [peso(value), 'Revenue']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base mb-4">Top Selling Products (This Month)</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-base-content/40 py-8 text-center">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-base-content/40">{i + 1}.</span>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                        <p className="text-xs text-base-content/50">{p.sku} · {p.totalQty.toLocaleString()} {p.unit}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary shrink-0">{p.totalQty.toLocaleString()} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base mb-4">Recent Sales</h2>
            {recentSales.length === 0 ? (
              <p className="text-sm text-base-content/40 py-8 text-center">No sales yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zinc table-sm">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id}>
                        <td className="font-medium">{s.invoice_no}</td>
                        <td>{s.customers?.name || 'Walk-in'}</td>
                        <td className="text-right">{peso(s.total)}</td>
                        <td className="text-right text-sm">{dateFmt(s.created_at, { dateStyle: 'short', timeStyle: 'short' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base mb-4">Low Stock Alerts</h2>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-base-content/40 py-8 text-center">No low stock items</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2 bg-base-200 rounded">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-base-content/50">{p.sku} · {p.categories?.name || 'No category'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-medium ${Number(p.stock_quantity) <= 0 ? 'text-error' : 'text-warning'}`}>
                        {Number(p.stock_quantity).toLocaleString()} {p.unit}
                      </span>
                      <span className="text-xs text-base-content/50">Reorder: {Number(p.reorder_level).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}