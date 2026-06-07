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
        <Link to="/sales" className="btn btn-ghost btn-sm mb-4 no-print">← Back to Sales</Link>
        <div className="alert alert-error" role="alert">{error}</div>
      </div>
    )
  }
  if (!sale) {
    return (
      <div>
        <Link to="/sales" className="btn btn-ghost btn-sm mb-4 no-print">← Back to Sales</Link>
        <div className="alert alert-warning" role="alert">Sale not found</div>
      </div>
    )
  }

  const items = sale.sale_items || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 no-print">
        <Link to="/sales" className="btn btn-ghost btn-sm">← Back to Sales</Link>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" /></svg>
            Print
          </button>
          <button className="btn btn-primary btn-sm shadow-sm" onClick={() => navigate('/sales/new')}>
            + New Sale
          </button>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-200/80 max-w-3xl card-hover">
        <div className="card-body p-5 sm:p-8">
          {/* Invoice header */}
          <div className="flex justify-between items-start flex-wrap gap-3 pb-5 border-b border-base-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{sale.invoice_no}</h1>
              <p className="text-sm text-base-content/50 mt-1">{dateFmt(sale.created_at, LONG_DATE)}</p>
            </div>
            <div className="text-right bg-base-200/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold mb-0.5">Customer</p>
              <p className="font-semibold text-sm">{sale.customers?.name || 'Walk-in'}</p>
              {sale.customers?.phone && (
                <p className="text-xs text-base-content/50">{sale.customers.phone}</p>
              )}
              {sale.customers?.address && (
                <p className="text-xs text-base-content/50 max-w-[200px]">{sale.customers.address}</p>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto mt-4">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th className="text-xs uppercase tracking-wider">Item</th>
                  <th className="text-xs text-right uppercase tracking-wider">Qty</th>
                  <th className="text-xs text-right uppercase tracking-wider">Unit Price</th>
                  <th className="text-xs text-right uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-base-200/30">
                    <td>
                      <div className="font-medium text-sm">{it.products?.name || 'Unknown product'}</div>
                      <div className="text-xs text-base-content/40">
                        {it.products?.sku} · per {it.products?.unit}
                      </div>
                    </td>
                    <td className="text-right text-sm">{Number(it.quantity).toLocaleString()}</td>
                    <td className="text-right text-sm">{peso(it.unit_price)}</td>
                    <td className="text-right font-medium text-sm">{peso(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-base-200 flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/50">Subtotal</span>
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
                <span className="text-primary">{peso(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
