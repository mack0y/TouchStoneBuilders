import { useState, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useSuppliers } from '../hooks/useSuppliers'
import { createPurchase } from '../hooks/usePurchases'
import { useToast } from '../hooks/useToast'
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
  const { addToast } = useToast()

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
      addToast('Stock recorded successfully')
      navigate('/stock-in')
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
        title="New Stock In"
        description="Record incoming stock from a supplier"
        actions={<Link to="/stock-in" className="btn btn-ghost btn-sm">← Back to Stock In</Link>}
      />

      {error && <div className="alert alert-error text-sm mb-4 animate-scale-in" role="alert">{error}</div>}

      <div className="card bg-base-100 border border-base-200/80 card-hover max-w-2xl">
        <div className="card-body p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <h2 className="card-title text-sm font-semibold mb-3">Select Product</h2>
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
            <div className="overflow-y-auto max-h-64 divide-y divide-base-200/50 rounded-xl">
              {productsLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-sm text-primary"></span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-base-content/30 py-8 text-sm" role="status">
                  No products found
                </p>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left py-3 px-3 hover:bg-base-200/50 active:bg-base-200 transition-colors rounded-lg flex justify-between items-center gap-2 ${
                      selectedProduct?.id === p.id ? 'bg-primary/5 border border-primary/30' : ''
                    }`}
                    onClick={() => handleProductSelect(p)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-base-content/40">
                        {p.sku} · Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit} · Cost: {peso(p.cost)}
                      </p>
                    </div>
                    {selectedProduct?.id === p.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedProduct && <div className="divider"></div>}

          {selectedProduct && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="grid grid-cols-2 gap-4">
                <label className="form-control">
                  <span className="label-text text-xs font-medium">Quantity</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="input input-bordered input-sm mt-1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-xs font-medium">Unit Cost (₱)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered input-sm mt-1"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="form-control">
                <span className="label-text text-xs font-medium">Supplier</span>
                <select
                  className="select select-bordered select-sm mt-1"
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
                <span className="text-primary">{peso(totalCost)}</span>
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={clearForm}>
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1 shadow-md hover:shadow-lg transition-shadow"
                  onClick={handleConfirm}
                  disabled={saving}
                >
                  {saving ? <span className="loading loading-spinner loading-sm" /> : 'Record Stock In'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
