import { useState, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useCustomers } from '../hooks/useCustomers'
import { createSale } from '../hooks/useSales'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/ui/PageHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import { peso } from '../lib/format'

const round2 = (n) => Math.round(n * 100) / 100

export default function SaleNew() {
  const navigate = useNavigate()
  const { products, loading: productsLoading } = useProducts()
  const { customers, loading: customersLoading } = useCustomers()

  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [discount, setDiscount] = useState('')
  const [cart, setCart] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingSale, setPendingSale] = useState(null)
  const savingRef = useRef(false)
  const { addToast } = useToast()

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const term = search.toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    )
  }, [products, search])

  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + round2(it.quantity * it.unit_price), 0),
    [cart]
  )
  const discountNum = Math.max(parseFloat(discount) || 0, 0)
  const total = Math.max(round2(subtotal) - discountNum, 0)

  function addToCart(product) {
    if (product.stock_quantity <= 0) return
    setCart((prev) => {
      if (prev.some((it) => it.product_id === product.id)) {
        return prev.map((it) =>
          it.product_id === product.id
            ? { ...it, quantity: Math.min(it.quantity + 1, product.stock_quantity) }
            : it
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit: product.unit,
          unit_price: product.price,
          stock_quantity: product.stock_quantity,
          quantity: 1,
        },
      ]
    })
  }

  function updateQty(productId, newQty) {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((it) =>
        it.product_id === productId ? { ...it, quantity: newQty } : it
      )
    )
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((it) => it.product_id !== productId))
  }

  function clearCart() {
    setCart([])
    setDiscount('')
    setCustomerId('')
  }

  function handleDiscountChange(e) {
    const val = e.target.value
    if (val === '' || val === '-') {
      setDiscount(val)
      return
    }
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0) {
      setDiscount(val)
    }
  }

  async function handleConfirm() {
    if (savingRef.current) return
    setError('')
    if (cart.length === 0) {
      setError('Add at least one item to the cart')
      return
    }
    if (discountNum > subtotal) {
      setError('Discount cannot exceed subtotal')
      return
    }
    const oversell = cart.find((it) => it.quantity > it.stock_quantity)
    if (oversell) {
      setError(`Insufficient stock for "${oversell.name}". Available: ${oversell.stock_quantity}`)
      return
    }
    const customerName = customers.find((c) => String(c.id) === customerId)?.name || 'Walk-in'
    setPendingSale({ customerName })
    setConfirmOpen(true)
  }

  async function executeSale() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const result = await createSale({
        customerId: customerId ? Number(customerId) : null,
        discount: discountNum,
        items: cart,
      })
      if (!result?.sale_id) throw new Error('Sale created but no ID returned')
      addToast('Sale created successfully')
      setConfirmOpen(false)
      navigate(`/sales/${result.sale_id}`)
    } catch (err) {
      console.error('Sale creation error:', err)
      const msg = err.message || err.details || 'Failed to create sale'
      setError(msg)
      savingRef.current = false
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New Sale"
        description="Create a new sales transaction"
        actions={<Link to="/sales" className="btn btn-ghost btn-sm">← Back to Sales</Link>}
      />

      {error && <div className="alert alert-error text-sm mb-4 animate-scale-in" role="alert">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Product List */}
          <div className="card bg-base-100 border border-base-200/80 card-hover">
            <div className="card-body p-4">
              <h2 className="card-title text-sm font-semibold mb-2">Products</h2>
              <div className="relative mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="search"
                  className="input input-bordered input-sm w-full pl-9"
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto max-h-80 divide-y divide-base-200/50 rounded-xl">
                {productsLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="loading loading-spinner loading-sm text-primary"></span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-center text-base-content/30 py-8 text-sm" role="status">
                    No products found
                  </p>
                ) : (
                  filteredProducts.map((p) => {
                    const outOfStock = p.stock_quantity <= 0
                    const lowStock = p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left py-3 px-3 hover:bg-base-200/50 active:bg-base-200 transition-colors rounded-lg flex justify-between items-center gap-2 disabled:opacity-40"
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-base-content/40">
                            {p.sku} · {Number(p.stock_quantity).toLocaleString()} {p.unit}
                            {lowStock && <span className="text-warning ml-1">(low)</span>}
                            {outOfStock && <span className="text-error ml-1">(out)</span>}
                          </p>
                        </div>
                        <span className="font-semibold text-sm shrink-0">{peso(p.price)}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="card bg-base-100 border border-base-200/80 card-hover">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="card-title text-sm font-semibold">
                  Cart
                  {cart.length > 0 && <span className="badge badge-primary badge-sm">{cart.length}</span>}
                </h2>
                {cart.length > 0 && (
                  <button type="button" className="btn btn-ghost btn-xs text-error" onClick={clearCart}>
                    Clear all
                  </button>
                )}
              </div>
              {cart.length === 0 ? (
                <p className="text-center text-base-content/30 py-8 text-sm" role="status">
                  Cart is empty. Tap a product to add it.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr>
                        <th className="text-xs">Item</th>
                        <th className="text-xs w-28">Qty</th>
                        <th className="text-xs text-right">Price</th>
                        <th className="text-xs text-right">Subtotal</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((it) => {
                        const oversell = it.quantity > it.stock_quantity
                        return (
                          <tr key={it.product_id} className="hover:bg-base-200/30">
                            <td>
                              <div className="font-medium text-sm">{it.name}</div>
                              <div className="text-xs text-base-content/40">per {it.unit}</div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                className={`input input-bordered input-xs w-24 ${oversell ? 'input-error' : ''}`}
                                value={it.quantity}
                                onChange={(e) => updateQty(it.product_id, parseFloat(e.target.value) || 0)}
                                aria-label={`Quantity for ${it.name}`}
                              />
                              {oversell && (
                                <p className="text-xs text-error mt-1">Max: {it.stock_quantity}</p>
                              )}
                            </td>
                            <td className="text-right text-sm">{peso(it.unit_price)}</td>
                            <td className="text-right font-medium text-sm">{peso(round2(it.quantity * it.unit_price))}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                onClick={() => removeFromCart(it.product_id)}
                                aria-label={`Remove ${it.name}`}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 border border-base-200/80 card-hover sticky top-20">
            <div className="card-body p-5">
              <h2 className="card-title text-sm font-semibold mb-3">Order Summary</h2>

              <label className="form-control mb-4">
                <span className="label-text text-xs font-medium">Customer</span>
                <select
                  className="select select-bordered select-sm mt-1"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={customersLoading}
                >
                  {!customersLoading && <option value="">Walk-in</option>}
                  {customersLoading && <option value="">Loading customers...</option>}
                  {customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>

              <div className="divider my-1"></div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Items</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Subtotal</span>
                  <span>{peso(subtotal)}</span>
                </div>
                <label className="form-control">
                  <span className="label-text text-xs font-medium">Discount (₱)</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="input input-bordered input-sm mt-1"
                    value={discount}
                    onChange={handleDiscountChange}
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="divider my-1"></div>

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{peso(total)}</span>
              </div>

              <button
                type="button"
                className="btn bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none w-full mt-4"
                onClick={handleConfirm}
                disabled={saving || cart.length === 0}
              >
                {saving ? <span className="loading loading-spinner loading-sm" /> : 'Review & Confirm Sale'}
              </button>

              {/* Confirmation Dialog */}
              <ConfirmModal
                open={confirmOpen}
                onClose={() => { setConfirmOpen(false); setPendingSale(null) }}
                onConfirm={executeSale}
                title="Confirm Sale"
                confirmLabel={saving ? 'Processing...' : 'Yes, Confirm Sale'}
              >
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Customer</span>
                      <span className="font-medium text-slate-800">{pendingSale?.customerName}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Items</span>
                      <span className="font-medium text-slate-800">{cart.length}</span>
                    </div>
                    {discountNum > 0 && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Discount</span>
                        <span className="font-medium text-amber-600">-{peso(discountNum)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between">
                      <span className="font-semibold text-slate-700">Total</span>
                      <span className="font-bold text-lg text-[#1e3a5f]">{peso(total)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    <p className="font-medium text-slate-500 mb-1">Items being sold:</p>
                    <ul className="space-y-1">
                      {cart.map((it) => (
                        <li key={it.product_id} className="flex justify-between">
                          <span>{it.name}</span>
                          <span className="text-slate-500">{it.quantity} x {peso(it.unit_price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Please verify all details are correct before confirming. This transaction cannot be undone.
                  </p>
                </div>
              </ConfirmModal>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
