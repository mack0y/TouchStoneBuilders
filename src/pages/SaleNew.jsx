import { useState, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useCustomers } from '../hooks/useCustomers'
import { createSale } from '../hooks/useSales'
import PageHeader from '../components/ui/PageHeader'
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
  const savingRef = useRef(false)

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
    savingRef.current = true
    setError('')
    if (cart.length === 0) {
      setError('Add at least one item to the cart')
      savingRef.current = false
      return
    }
    if (discountNum > subtotal) {
      setError('Discount cannot exceed subtotal')
      savingRef.current = false
      return
    }
    const oversell = cart.find((it) => it.quantity > it.stock_quantity)
    if (oversell) {
      setError(`Insufficient stock for "${oversell.name}". Available: ${oversell.stock_quantity}`)
      savingRef.current = false
      return
    }

    setSaving(true)
    try {
      const result = await createSale({
        customerId: customerId ? Number(customerId) : null,
        discount: discountNum,
        items: cart,
      })
      if (!result?.sale_id) throw new Error('Sale created but no ID returned')
      navigate(`/sales/${result.sale_id}`)
    } catch (err) {
      setError(err.message || 'Failed to create sale')
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
        actions={<Link to="/sales" className="btn btn-soft btn-sm">Back to Sales</Link>}
      />

      {error && <div className="alert alert-error text-sm mb-4" role="alert">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <h2 className="card-title text-base mb-2">Products</h2>
              <input
                type="search"
                className="input input-bordered input-sm w-full mb-3"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="overflow-y-auto max-h-96 divide-y divide-base-200">
                {productsLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="loading loading-spinner loading-sm text-primary"></span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-center text-base-content/40 py-6 text-sm" role="status">
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
                        className="w-full text-left py-2 px-2 hover:bg-base-200 rounded flex justify-between items-center gap-2 disabled:opacity-50"
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-base-content/50">
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

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="card-title text-base">Cart ({cart.length})</h2>
                {cart.length > 0 && (
                  <button type="button" className="btn btn-ghost btn-xs" onClick={clearCart}>
                    Clear
                  </button>
                )}
              </div>
              {cart.length === 0 ? (
                <p className="text-center text-base-content/40 py-6 text-sm" role="status">
                  Cart is empty. Click a product above to add it.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zinc table-sm">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="w-28">Qty</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((it) => {
                        const oversell = it.quantity > it.stock_quantity
                        return (
                          <tr key={it.product_id}>
                            <td>
                              <div className="font-medium">{it.name}</div>
                              <div className="text-xs text-base-content/50">per {it.unit}</div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                className={`input input-bordered input-xs w-24 ${oversell ? 'input-error' : ''}`}
                                value={it.quantity}
                                onChange={(e) => updateQty(it.product_id, parseFloat(e.target.value) || 0)}
                                aria-label={`Quantity for ${it.name}`}
                              />
                              {oversell && (
                                <p className="text-xs text-error mt-1">Max: {it.stock_quantity}</p>
                              )}
                            </td>
                            <td className="text-right">{peso(it.unit_price)}</td>
                            <td className="text-right font-medium">{peso(round2(it.quantity * it.unit_price))}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-error"
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

        <div className="lg:col-span-1">
          <div className="card bg-base-100 border border-base-300 sticky top-4">
            <div className="card-body p-4">
              <h2 className="card-title text-base">Summary</h2>

              <label className="form-control">
                <span className="label-text text-sm">Customer</span>
                <select
                  className="select select-bordered select-sm"
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

              <div className="divider my-2"></div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Items</span>
                <span>{cart.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Subtotal</span>
                <span>{peso(subtotal)}</span>
              </div>
              <label className="form-control mt-2">
                <span className="label-text text-sm">Discount (₱)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input input-bordered input-sm"
                  value={discount}
                  onChange={handleDiscountChange}
                  placeholder="0.00"
                />
              </label>
              <div className="divider my-2"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{peso(total)}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-4"
                onClick={handleConfirm}
                disabled={saving || cart.length === 0}
              >
                {saving ? <span className="loading loading-spinner loading-sm" /> : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
