import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import PageHeader from '../components/ui/PageHeader'
import LoadingScreen from '../components/ui/LoadingScreen'
import { peso, dateFmt } from '../lib/format'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { kpis, salesTrend, lowStockProducts, recentSales, topProducts, loading, error } = useDashboard()

  if (loading) return <LoadingScreen />
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg" role="alert">{error}</div>

  const chartData = salesTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    total: d.total,
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name || 'User'}`}
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" onClick={() => navigate('/sales/new')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Sale
        </button>
        <button className="btn btn-sm btn-success text-white border-none" onClick={() => navigate('/inventory')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          Stock In
        </button>
        <button className="btn btn-sm btn-outline border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => navigate('/inventory')}>
          Inventory
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
        <div className="kpi-card animate-fade-in-up p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-[#1e3a5f]"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{kpis.totalProducts.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Total Products</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-warning animate-fade-in-up p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-amber-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12V12.75Z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{kpis.lowStockCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Low Stock Items</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-success animate-fade-in-up p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{kpis.todaySalesCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Today's Sales</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-info animate-fade-in-up p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.303-1.106 3.182 0ZM12 16.89V18a2.25 2.25 0 0 0 2.25 2.25h.008A2.25 2.25 0 0 0 16.5 18v-1.11m-4.5 0c-.162 0-.322-.017-.479-.05" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{peso(kpis.todayRevenue)}</p>
              <p className="text-xs text-slate-500 font-medium">Today's Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card-pro">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Sales Trend (This Month)</h2>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p className="text-sm">No sales data this month</p>
              </div>
            ) : (
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" tickFormatter={(v) => peso(v).replace('₱', '')} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [peso(value), 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        padding: '8px 12px',
                        fontSize: '13px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#1e3a5f"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: '#1e3a5f', fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="card-pro">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Selling Products (This Month)</h2>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p className="text-sm">No sales yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 ${
                        i === 0 ? 'bg-[#1e3a5f] text-white' :
                        i === 1 ? 'bg-slate-600 text-white' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.sku}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-slate-600 shrink-0">{p.totalQty.toLocaleString()} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-pro">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Sales</h2>
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <p className="text-sm">No sales yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentSales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{s.invoice_no}</p>
                      <p className="text-xs text-slate-400">{s.customers?.name || 'Walk-in'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-slate-700">{peso(s.total)}</p>
                      <p className="text-[11px] text-slate-400">{dateFmt(s.created_at, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card-pro">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Low Stock Alerts</h2>
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <p className="text-sm">No low stock items</p>
              </div>
            ) : (
              <div className="space-y-1">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku} · {p.categories?.name || 'No category'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Number(p.stock_quantity) <= 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {Number(p.stock_quantity).toLocaleString()} {p.unit}
                      </span>
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
