import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSale } from '../hooks/useSales'
import LoadingScreen from '../components/ui/LoadingScreen'
import { peso, dateFmt } from '../lib/format'

const LONG_DATE = { dateStyle: 'long', timeStyle: 'short' }

export default function SaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sale, loading, error } = useSale(id)

  if (loading) return <LoadingScreen />
  if (error) {
    return (
      <div>
        <Link to="/sales" className="btn btn-soft btn-sm mb-4 no-print">Back to Sales</Link>
        <div className="alert alert-error" role="alert">{error}</div>
      </div>
    )
  }
  if (!sale) {
    return (
      <div>
        <Link to="/sales" className="btn btn-soft btn-sm mb-4 no-print">Back to Sales</Link>
        <div className="alert alert-warning" role="alert">Sale not found</div>
      </div>
    )
  }

  const items = sale.sale_items || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 no-print">
        <Link to="/sales" className="btn btn-soft btn-sm">Back to Sales</Link>
        <div className="flex gap-2">
          <button className="btn btn-soft btn-sm" onClick={() => window.print()}>
            Print
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/sales/new')}>
            + New Sale
          </button>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300 max-w-3xl">
        <div className="card-body p-6">
          <div className="flex justify-between items-start flex-wrap gap-2 pb-4 border-b border-base-300">
            <div>
              <h1 className="text-3xl font-bold tracking-wide">{sale.invoice_no}</h1>
              <p className="text-sm text-base-content/60 mt-1">{dateFmt(sale.created_at, LONG_DATE)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-base-content/50">Customer</p>
              <p className="font-semibold">{sale.customers?.name || 'Walk-in'}</p>
              {sale.customers?.phone && (
                <p className="text-xs text-base-content/60">{sale.customers.phone}</p>
              )}
              {sale.customers?.address && (
                <p className="text-xs text-base-content/60">{sale.customers.address}</p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="table table-zinc table-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="font-medium">{it.products?.name || 'Unknown product'}</div>
                      <div className="text-xs text-base-content/50">
                        {it.products?.sku} · per {it.products?.unit}
                      </div>
                    </td>
                    <td className="text-right">{Number(it.quantity).toLocaleString()}</td>
                    <td className="text-right">{peso(it.unit_price)}</td>
                    <td className="text-right font-medium">{peso(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-base-300 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/60">Subtotal</span>
                <span>{peso(sale.subtotal)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{peso(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-base-200">
                <span>Total</span>
                <span>{peso(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
