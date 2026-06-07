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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button className="btn btn-primary btn-sm shadow-sm" onClick={() => navigate('/sales/new')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Sale
        </button>
        <button className="btn btn-success btn-sm shadow-sm" onClick={() => navigate('/inventory')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          Stock In
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inventory')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125zM2.25 12h9m-9 3h6m-6 3h6m3-9h9m-9 3h9m-9 3h9" /></svg>
          Inventory
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 stagger-children">
        <div className="card card-hover kpi-primary border animate-fade-in-up">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
            </div>
            <p className="text-2xl font-bold tracking-tight">{kpis.totalProducts.toLocaleString()}</p>
            <p className="text-xs text-base-content/50 font-medium">Total Products</p>
          </div>
        </div>

        <div className="card card-hover kpi-warning border animate-fade-in-up">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-warning"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12V12.75Z" /></svg>
            </div>
            <p className="text-2xl font-bold tracking-tight">{kpis.lowStockCount.toLocaleString()}</p>
            <p className="text-xs text-base-content/50 font-medium">Low Stock Items</p>
          </div>
        </div>

        <div className="card card-hover kpi-success border animate-fade-in-up">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-success"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
            <p className="text-2xl font-bold tracking-tight">{kpis.todaySalesCount.toLocaleString()}</p>
            <p className="text-xs text-base-content/50 font-medium">Today's Sales</p>
          </div>
        </div>

        <div className="card card-hover kpi-info border animate-fade-in-up">
          <div className="card-body p-4">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-info"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.303-1.106 3.182 0ZM12 16.89V18a2.25 2.25 0 0 0 2.25 2.25h.008A2.25 2.25 0 0 0 16.5 18v-1.11m-4.5 0c-.162 0-.322-.017-.479-.05" /></svg>
            </div>
            <p className="text-2xl font-bold tracking-tight">{peso(kpis.todayRevenue)}</p>
            <p className="text-xs text-base-content/50 font-medium">Today's Revenue</p>
          </div>
        </div>
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card bg-base-100 border border-base-200/80 card-hover">
          <div className="card-body">
            <h2 className="card-title text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              Sales Trend (This Month)
            </h2>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-base-content/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                <p className="text-sm">No sales data this month</p>
              </div>
            ) : (
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} stroke="oklch(0.88 0 0)" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} stroke="oklch(0.88 0 0)" tickFormatter={(v) => peso(v).replace('₱', '')} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [peso(value), 'Revenue']}
                      contentStyle={{
                        backgroundColor: 'oklch(1 0 0 / 0.95)',
                        border: '1px solid oklch(0.92 0 0)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                        padding: '8px 12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#667eea"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#667eea', fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-200/80 card-hover">
          <div className="card-body">
            <h2 className="card-title text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              Top Selling Products (This Month)
            </h2>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-base-content/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                <p className="text-sm">No sales yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-base-200/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-primary/15 text-primary' :
                        i === 1 ? 'bg-secondary/15 text-secondary' :
                        'bg-base-200 text-base-content/50'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-base-content/40">{p.sku}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-primary shrink-0">{p.totalQty.toLocaleString()} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-200/80 card-hover">
          <div className="card-body">
            <h2 className="card-title text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-info inline-block" />
              Recent Sales
            </h2>
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                <p className="text-sm">No sales yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentSales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-base-200/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.invoice_no}</p>
                      <p className="text-xs text-base-content/40">{s.customers?.name || 'Walk-in'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{peso(s.total)}</p>
                      <p className="text-[11px] text-base-content/40">{dateFmt(s.created_at, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-200/80 card-hover">
          <div className="card-body">
            <h2 className="card-title text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-warning inline-block" />
              Low Stock Alerts
            </h2>
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">No low stock items</p>
              </div>
            ) : (
              <div className="space-y-1">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-base-200/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-base-content/40">{p.sku} · {p.categories?.name || 'No category'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge badge-sm ${Number(p.stock_quantity) <= 0 ? 'badge-error' : 'badge-warning'}`}>
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
