import { useState, useMemo } from 'react'
import { useInventory } from '../hooks/useInventory'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { createColumnHelper } from '@tanstack/react-table'
import { peso, dateFmt } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

const units = [
  { value: 'pcs', label: 'Pieces', icon: '🔢' },
  { value: 'kg', label: 'Kilograms', icon: '⚖️' },
  { value: 'sack', label: 'Sack', icon: '🛍️' },
  { value: 'meter', label: 'Meter', icon: '📏' },
  { value: 'liter', label: 'Liter', icon: '🫗' },
  { value: 'sheet', label: 'Sheet', icon: '📄' },
  { value: 'box', label: 'Box', icon: '📦' },
  { value: 'pack', label: 'Pack', icon: '🎞️' },
  { value: 'set', label: 'Set', icon: '🧰' },
  { value: 'gallon', label: 'Gallon', icon: '🛢️' },
  { value: 'roll', label: 'Roll', icon: '🧻' },
  { value: 'bd.ft', label: 'Board Feet', icon: '🪵' },
  { value: 'cu.m', label: 'Cubic Meter', icon: '🧊' },
  { value: 'pair', label: 'Pair', icon: '👟' },
]

// Category icons for visual chips
const categoryIcons = {
  'Lumber & Plywood': '🪵',
  'Cement & Aggregates': '🧱',
  'Roofing': '🏠',
  'Plumbing': '🚿',
  'Electrical': '💡',
  'Paint & Coatings': '🎨',
  'Hardware & Fasteners': '🔩',
  'Tools': '🛠️',
  'Tiles & Flooring': '🔲',
  'Doors & Windows': '🚪',
}

const defaultCategoryIcon = '📂'

const emptyReceiveForm = { product_id: '', supplier_id: '', quantity: '', unit_cost: '' }
const emptyAdjustForm = { product_id: '', quantity_change: '', reason: '' }

export default function Inventory() {
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const {
    products,
    purchases,
    adjustments,
    suppliers,
    categories,
    movementLog,
    loading,
    error: loadError,
    receiveStock,
    adjustStock,
    deletePurchase,
    deleteAdjustment,
    updateProduct,
    createProduct,
    createCategory,
    createSupplier,
    generateSku,
    totalProducts,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
  } = useInventory()

  const [activeTab, setActiveTab] = useState('add')
  const [receiveForm, setReceiveForm] = useState(emptyReceiveForm)
  const [adjustForm, setAdjustForm] = useState(emptyAdjustForm)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ product_id: '', reorder_level: '', price: '', cost: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => {} })

  // ── New Product Wizard state ──
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [newProduct, setNewProduct] = useState({
    name: '', category_id: '', unit: 'pcs',
    price: '', reorder_level: '',
    skipPrice: false, skipReorder: false,
  })
  const [isNewCategory, setIsNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isNewSupplier, setIsNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')

  // ── Product search state ──
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // ── Auto-generated SKU preview ──
  const previewSku = useMemo(() => {
    if (!newProduct.category_id || newProduct.category_id === '__new__') return null
    const catId = Number(newProduct.category_id)
    if (!catId) return null
    return generateSku(catId)
  }, [newProduct.category_id, categories, products])

  // ── Default unit suggestion based on category ──
  const categoryUnitSuggestions = useMemo(() => {
    const map = {}
    products.forEach((p) => {
      if (p.category_id && p.unit) {
        map[p.category_id] = map[p.category_id] || {}
        map[p.category_id][p.unit] = (map[p.category_id][p.unit] || 0) + 1
      }
    })
    const result = {}
    Object.entries(map).forEach(([catId, unitCounts]) => {
      const sorted = Object.entries(unitCounts).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) result[catId] = sorted[0][0]
    })
    return result
  }, [products])

  // ── Filtered products for search dropdown ──
  const filteredProductsList = useMemo(() => {
    if (!productSearch.trim()) return []
    const q = productSearch.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [productSearch, products])

  function getCategoryIcon(name) {
    return categoryIcons[name] || defaultCategoryIcon
  }

  // ── Add Inventory (Receive Stock) ──
  function handleReceiveProductChange(productId) {
    if (productId === '__new__') {
      setIsNewProduct(true)
      setWizardStep(1)
      setNewProduct({
        name: '', category_id: '', unit: 'pcs',
        price: '', reorder_level: '',
        skipPrice: false, skipReorder: false,
      })
      setIsNewCategory(false)
      setNewCategoryName('')
      setReceiveForm({ ...receiveForm, product_id: '__new__', unit_cost: '' })
    } else {
      setIsNewProduct(false)
      setWizardStep(1)
      const p = products.find((x) => x.id === Number(productId))
      setReceiveForm({ ...receiveForm, product_id: productId, unit_cost: p ? String(p.cost ?? '') : '' })
    }
  }

  function handleCategorySelect(catId) {
    if (catId === '__new__') {
      setIsNewCategory(true)
      setNewProduct({ ...newProduct, category_id: '__new__' })
    } else {
      setIsNewCategory(false)
      setNewCategoryName('')
      const suggestedUnit = categoryUnitSuggestions[catId]
      setNewProduct({ ...newProduct, category_id: catId, unit: suggestedUnit || newProduct.unit })
    }
  }

  function updateNewProduct(field, value) {
    setNewProduct({ ...newProduct, [field]: value })
  }

  function goToStep2() {
    if (!newProduct.name.trim()) { setFormError('Please enter a product name'); return }
    if (!newProduct.category_id || newProduct.category_id === '__new__') {
      if (isNewCategory && !newCategoryName.trim()) { setFormError('Please enter a category name'); return }
      if (!isNewCategory) { setFormError('Please select a category'); return }
    }
    setFormError('')
    setWizardStep(2)
  }

  function goBackToStep1() {
    setWizardStep(1)
    setFormError('')
  }

  function cancelNewProduct() {
    setIsNewProduct(false)
    setWizardStep(1)
      setNewProduct({ name: '', category_id: '', unit: 'pcs', price: '', reorder_level: '', skipPrice: false, skipReorder: false })
    setIsNewCategory(false)
    setNewCategoryName('')
    setIsNewSupplier(false)
    setNewSupplierName('')
    setNewSupplierContact('')
    setNewSupplierPhone('')
    setReceiveForm({ ...receiveForm, product_id: '', unit_cost: '' })
    setFormError('')
  }

  async function handleReceive(e) {
    e.preventDefault()
    setFormError('')

    const qty = parseFloat(receiveForm.quantity)
    const cost = parseFloat(receiveForm.unit_cost)

    // Validate base fields
    if (!qty || qty <= 0) { setFormError('Please enter how many items you received'); return }
    if (isNaN(cost) || cost < 0) { setFormError('Please enter the cost per item'); return }

    if (isNewProduct) {
      if (!newProduct.name.trim()) { setFormError('Missing product name'); return }
    } else {
      const pid = Number(receiveForm.product_id)
      if (!pid) { setFormError('Please select a product'); return }
    }

    setSaving(true)
    try {
      let productId

      if (isNewProduct) {
        const productName = newProduct.name.trim()
        let categoryId = newProduct.category_id === '__new__' ? null : Number(newProduct.category_id) || null

        // Create new category if needed
        if (isNewCategory && newCategoryName.trim()) {
          try {
            const created = await createCategory({ name: newCategoryName.trim() })
            if (created?.id) categoryId = created.id
          } catch (catErr) {
            if (catErr.message?.includes('403') || catErr.message?.includes('Forbidden') || catErr.message?.includes('permission')) {
              throw new Error('Cannot create category — your account may not have admin permissions. Please select an existing category, or ask an admin to create it from the Categories page. If you are an admin, check your profile role in Supabase.')
            }
            throw catErr
          }
        }

        const price = newProduct.skipPrice ? 0 : (parseFloat(newProduct.price) || 0)
        const reorderLevel = newProduct.skipReorder ? 0 : (parseFloat(newProduct.reorder_level) || 0)
        // Auto-set product cost from delivery receipt unit cost
        const productCost = cost

        // Auto-generate SKU
        const sku = categoryId ? generateSku(categoryId) : 'ITM-001'

        await createProduct({
          name: productName,
          sku,
          category_id: categoryId,
          unit: newProduct.unit,
          price,
          cost: productCost,
          reorder_level: reorderLevel,
        })

        // Fetch the newly created product by SKU
        const { data: createdProduct, error: fetchErr } = await supabase
          .from('products').select('id').eq('sku', sku).single()
        if (fetchErr || !createdProduct) throw new Error('Product created but could not be found. Please try again.')
        productId = createdProduct.id
      } else {
        productId = Number(receiveForm.product_id)
      }

      // Create new supplier if needed
      let supplierId = receiveForm.supplier_id ? Number(receiveForm.supplier_id) : null
      if (isNewSupplier && newSupplierName.trim()) {
        try {
          const created = await createSupplier({
            name: newSupplierName.trim(),
            contact_person: newSupplierContact.trim() || null,
            phone: newSupplierPhone.trim() || null,
          })
          if (created?.id) supplierId = created.id
        } catch (supErr) {
          if (supErr.message?.includes('403') || supErr.message?.includes('Forbidden')) {
            throw new Error('Cannot create supplier — your account may not have admin permissions. Please select an existing supplier, or ask an admin to create it from the Suppliers page.')
          }
          throw supErr
        }
      }

      await receiveStock({
        productId,
        supplierId,
        quantity: qty,
        unitCost: cost,
      })

      setReceiveForm(emptyReceiveForm)
      setIsNewProduct(false)
      setWizardStep(1)
      setNewProduct({ name: '', category_id: '', unit: 'pcs', price: '', reorder_level: '', skipPrice: false, skipReorder: false })
      setIsNewCategory(false)
      setNewCategoryName('')
      setIsNewSupplier(false)
      setNewSupplierName('')
      setNewSupplierContact('')
      setNewSupplierPhone('')
      addToast(isNewProduct ? 'New product created and stock added!' : `Received ${qty} units — stock updated!`)
    } catch (err) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // ── Adjust Stock ──
  async function handleAdjust(e) {
    e.preventDefault()
    setFormError('')
    const productId = Number(adjustForm.product_id)
    const qty = parseFloat(adjustForm.quantity_change)
    const reason = adjustForm.reason.trim()
    if (!productId) { setFormError('Select a product'); return }
    if (!qty || qty === 0) { setFormError('Enter a non-zero quantity'); return }
    if (!reason) { setFormError('Enter a reason'); return }
    setSaving(true)
    try {
      await adjustStock(productId, qty, reason)
      setAdjustForm(emptyAdjustForm)
      addToast(qty > 0 ? `Stock increased by ${qty}` : `Stock decreased by ${Math.abs(qty)}`)
    } catch (err) {
      setFormError(err.message || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit Product ──
  function openEditModal(product) {
    setEditForm({ product_id: String(product.id), reorder_level: String(product.reorder_level), price: String(product.price), cost: String(product.cost) })
    setFormError('')
    setEditModalOpen(true)
  }

  async function handleEditProduct(e) {
    e.preventDefault()
    setFormError('')
    const reorder = parseFloat(editForm.reorder_level)
    const price = parseFloat(editForm.price)
    const cost = parseFloat(editForm.cost)
    if (isNaN(reorder) || reorder < 0) { setFormError('Invalid reorder level'); return }
    if (isNaN(price) || price < 0) { setFormError('Invalid price'); return }
    if (isNaN(cost) || cost < 0) { setFormError('Invalid cost'); return }
    setSaving(true)
    try {
      await updateProduct(Number(editForm.product_id), { reorder_level: reorder, price, cost })
      setEditModalOpen(false)
      addToast('Product updated successfully')
    } catch (err) {
      setFormError(err.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete Confirmation ──
  function showConfirm(title, message, onConfirm) {
    setConfirmConfig({ title, message, onConfirm })
    setConfirmOpen(true)
  }

  function handleDeletePurchase(purchase) {
    showConfirm('Delete Purchase Record', `Delete this record for "${purchase.products?.name}" (${Number(purchase.quantity).toLocaleString()} units)? Stock will be reversed.`, async () => {
      try { await deletePurchase(purchase.id); addToast('Record deleted — stock reversed') } catch (err) { addToast(err.message || 'Failed to delete', 'error') }
      setConfirmOpen(false)
    })
  }

  function handleDeleteAdjustment(adj) {
    showConfirm('Delete Adjustment', `Delete this adjustment for "${adj.products?.name}"? Stock will be reversed.`, async () => {
      try { await deleteAdjustment(adj.id); addToast('Adjustment deleted — stock reversed') } catch (err) { addToast(err.message || 'Failed to delete', 'error') }
      setConfirmOpen(false)
    })
  }

  // ── Filters ──
  const filteredProducts = products.filter((p) => {
    const stock = Number(p.stock_quantity)
    const reorder = Number(p.reorder_level)
    if (statusFilter === 'out' && stock > 0) return false
    if (statusFilter === 'low' && (stock <= 0 || stock > reorder)) return false
    if (statusFilter === 'ok' && stock <= reorder) return false
    if (categoryFilter && p.category_id !== Number(categoryFilter)) return false
    return true
  })

  // ── Table Columns ──
  const stockColHelper = createColumnHelper()
  const stockColumns = [
    stockColHelper.accessor('sku', { header: 'Item Code', enableSorting: true }),
    stockColHelper.accessor('name', { header: 'Product', enableSorting: true, cell: (info) => (<div><p className="font-medium text-sm">{info.getValue()}</p><p className="text-xs text-base-content/40">{info.row.original.categories?.name || '—'}</p></div>) }),
    stockColHelper.accessor('unit', { header: 'Unit', enableSorting: true }),
    stockColHelper.accessor('stock_quantity', { header: 'Stock', enableSorting: true, cell: (info) => { const qty = Number(info.getValue()); const reorder = Number(info.row.original.reorder_level); let cls = 'text-success font-semibold'; if (qty <= 0) cls = 'text-error font-semibold'; else if (qty <= reorder) cls = 'text-warning font-semibold'; return <span className={cls}>{qty.toLocaleString()}</span> } }),
    stockColHelper.accessor('reorder_level', { header: 'Alert Below', enableSorting: true, cell: (info) => Number(info.getValue()).toLocaleString() }),
    stockColHelper.accessor('cost', { header: 'Cost', enableSorting: true, cell: (info) => peso(info.getValue()) }),
    stockColHelper.accessor('price', { header: 'Price', enableSorting: true, cell: (info) => peso(info.getValue()) }),
    stockColHelper.display({ id: 'status', header: 'Status', cell: (info) => { const qty = Number(info.row.original.stock_quantity); const reorder = Number(info.row.original.reorder_level); if (qty <= 0) return <span className="badge badge-error badge-sm">Out of Stock</span>; if (qty <= reorder) return <span className="badge badge-warning badge-sm">Low Stock</span>; return <span className="badge badge-success badge-sm">In Stock</span> } }),
    ...(isAdmin ? [stockColHelper.display({ id: 'actions', header: '', cell: (info) => (<div className="flex gap-1 justify-end"><button className="btn btn-ghost btn-xs text-success" onClick={() => { setActiveTab('add'); setIsNewProduct(false); setReceiveForm({ ...emptyReceiveForm, product_id: String(info.row.original.id), unit_cost: String(info.row.original.cost ?? '') }) }}>Receive</button><button className="btn btn-ghost btn-xs" onClick={() => { setActiveTab('adjust'); setAdjustForm({ ...emptyAdjustForm, product_id: String(info.row.original.id) }) }}>Adjust</button><button className="btn btn-ghost btn-xs" onClick={() => openEditModal(info.row.original)}>Edit</button></div>) })] : []),
  ]

  const tabDefs = [
    { id: 'add', label: 'Add Inventory', icon: '📦', color: 'btn-success' },
    { id: 'stock', label: 'Stock Levels', icon: '📊', color: 'btn-info' },
    { id: 'adjust', label: 'Adjust Stock', icon: '🔧', color: 'btn-warning' },
    { id: 'history', label: 'History', icon: '📋', color: 'btn-primary' },
  ]

  const addFormTotalCost = (parseFloat(receiveForm.quantity) || 0) * (parseFloat(receiveForm.unit_cost) || 0)

  return (
    <div>
      <PageHeader title="Inventory" description={`${totalProducts} products · ${lowStockCount} low · ${outOfStockCount} out of stock`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger-children">
        <div className="card card-hover kpi-primary border animate-fade-in-up"><div className="card-body p-4"><p className="text-xs text-base-content/50 font-medium">Total Products</p><p className="text-2xl font-bold tracking-tight">{totalProducts.toLocaleString()}</p></div></div>
        <div className="card card-hover kpi-info border animate-fade-in-up"><div className="card-body p-4"><p className="text-xs text-base-content/50 font-medium">Stock Value</p><p className="text-2xl font-bold tracking-tight">{peso(totalStockValue)}</p></div></div>
        <div className={`card card-hover border animate-fade-in-up cursor-pointer transition-all ${statusFilter === 'low' ? 'ring-2 ring-warning scale-[1.02]' : 'kpi-warning'}`} onClick={() => setStatusFilter(statusFilter === 'low' ? '' : 'low')}><div className="card-body p-4"><p className="text-xs text-base-content/50 font-medium">Low Stock</p><p className="text-2xl font-bold tracking-tight">{lowStockCount.toLocaleString()}</p></div></div>
        <div className={`card card-hover border animate-fade-in-up cursor-pointer transition-all ${statusFilter === 'out' ? 'ring-2 ring-error scale-[1.02]' : ''} bg-error/5 border-error/20`} onClick={() => setStatusFilter(statusFilter === 'out' ? '' : 'out')}><div className="card-body p-4"><p className="text-xs text-base-content/50 font-medium">Out of Stock</p><p className="text-2xl font-bold tracking-tight text-error">{outOfStockCount.toLocaleString()}</p></div></div>
      </div>

      {loadError && <div className="alert alert-error text-sm mb-4">{loadError}</div>}

      {/* ── Big Prominent Tabs ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {tabDefs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setFormError('') }}
            className={`btn btn-lg gap-2 transition-all duration-200 ${activeTab === tab.id ? `${tab.color} text-white shadow-lg scale-[1.03]` : 'btn-ghost bg-base-200/50 hover:bg-base-200'}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className="font-semibold">{tab.label}</span>
            {tab.id === 'stock' && <span className="badge badge-sm badge-ghost">{totalProducts}</span>}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {loading ? (
          <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        ) : (
          <>
            {/* ═══ TAB: ADD INVENTORY ═══ */}
            {activeTab === 'add' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Form */}
                <div className="card bg-base-100 border border-base-200/80 shadow-sm">
                  <div className="card-body p-6">
                    <h2 className="card-title text-lg mb-1">
                      <span className="text-2xl">📦</span> Add New Inventory
                    </h2>
                    <p className="text-sm text-base-content/50 mb-4">Record incoming stock from a supplier delivery receipt</p>
                    <form onSubmit={handleReceive} className="flex flex-col gap-4">
                      {formError && <div className="alert alert-error text-sm py-2">{formError}</div>}

                      {/* Product Search */}
                      <label className="form-control relative">
                        <span className="label-text font-medium">What product are you receiving?</span>
                        {!isNewProduct && receiveForm.product_id && receiveForm.product_id !== '__new__' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 input input-bordered flex items-center gap-2">
                              <span className="text-sm truncate">{products.find((p) => String(p.id) === receiveForm.product_id)?.name} ({products.find((p) => String(p.id) === receiveForm.product_id)?.sku})</span>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setReceiveForm({ ...receiveForm, product_id: '' }); setProductSearch('') }}>✕ Clear</button>
                          </div>
                        ) : (
                          <div className="relative mt-1">
                            <input type="text" className="input input-bordered w-full" placeholder="Type to search products..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} />
                            {showDropdown && (
                              <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                <button type="button" className="w-full text-left px-4 py-3 hover:bg-success/10 transition-colors border-b border-base-200" onClick={() => { handleReceiveProductChange('__new__'); setProductSearch(''); setShowDropdown(false) }}>
                                  <span className="text-sm font-medium text-success">➕ This is a new product not in the list</span>
                                </button>
                                {filteredProductsList.length > 0 ? (
                                  filteredProductsList.map((p) => (
                                    <button key={p.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-base-200 transition-colors" onClick={() => { handleReceiveProductChange(String(p.id)); setProductSearch(''); setShowDropdown(false) }}>
                                      <p className="text-sm font-medium truncate">{p.name}</p>
                                      <p className="text-xs text-base-content/40">{p.sku} · Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit}</p>
                                    </button>
                                  ))
                                ) : productSearch.trim() ? (
                                  <div className="px-4 py-3 text-sm text-base-content/40">
                                    No products found. <button type="button" className="text-success font-medium hover:underline" onClick={() => { handleReceiveProductChange('__new__'); setProductSearch(''); setShowDropdown(false) }}>➕ Add as new product</button>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                      </label>

                      {/* ═══ NEW PRODUCT WIZARD ═══ */}
                      {isNewProduct && (
                        <div className="bg-base-200/50 border border-base-300 rounded-xl p-4 space-y-4">
                          {/* Wizard progress */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-base-content/70">New Product</p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 1 ? 'bg-success text-white' : 'bg-base-300 text-base-content/40'}`}>1</span>
                                <span className="text-xs text-base-content/50">Details</span>
                              </div>
                              <span className="text-base-content/20">→</span>
                              <div className="flex items-center gap-1">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 2 ? 'bg-success text-white' : 'bg-base-300 text-base-content/40'}`}>2</span>
                                <span className="text-xs text-base-content/50">Delivery</span>
                              </div>
                            </div>
                            <button type="button" className="btn btn-ghost btn-xs" onClick={cancelNewProduct}>✕ Cancel</button>
                          </div>

                          {/* ── STEP 1: What is this product? ── */}
                          {wizardStep === 1 && (
                            <div className="space-y-3">
                              <label className="form-control">
                                <span className="label-text text-sm font-medium">What's the product name?</span>
                                <input type="text" className="input input-bordered mt-1" placeholder="e.g. Portland Cement 40kg" value={newProduct.name} onChange={(e) => updateNewProduct('name', e.target.value)} />
                                <span className="text-xs text-base-content/40 mt-1">Type the name exactly as it appears on the delivery receipt</span>
                              </label>

                              {/* Category Dropdown */}
                              <label className="form-control">
                                <span className="label-text text-sm font-medium">What category?</span>
                                <select className="select select-bordered select-lg mt-1" value={newProduct.category_id} onChange={(e) => handleCategorySelect(e.target.value)}>
                                  <option value="">Choose a category...</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={String(c.id)}>{getCategoryIcon(c.name)} {c.name}</option>
                                  ))}
                                  <option value="__new__">➕ Add New Category</option>
                                </select>
                              </label>

                              {isNewCategory && (
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium">What's the new category name?</span>
                                  <input type="text" className="input input-bordered mt-1" placeholder="e.g. Safety Equipment" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                                </label>
                              )}

                              {/* Unit selection */}
                              <label className="form-control">
                                <span className="label-text text-sm font-medium">How is it counted?</span>
                                <select className="select select-bordered mt-1" value={newProduct.unit} onChange={(e) => updateNewProduct('unit', e.target.value)}>
                                  {units.map((u) => <option key={u.value} value={u.value}>{u.icon} {u.label} ({u.value})</option>)}
                                </select>
                                <span className="text-xs text-base-content/40 mt-1">Choose the unit that matches the delivery receipt</span>
                              </label>

                              {/* SKU Preview */}
                              {previewSku && (
                                <div className="bg-base-100 rounded-lg px-3 py-2 flex items-center gap-2">
                                  <span className="text-xs text-base-content/50">Item code will be:</span>
                                  <span className="font-mono font-bold text-sm text-primary">{previewSku}</span>
                                  <span className="text-xs text-base-content/30">(auto-generated)</span>
                                </div>
                              )}

                              <button type="button" className="btn btn-primary btn-block" onClick={goToStep2}>
                                Next — Add pricing & delivery details →
                              </button>
                            </div>
                          )}

                          {/* ── STEP 2: Pricing & Delivery Details ── */}
                          {wizardStep === 2 && (
                            <div className="space-y-3">
                              {/* Product summary */}
                              <div className="bg-base-100 rounded-xl p-3 flex items-center gap-3">
                                <span className="text-2xl">{getCategoryIcon(categories.find((c) => c.id === Number(newProduct.category_id))?.name || '')}</span>
                                <div>
                                  <p className="font-medium text-sm">{newProduct.name}</p>
                                  <p className="text-xs text-base-content/40">{newProduct.unit} · {previewSku || 'ITM-001'}</p>
                                </div>
                                <button type="button" className="btn btn-ghost btn-xs ml-auto" onClick={goBackToStep1}>Edit</button>
                              </div>

                              {/* Pricing & Alerts section */}
                              <div className="space-y-3">
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium">Selling Price (₱) — What your customers pay</span>
                                  <input type="number" step="0.01" min="0" className="input input-bordered input-sm mt-1" placeholder="0.00" value={newProduct.price} onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value, skipPrice: false }))} disabled={newProduct.skipPrice} />
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-base-content/50 cursor-pointer hover:text-base-content/70">
                                  <input type="checkbox" className="checkbox checkbox-xs" checked={newProduct.skipPrice} onChange={(e) => setNewProduct((prev) => ({ ...prev, skipPrice: e.target.checked, price: e.target.checked ? '' : prev.price }))} />
                                  <span>I don't know the selling price yet — fill in later</span>
                                </label>
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium">Alert me when stock falls below this number</span>
                                  <input type="number" step="0.001" min="0" className="input input-bordered input-sm mt-1" placeholder="0 (skip for now)" value={newProduct.reorder_level} onChange={(e) => setNewProduct((prev) => ({ ...prev, reorder_level: e.target.value, skipReorder: false }))} disabled={newProduct.skipReorder} />
                                  <span className="text-xs text-base-content/40 mt-1">Optional. You can set this later from Stock Levels.</span>
                                </label>
                                {newProduct.skipPrice && (
                                  <p className="text-xs text-info flex items-center gap-1">💡 You can fill these in later from Stock Levels → Edit</p>
                                )}
                              </div>

                              <div className="divider text-xs text-base-content/30 my-1">From the Delivery Receipt</div>

                              {/* Delivery details */}
                              <div className="grid grid-cols-2 gap-3">
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium">How many did you receive? *</span>
                                  <input type="number" step="0.001" min="0.001" className="input input-bordered mt-1" placeholder="e.g. 50" value={receiveForm.quantity} onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} />
                                </label>
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium">Cost per piece from supplier (₱) *</span>
                                  <input type="number" step="0.01" min="0" className="input input-bordered mt-1" placeholder="0.00" value={receiveForm.unit_cost} onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })} />
                                  <span className="text-xs text-base-content/40 mt-1">What the supplier charges per piece</span>
                                </label>
                              </div>

                              <label className="form-control">
                                <span className="label-text text-sm font-medium">Who delivered it? (optional)</span>
                                <select className="select select-bordered mt-1" value={receiveForm.supplier_id} onChange={(e) => {
                                  if (e.target.value === '__new__') {
                                    setIsNewSupplier(true)
                                    setReceiveForm({ ...receiveForm, supplier_id: '__new__' })
                                  } else {
                                    setIsNewSupplier(false)
                                    setNewSupplierName('')
                                    setNewSupplierContact('')
                                    setNewSupplierPhone('')
                                    setReceiveForm({ ...receiveForm, supplier_id: e.target.value })
                                  }
                                }}>
                                  <option value="">No supplier listed</option>
                                  {suppliers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                                  <option value="__new__">➕ Add New Supplier</option>
                                </select>
                              </label>
                              {isNewSupplier && (
                                <div className="bg-base-100 border border-base-300 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-base-content/60">New Supplier</p>
                                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setIsNewSupplier(false); setNewSupplierName(''); setNewSupplierContact(''); setNewSupplierPhone(''); setReceiveForm({ ...receiveForm, supplier_id: '' }) }}>✕</button>
                                  </div>
                                  <input type="text" className="input input-bordered input-sm w-full" placeholder="Supplier name (required)" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                                  <input type="text" className="input input-bordered input-sm w-full" placeholder="Contact person (optional)" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
                                  <input type="text" className="input input-bordered input-sm w-full" placeholder="Phone number (optional)" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                                </div>
                              )}

                              {/* Total cost preview */}
                              {receiveForm.quantity && (
                                <div className="bg-success/5 border border-success/20 rounded-xl p-3">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-base-content/60">Total cost for this delivery</span>
                                    <span className="font-bold text-success">{peso(addFormTotalCost)}</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button type="button" className="btn btn-ghost" onClick={goBackToStep1}>← Back</button>
                                <button type="submit" className="btn btn-success btn-lg shadow-md flex-1" disabled={saving}>
                                  {saving ? <span className="loading loading-spinner loading-sm" /> : <>📦 Create Product & Add Stock</>}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ═══ EXISTING PRODUCT: Quantity & Cost ═══ */}
                      {!isNewProduct && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="form-control">
                              <span className="label-text font-medium">How many did you receive? *</span>
                              <input type="number" step="0.001" min="0.001" className="input input-bordered mt-1" placeholder="e.g. 50" value={receiveForm.quantity} onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} required />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-medium">How much per piece? (₱) *</span>
                              <input type="number" step="0.01" min="0" className="input input-bordered mt-1" placeholder="0.00" value={receiveForm.unit_cost} onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })} required />
                            </label>
                          </div>
                          <label className="form-control">
                            <span className="label-text font-medium">Who delivered it?</span>
                            <select className="select select-bordered mt-1" value={receiveForm.supplier_id} onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setIsNewSupplier(true)
                                setReceiveForm({ ...receiveForm, supplier_id: '__new__' })
                              } else {
                                setIsNewSupplier(false)
                                setNewSupplierName('')
                                setNewSupplierContact('')
                                setNewSupplierPhone('')
                                setReceiveForm({ ...receiveForm, supplier_id: e.target.value })
                              }
                            }}>
                              <option value="">No supplier listed</option>
                              {suppliers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                              <option value="__new__">➕ Add New Supplier</option>
                            </select>
                          </label>
                          {isNewSupplier && (
                            <div className="bg-base-100 border border-base-300 rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-base-content/60">New Supplier</p>
                                <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setIsNewSupplier(false); setNewSupplierName(''); setNewSupplierContact(''); setNewSupplierPhone(''); setReceiveForm({ ...receiveForm, supplier_id: '' }) }}>✕</button>
                              </div>
                              <input type="text" className="input input-bordered input-sm w-full" placeholder="Supplier name (required)" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                              <input type="text" className="input input-bordered input-sm w-full" placeholder="Contact person (optional)" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
                              <input type="text" className="input input-bordered input-sm w-full" placeholder="Phone number (optional)" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                            </div>
                          )}
                          {receiveForm.product_id && receiveForm.quantity && (
                            <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                              <div className="flex justify-between text-lg">
                                <span className="text-base-content/60">Total cost for this delivery</span>
                                <span className="font-bold text-success">{peso(addFormTotalCost)}</span>
                              </div>
                            </div>
                          )}
                          <button type="submit" className="btn btn-success btn-lg shadow-md mt-2" disabled={saving}>
                            {saving ? <span className="loading loading-spinner loading-sm" /> : <>📦 Add to Inventory</>}
                          </button>
                        </>
                      )}
                    </form>
                  </div>
                </div>
                {/* Recent Stock-In Records */}
                <div className="card bg-base-100 border border-base-200/80">
                  <div className="card-body">
                    <h3 className="font-semibold text-sm mb-3">Recent Stock-In Records</h3>
                    {purchases.length === 0 ? (
                      <p className="text-sm text-base-content/30 text-center py-8">No records yet</p>
                    ) : (
                      <div className="space-y-1 max-h-[500px] overflow-y-auto">
                        {purchases.slice(0, 20).map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-base-200/50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{p.products?.name || 'Unknown'}</p>
                              <p className="text-xs text-base-content/40">{p.suppliers?.name || 'Direct'} · {dateFmt(p.created_at, { dateStyle: 'short', timeStyle: 'short' })}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="font-semibold text-sm text-success">+{Number(p.quantity).toLocaleString()} {p.products?.unit}</p>
                              {isAdmin && <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDeletePurchase(p)}>✕</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: STOCK LEVELS ═══ */}
            {activeTab === 'stock' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <select className="select select-bordered select-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c.id} value={String(c.id)}>{getCategoryIcon(c.name)} {c.name}</option>)}
                  </select>
                  {statusFilter && <button className="btn btn-ghost btn-sm" onClick={() => setStatusFilter('')}>Clear: {statusFilter === 'low' ? 'Low Stock' : 'Out of Stock'} ✕</button>}
                </div>
                <div className="card bg-base-100 border border-base-200/80 card-hover">
                  <div className="card-body p-3">
                    <DataTable columns={stockColumns} data={filteredProducts} searchPlaceholder="Search products..." />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: ADJUST STOCK ═══ */}
            {activeTab === 'adjust' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 border border-base-200/80 shadow-sm">
                  <div className="card-body p-6">
                    <h2 className="card-title text-lg mb-1"><span className="text-2xl">🔧</span> Adjust Stock</h2>
                    <p className="text-sm text-base-content/50 mb-4">Manual stock correction for damaged goods, count errors, returns, etc.</p>
                    <form onSubmit={handleAdjust} className="flex flex-col gap-4">
                      {formError && <div className="alert alert-error text-sm py-2">{formError}</div>}
                      <label className="form-control">
                        <span className="label-text font-medium">Which product?</span>
                        <select className="select select-bordered mt-1" value={adjustForm.product_id} onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })} required>
                          <option value="">Choose a product...</option>
                          {products.map((p) => <option key={p.id} value={String(p.id)}>{p.name} ({p.sku}) — Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit}</option>)}
                        </select>
                      </label>
                      <label className="form-control">
                        <span className="label-text font-medium">How much to add or remove? *</span>
                        <input type="number" step="0.001" className="input input-bordered mt-1" placeholder="Use + to add, - to remove" value={adjustForm.quantity_change} onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })} required />
                        <p className="text-xs text-base-content/40 mt-1">Positive number = adding stock, negative = removing stock</p>
                      </label>
                      <label className="form-control">
                        <span className="label-text font-medium">Why are you adjusting? *</span>
                        <textarea className="textarea textarea-bordered mt-1" rows={2} placeholder="e.g. Physical count correction, Damaged goods, Returned items..." value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} required />
                      </label>
                      <button type="submit" className="btn btn-warning btn-lg shadow-md mt-2" disabled={saving}>
                        {saving ? <span className="loading loading-spinner loading-sm" /> : 'Apply Adjustment'}
                      </button>
                    </form>
                  </div>
                </div>
                <div className="card bg-base-100 border border-base-200/80">
                  <div className="card-body">
                    <h3 className="font-semibold text-sm mb-3">Recent Adjustments</h3>
                    {adjustments.length === 0 ? (
                      <p className="text-sm text-base-content/30 text-center py-8">No adjustments yet</p>
                    ) : (
                      <div className="space-y-1 max-h-[500px] overflow-y-auto">
                        {adjustments.slice(0, 20).map((adj) => (
                          <div key={adj.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-base-200/50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{adj.products?.name || 'Unknown'} <span className="text-xs text-base-content/40">({adj.products?.sku})</span></p>
                              <p className="text-xs text-base-content/40">{adj.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className={`font-semibold text-sm ${adj.quantity_change > 0 ? 'text-success' : 'text-error'}`}>{adj.quantity_change > 0 ? '+' : ''}{Number(adj.quantity_change).toLocaleString()} {adj.products?.unit}</p>
                              {isAdmin && <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDeleteAdjustment(adj)}>✕</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: HISTORY ═══ */}
            {activeTab === 'history' && (
              <div>
                <p className="text-sm text-base-content/50 mb-4">{movementLog.length} total entries</p>
                {movementLog.length === 0 ? (
                  <div className="card bg-base-100 border border-base-200/80"><div className="card-body items-center py-16 text-base-content/30"><p className="text-sm">No movement data yet</p></div></div>
                ) : (
                  <div className="space-y-1">
                    {movementLog.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-base-200/50 transition-colors bg-base-100 border border-base-200/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${entry.type === 'purchase' ? 'bg-success/10' : 'bg-warning/10'}`}>
                            {entry.type === 'purchase' ? <span className="text-lg">📥</span> : <span className="text-lg">🔧</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{entry.productName} <span className="text-xs text-base-content/40">({entry.sku})</span></p>
                            <p className="text-xs text-base-content/40">{entry.type === 'purchase' ? `From ${entry.supplier}` : entry.reason}{entry.user && ` · by ${entry.user}`}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-semibold text-sm ${entry.quantity > 0 ? 'text-success' : 'text-error'}`}>{entry.quantity > 0 ? '+' : ''}{entry.quantity.toLocaleString()} {entry.unit}</p>
                          <p className="text-[11px] text-base-content/40">{dateFmt(entry.date, { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Product Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product Details">
        <form onSubmit={handleEditProduct} className="flex flex-col gap-3">
          {formError && <div className="alert alert-error text-sm py-2">{formError}</div>}
          {(() => { const p = products.find((x) => x.id === Number(editForm.product_id)); return p ? (<div className="bg-base-200/50 rounded-xl p-3 text-sm"><p className="font-medium">{p.name}</p><p className="text-xs text-base-content/40">{p.sku} · Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit}</p></div>) : null })()}
          <label className="form-control"><span className="label-text text-sm font-medium">Alert when stock falls below</span><input type="number" step="0.001" min="0" className="input input-bordered input-sm mt-1" value={editForm.reorder_level} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} required /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control"><span className="label-text text-sm font-medium">Selling Price (₱)</span><input type="number" step="0.01" min="0" className="input input-bordered input-sm mt-1" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required /></label>
            <label className="form-control"><span className="label-text text-sm font-medium">Cost Price (₱)</span><input type="number" step="0.01" min="0" className="input input-bordered input-sm mt-1" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} required /></label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm shadow-sm" disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} confirmLabel="Delete" danger />
    </div>
  )
}
