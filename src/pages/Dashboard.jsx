import PageHeader from '../components/ui/PageHeader'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name || 'User'}!`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Products', value: '—', color: 'bg-primary/20', dot: 'bg-primary' },
          { label: 'Low Stock', value: '—', color: 'bg-warning/20', dot: 'bg-warning' },
          { label: "Today's Sales", value: '₱—', color: 'bg-success/20', dot: 'bg-success' },
          { label: 'Total Revenue', value: '₱—', color: 'bg-info/20', dot: 'bg-info' },
        ].map((card) => (
          <div key={card.label} className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
                <div className={`w-4 h-4 rounded ${card.dot}`}></div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-base-content/60">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base">Recent Sales</h2>
            <p className="text-sm text-base-content/40 py-8 text-center">No sales yet</p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base">Low Stock Alerts</h2>
            <p className="text-sm text-base-content/40 py-8 text-center">No alerts</p>
          </div>
        </div>
      </div>
    </div>
  )
}
