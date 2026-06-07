import { useState, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useSuppliers } from '../hooks/useSuppliers'
import { createPurchase } from '../hooks/usePurchases'
import PageHeader from '../components/ui/PageHeader'
import { peso } from '../lib/format'

const round2 = (n) => Math.round(n * 100) / 100

export default function PurchaseNew() {
  const navigate = useNavigate()
  const { products, loading: productsLoading } = useProducts()
  const { suppliers, loading: suppliersLoading } = useSuppliers()

  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [supplierId, setSupplierId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
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

  const totalCost = round2((parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0))

  function handleProductSelect(product) {
    setSelectedProduct(product)
    setQuantity('1')
    setUnitCost(String(product.cost ?? '0'))
    setError('')
  }

  function clearForm() {
    setSelectedProduct(null)
    setSupplierId('')
    setQuantity('')
    setUnitCost('')
    setError('')
  }

  async function handleConfirm() {
    if (savingRef.current) return
    savingRef.current = true
    setError('')

    if (!selectedProduct) {
      setError('Select a product')
      savingRef.current = false
      return
    }
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity')
      savingRef.current = false
      return
    }
    const cost = parseFloat(unitCost)
    if (isNaN(cost) || cost < 0) {
      setError('Enter a valid unit cost')
      savingRef.current = false
      return
    }

    setSaving(true)
    try {
      await createPurchase({
        productId: selectedProduct.id,
        supplierId: supplierId ? Number(supplierId) : null,
        quantity: qty,
        unitCost: cost,
      })
      navigate('/purchases')
    } catch (err) {
      setError(err.message || 'Failed to record purchase')
      savingRef.current = false
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New Purchase"
        description="Record incoming stock from a supplier"
        actions={<Link to="/purchases" className="btn btn-soft btn-sm">Back to Purchases</Link>}
      />

      {error && <div className="alert alert-error text-sm mb-4" role="alert">{error}</div>}

      <div className="card bg-base-100 border border-base-300 max-w-2xl">
        <div className="card-body p-6 space-y-6">
          <div>
            <h2 className="card-title text-base mb-3">Select Product</h2>
            <input
              type="search"
              className="input input-bordered input-sm w-full mb-3"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="overflow-y-auto max-h-64 divide-y divide-base-200">
              {productsLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-sm text-primary"></span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-base-content/40 py-6 text-sm" role="status">
                  No products found
                </p>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left py-2 px-2 hover:bg-base-200 rounded flex justify-between items-center gap-2 ${
                      selectedProduct?.id === p.id ? 'bg-primary/10 border border-primary' : ''
                    }`}
                    onClick={() => handleProductSelect(p)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-base-content/50">
                        {p.sku} · Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit} · Cost: {peso(p.cost)}
                      </p>
                    </div>
                    {selectedProduct?.id === p.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5 text-primary shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="divider"></div>
          )}

          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="form-control">
                  <span className="label-text">Quantity</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="input input-bordered input-sm"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </label>
                <label className="form-control">
                  <span className="label-text">Unit Cost (₱)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered input-sm"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="form-control">
                <span className="label-text">Supplier</span>
                <select
                  className="select select-bordered select-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={suppliersLoading}
                >
                  {!suppliersLoading && <option value="">No supplier (direct)</option>}
                  {suppliersLoading && <option value="">Loading suppliers...</option>}
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </label>

              <div className="divider"></div>

              <div className="flex justify-between font-bold text-lg">
                <span>Total Cost</span>
                <span>{peso(totalCost)}</span>
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn btn-soft btn-sm flex-1" onClick={clearForm}>
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  onClick={handleConfirm}
                  disabled={saving}
                >
                  {saving ? <span className="loading loading-spinner loading-sm" /> : 'Record Purchase'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}