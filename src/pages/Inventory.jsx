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
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'sack', label: 'Sack' },
  { value: 'meter', label: 'Meter' },
  { value: 'liter', label: 'Liter' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'set', label: 'Set' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'roll', label: 'Roll' },
  { value: 'bd.ft', label: 'Board Feet' },
  { value: 'cu.m', label: 'Cubic Meter' },
  { value: 'pair', label: 'Pair' },
]

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

  // New Product Wizard state
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

  // Product search state
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Auto-generated SKU preview
  const previewSku = useMemo(() => {
    if (!newProduct.category_id || newProduct.category_id === '__new__') return null
    const catId = Number(newProduct.category_id)
    if (!catId) return null
    return generateSku(catId)
  }, [newProduct.category_id, categories, products])

  // Default unit suggestion based on category
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

  // Filtered products for search dropdown
  const filteredProductsList = useMemo(() => {
    if (!productSearch.trim()) return []
    const q = productSearch.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [productSearch, products])

  // Add Inventory (Receive Stock)
  function handleReceiveProductChange(productId) {
    if (productId === '__new__') {
      setIsNewProduct(true)
      setWizardStep(1)
      setNewProduct({
        name: '', category_id: '', unit: 'pcs',
        price: '', reorder_level: '', skipPrice: false, skipReorder: false,
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

    if (!qty || qty <= 0) { setFormError('Please enter how many items you received'); return }
    if (isNaN(cost) || cost < 0) { setFormError('Please enter the cost per item'); return }

    if (isNewProduct) {
      if (!newProduct.name.trim()) { setFormError('Missing product name'); return }
    } else {
      const pid = Number(receiveForm.product_id)
      if (!pid) { setFormError('Please select a product'); return }
    }

    // Show confirmation dialog
    const productName = isNewProduct ? newProduct.name.trim() : products.find((p) => String(p.id) === receiveForm.product_id)?.name || 'Unknown'
    const supplierName = receiveForm.supplier_id ? suppliers.find((s) => String(s.id) === receiveForm.supplier_id)?.name || 'Unknown' : 'No supplier'
    showConfirm(
      'Confirm Stock Receipt',
      `Receive ${qty.toLocaleString()} units of "${productName}" at ${peso(cost)}/piece from ${supplierName}? Total cost: ${peso(qty * cost)}.`,
      async () => {
        setConfirmOpen(false)
        await executeReceive()
      }
    )
  }

  async function executeReceive() {
    const qty = parseFloat(receiveForm.quantity)
    const cost = parseFloat(receiveForm.unit_cost)

    setSaving(true)
    try {
      let productId

      if (isNewProduct) {
        const productName = newProduct.name.trim()
        let categoryId = newProduct.category_id === '__new__' ? null : Number(newProduct.category_id) || null

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
        const productCost = cost
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

        const { data: createdProduct, error: fetchErr } = await supabase
          .from('products').select('id').eq('sku', sku).single()
        if (fetchErr || !createdProduct) throw new Error('Product created but could not be found. Please try again.')
        productId = createdProduct.id
      } else {
        productId = Number(receiveForm.product_id)
      }

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

  // Adjust Stock
  async function handleAdjust(e) {
    e.preventDefault()
    setFormError('')
    const productId = Number(adjustForm.product_id)
    const qty = parseFloat(adjustForm.quantity_change)
    const reason = adjustForm.reason.trim()
    if (!productId) { setFormError('Select a product'); return }
    if (!qty || qty === 0) { setFormError('Enter a non-zero quantity'); return }
    if (!reason) { setFormError('Enter a reason'); return }

    // Show confirmation dialog
    const productName = products.find((p) => p.id === productId)?.name || 'Unknown'
    const currentStock = products.find((p) => p.id === productId)?.stock_quantity || 0
    const newStock = currentStock + qty
    showConfirm(
      'Confirm Stock Adjustment',
      `Adjust "${productName}" from ${currentStock.toLocaleString()} to ${newStock.toLocaleString()} units (${qty > 0 ? '+' : ''}${qty.toLocaleString()})? Reason: ${reason}`,
      async () => {
        setConfirmOpen(false)
        await executeAdjust()
      }
    )
  }

  async function executeAdjust() {
    const productId = Number(adjustForm.product_id)
    const qty = parseFloat(adjustForm.quantity_change)
    const reason = adjustForm.reason.trim()
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

  // Edit Product
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

  // Delete Confirmation
  function showConfirm(title, message, onConfirm, confirmLabel) {
    setConfirmConfig({ title, message, onConfirm, confirmLabel })
    setConfirmOpen(true)
  }

  function handleDeletePurchase(purchase) {
    showConfirm('Delete Purchase Record', `Delete this record for "${purchase.products?.name}" (${Number(purchase.quantity).toLocaleString()} units)? Stock will be reversed.`, async () => {
      try { await deletePurchase(purchase.id); addToast('Record deleted — stock reversed') } catch (err) { addToast(err.message || 'Failed to delete', 'error') }
      setConfirmOpen(false)
    }, 'Delete')
  }

  function handleDeleteAdjustment(adj) {
    showConfirm('Delete Adjustment', `Delete this adjustment for "${adj.products?.name}"? Stock will be reversed.`, async () => {
      try { await deleteAdjustment(adj.id); addToast('Adjustment deleted — stock reversed') } catch (err) { addToast(err.message || 'Failed to delete', 'error') }
      setConfirmOpen(false)
    }, 'Delete')
  }

  // Filters
  const filteredProducts = products.filter((p) => {
    const stock = Number(p.stock_quantity)
    const reorder = Number(p.reorder_level)
    if (statusFilter === 'out' && stock > 0) return false
    if (statusFilter === 'low' && (stock <= 0 || stock > reorder)) return false
    if (statusFilter === 'ok' && stock <= reorder) return false
    if (categoryFilter && p.category_id !== Number(categoryFilter)) return false
    return true
  })

  // Table Columns
  const stockColHelper = createColumnHelper()
  const stockColumns = [
    stockColHelper.accessor('sku', { header: 'Item Code', enableSorting: true }),
    stockColHelper.accessor('name', { header: 'Product', enableSorting: true, cell: (info) => (<div><p className="font-medium text-sm text-slate-800">{info.getValue()}</p><p className="text-xs text-slate-400">{info.row.original.categories?.name || '—'}</p></div>) }),
    stockColHelper.accessor('unit', { header: 'Unit', enableSorting: true }),
    stockColHelper.accessor('stock_quantity', { header: 'Stock', enableSorting: true, cell: (info) => { const qty = Number(info.getValue()); const reorder = Number(info.row.original.reorder_level); let cls = 'text-green-600 font-semibold'; if (qty <= 0) cls = 'text-red-600 font-semibold'; else if (qty <= reorder) cls = 'text-amber-600 font-semibold'; return <span className={cls}>{qty.toLocaleString()}</span> } }),
    stockColHelper.accessor('reorder_level', { header: 'Alert Below', enableSorting: true, cell: (info) => Number(info.getValue()).toLocaleString() }),
    stockColHelper.accessor('cost', { header: 'Cost', enableSorting: true, cell: (info) => peso(info.getValue()) }),
    stockColHelper.accessor('price', { header: 'Price', enableSorting: true, cell: (info) => peso(info.getValue()) }),
    stockColHelper.display({ id: 'status', header: 'Status', cell: (info) => { const qty = Number(info.row.original.stock_quantity); const reorder = Number(info.row.original.reorder_level); if (qty <= 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Out of Stock</span>; if (qty <= reorder) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Low Stock</span>; return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">In Stock</span> } }),
    ...(isAdmin ? [stockColHelper.display({ id: 'actions', header: '', cell: (info) => (<div className="flex gap-1 justify-end"><button className="btn btn-ghost btn-xs text-green-600" onClick={() => { setActiveTab('add'); setIsNewProduct(false); setReceiveForm({ ...emptyReceiveForm, product_id: String(info.row.original.id), unit_cost: String(info.row.original.cost ?? '') }) }}>Receive</button><button className="btn btn-ghost btn-xs text-slate-600" onClick={() => { setActiveTab('adjust'); setAdjustForm({ ...emptyAdjustForm, product_id: String(info.row.original.id) }) }}>Adjust</button><button className="btn btn-ghost btn-xs text-slate-600" onClick={() => openEditModal(info.row.original)}>Edit</button></div>) })] : []),
  ]

  const tabDefs = [
    { id: 'add', label: 'Add Inventory', icon: 'add' },
    { id: 'stock', label: 'Stock Levels', icon: 'stock' },
    { id: 'adjust', label: 'Adjust Stock', icon: 'adjust' },
    { id: 'history', label: 'History', icon: 'history' },
  ]

  const tabIcons = {
    add: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
    stock: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
    adjust: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" /></svg>,
    history: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  }

  const addFormTotalCost = (parseFloat(receiveForm.quantity) || 0) * (parseFloat(receiveForm.unit_cost) || 0)

  return (
    <div>
      <PageHeader title="Inventory" description={`${totalProducts} products · ${lowStockCount} low · ${outOfStockCount} out of stock`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
        <div className="kpi-card animate-fade-in-up p-4"><p className="text-xs text-slate-500 font-medium">Total Products</p><p className="text-2xl font-bold text-slate-800">{totalProducts.toLocaleString()}</p></div>
        <div className="kpi-card kpi-info animate-fade-in-up p-4"><p className="text-xs text-slate-500 font-medium">Stock Value</p><p className="text-2xl font-bold text-slate-800">{peso(totalStockValue)}</p></div>
        <div className={`kpi-card animate-fade-in-up p-4 cursor-pointer transition-all ${statusFilter === 'low' ? 'ring-2 ring-amber-500 scale-[1.02]' : 'kpi-warning'}`} onClick={() => setStatusFilter(statusFilter === 'low' ? '' : 'low')}><p className="text-xs text-slate-500 font-medium">Low Stock</p><p className="text-2xl font-bold text-slate-800">{lowStockCount.toLocaleString()}</p></div>
        <div className={`kpi-card kpi-error animate-fade-in-up p-4 cursor-pointer transition-all ${statusFilter === 'out' ? 'ring-2 ring-red-500 scale-[1.02]' : ''}`} onClick={() => setStatusFilter(statusFilter === 'out' ? '' : 'out')}><p className="text-xs text-slate-500 font-medium">Out of Stock</p><p className="text-2xl font-bold text-red-600">{outOfStockCount.toLocaleString()}</p></div>
      </div>

      {loadError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{loadError}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabDefs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setFormError('') }}
            className={`btn btn-sm gap-1.5 transition-all duration-150 ${activeTab === tab.id ? 'bg-[#1e3a5f] text-white border-none shadow-md' : 'btn-outline border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {tabIcons[tab.icon]}
            <span className="font-medium">{tab.label}</span>
            {tab.id === 'stock' && <span className="text-xs opacity-70">{totalProducts}</span>}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {loading ? (
          <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span></div>
        ) : (
          <>
            {/* TAB: ADD INVENTORY */}
            {activeTab === 'add' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Form */}
                <div className="card-pro">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-1">Add New Inventory</h2>
                    <p className="text-sm text-slate-500 mb-4">Record incoming stock from a supplier delivery receipt</p>
                    <form onSubmit={handleReceive} className="flex flex-col gap-4">
                      {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{formError}</div>}

                      {/* Product Search */}
                      <label className="form-control relative">
                        <span className="label-text font-medium text-slate-700">What product are you receiving?</span>
                        {!isNewProduct && receiveForm.product_id && receiveForm.product_id !== '__new__' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 input input-bordered flex items-center gap-2 text-sm">
                              <span className="truncate">{products.find((p) => String(p.id) === receiveForm.product_id)?.name} ({products.find((p) => String(p.id) === receiveForm.product_id)?.sku})</span>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm text-slate-500" onClick={() => { setReceiveForm({ ...receiveForm, product_id: '' }); setProductSearch('') }}>Clear</button>
                          </div>
                        ) : (
                          <div className="relative mt-1">
                            <input id="inv-search" name="product_search" type="text" className="input input-bordered w-full text-sm" placeholder="Type to search products..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} />
                            {showDropdown && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                <button type="button" className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-slate-100" onClick={() => { handleReceiveProductChange('__new__'); setProductSearch(''); setShowDropdown(false) }}>
                                  <span className="text-sm font-medium text-green-600">+ This is a new product not in the list</span>
                                </button>
                                {filteredProductsList.length > 0 ? (
                                  filteredProductsList.map((p) => (
                                    <button key={p.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors" onClick={() => { handleReceiveProductChange(String(p.id)); setProductSearch(''); setShowDropdown(false) }}>
                                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                      <p className="text-xs text-slate-400">{p.sku} · Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit}</p>
                                    </button>
                                  ))
                                ) : productSearch.trim() ? (
                                  <div className="px-4 py-3 text-sm text-slate-400">
                                    No products found. <button type="button" className="text-green-600 font-medium hover:underline" onClick={() => { handleReceiveProductChange('__new__'); setProductSearch(''); setShowDropdown(false) }}>+ Add as new product</button>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                      </label>

                      {/* NEW PRODUCT WIZARD */}
                      {isNewProduct && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                          {/* Wizard progress */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-700">New Product</p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 1 ? 'bg-[#1e3a5f] text-white' : 'bg-slate-200 text-slate-400'}`}>1</span>
                                <span className="text-xs text-slate-500">Details</span>
                              </div>
                              <span className="text-slate-300">→</span>
                              <div className="flex items-center gap-1">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 2 ? 'bg-[#1e3a5f] text-white' : 'bg-slate-200 text-slate-400'}`}>2</span>
                                <span className="text-xs text-slate-500">Delivery</span>
                              </div>
                            </div>
                            <button type="button" className="btn btn-ghost btn-xs text-slate-400" onClick={cancelNewProduct}>Cancel</button>
                          </div>

                          {/* STEP 1: What is this product? */}
                          {wizardStep === 1 && (
                            <div className="space-y-3">
                              <label className="form-control">
                                <span className="label-text text-sm font-medium text-slate-700">What's the product name?</span>
                                <input id="inv-new-name" name="new_product_name" type="text" className="input input-bordered mt-1 text-sm" placeholder="e.g. Portland Cement 40kg" value={newProduct.name} onChange={(e) => updateNewProduct('name', e.target.value)} />
                                <span className="text-xs text-slate-400 mt-1">Type the name exactly as it appears on the delivery receipt</span>
                              </label>

                              <label className="form-control">
                                <span className="label-text text-sm font-medium text-slate-700">What category?</span>
                                <select id="inv-new-category" name="new_category_id" className="select select-bordered mt-1 text-sm" value={newProduct.category_id} onChange={(e) => handleCategorySelect(e.target.value)}>
                                  <option value="">Choose a category...</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                                  ))}
                                  <option value="__new__">+ Add New Category</option>
                                </select>
                              </label>

                              {isNewCategory && (
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium text-slate-700">What's the new category name?</span>
                                  <input id="inv-new-cat-name" name="new_category_name" type="text" className="input input-bordered mt-1 text-sm" placeholder="e.g. Safety Equipment" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                                </label>
                              )}

                              <label className="form-control">
                                <span className="label-text text-sm font-medium text-slate-700">How is it counted?</span>
                                <select id="inv-new-unit" name="new_unit" className="select select-bordered mt-1 text-sm" value={newProduct.unit} onChange={(e) => updateNewProduct('unit', e.target.value)}>
                                  {units.map((u) => <option key={u.value} value={u.value}>{u.label} ({u.value})</option>)}
                                </select>
                                <span className="text-xs text-slate-400 mt-1">Choose the unit that matches the delivery receipt</span>
                              </label>

                              {previewSku && (
                                <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Item code will be:</span>
                                  <span className="font-mono font-bold text-sm text-[#1e3a5f]">{previewSku}</span>
                                  <span className="text-xs text-slate-300">(auto-generated)</span>
                                </div>
                              )}

                              <button type="button" className="btn bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none btn-block" onClick={goToStep2}>
                                Next — Add pricing & delivery details →
                              </button>
                            </div>
                          )}

                          {/* STEP 2: Pricing & Delivery Details */}
                          {wizardStep === 2 && (
                            <div className="space-y-3">
                              {/* Product summary */}
                              <div className="bg-white rounded-lg p-3 flex items-center gap-3 border border-slate-200">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  <span className="text-lg font-bold text-slate-500">{newProduct.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-slate-800">{newProduct.name}</p>
                                  <p className="text-xs text-slate-400">{newProduct.unit} · {previewSku || 'ITM-001'}</p>
                                </div>
                                <button type="button" className="btn btn-ghost btn-xs text-slate-500 ml-auto" onClick={goBackToStep1}>Edit</button>
                              </div>

                              {/* Pricing & Alerts */}
                              <div className="space-y-3">
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium text-slate-700">Selling Price (₱) — What your customers pay</span>
                                  <input id="inv-new-price" name="new_price" type="number" step="1" min="0" className="input input-bordered input-sm mt-1 text-sm" placeholder="0.00" value={newProduct.price} onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value, skipPrice: false }))} disabled={newProduct.skipPrice} />
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                                  <input type="checkbox" className="checkbox checkbox-xs border-slate-300" checked={newProduct.skipPrice} onChange={(e) => setNewProduct((prev) => ({ ...prev, skipPrice: e.target.checked, price: e.target.checked ? '' : prev.price }))} />
                                  <span>I don't know the selling price yet — fill in later</span>
                                </label>
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium text-slate-700">Alert me when stock falls below this number</span>
                                  <input id="inv-new-reorder" name="new_reorder_level" type="number" step="1" min="0" className="input input-bordered input-sm mt-1 text-sm" placeholder="0 (skip for now)" value={newProduct.reorder_level} onChange={(e) => setNewProduct((prev) => ({ ...prev, reorder_level: e.target.value, skipReorder: false }))} disabled={newProduct.skipReorder} />
                                  <span className="text-xs text-slate-400 mt-1">Optional. You can set this later from Stock Levels.</span>
                                </label>
                                {newProduct.skipPrice && (
                                  <p className="text-xs text-blue-600">You can fill these in later from Stock Levels → Edit</p>
                                )}
                              </div>

                              <div className="border-t border-slate-200 my-1"><p className="text-xs text-slate-400 pt-2 pb-1">From the Delivery Receipt</p></div>

                              {/* Delivery details */}
                              <div className="grid grid-cols-2 gap-3">
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium text-slate-700">How many did you receive? *</span>
                                  <input id="inv-new-qty2" name="new_quantity2" type="number" step="1" min="1" className="input input-bordered mt-1 text-sm" placeholder="e.g. 50" value={receiveForm.quantity} onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} />
                                </label>
                                <label className="form-control">
                                  <span className="label-text text-sm font-medium text-slate-700">Cost per piece from supplier (₱) *</span>
                                  <input type="number" step="1" min="0" className="input input-bordered mt-1 text-sm" placeholder="0.00" value={receiveForm.unit_cost} onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })} />
                                  <span className="text-xs text-slate-400 mt-1">What the supplier charges per piece</span>
                                </label>
                              </div>

                              <label className="form-control">
                                <span className="label-text text-sm font-medium text-slate-700">Who delivered it? (optional)</span>
                                <select id="inv-new-supplier" name="new_supplier_id" className="select select-bordered mt-1 text-sm" value={receiveForm.supplier_id} onChange={(e) => {
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
                                  <option value="__new__">+ Add New Supplier</option>
                                </select>
                              </label>
                              {isNewSupplier && (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-600">New Supplier</p>
                                    <button type="button" className="btn btn-ghost btn-xs text-slate-400" onClick={() => { setIsNewSupplier(false); setNewSupplierName(''); setNewSupplierContact(''); setNewSupplierPhone(''); setReceiveForm({ ...receiveForm, supplier_id: '' }) }}>✕</button>
                                  </div>
                                  <input id="inv-new-sup-name" name="new_supplier_name" type="text" className="input input-bordered input-sm w-full text-sm" placeholder="Supplier name (required)" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                                  <input id="inv-new-sup-contact" name="new_supplier_contact" type="text" className="input input-bordered input-sm w-full text-sm" placeholder="Contact person (optional)" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
                                  <input id="inv-new-sup-phone" name="new_supplier_phone" type="text" className="input input-bordered input-sm w-full text-sm" placeholder="Phone number (optional)" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                                </div>
                              )}

                              {/* Total cost preview */}
                              {receiveForm.quantity && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-slate-600">Total cost for this delivery</span>
                                    <span className="font-bold text-green-700">{peso(addFormTotalCost)}</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button type="button" className="btn btn-ghost text-slate-600" onClick={goBackToStep1}>← Back</button>
                                <button type="submit" className="btn bg-green-600 hover:bg-green-700 text-white border-none shadow-md flex-1" disabled={saving}>
                                  {saving ? <span className="loading loading-spinner loading-sm" /> : 'Create Product & Add Stock'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXISTING PRODUCT: Quantity & Cost */}
                      {!isNewProduct && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="form-control">
                              <span className="label-text font-medium text-slate-700">How many did you receive? *</span>
                              <input id="inv-qty" name="quantity" type="number" step="1" min="1" className="input input-bordered mt-1 text-sm" placeholder="e.g. 50" value={receiveForm.quantity} onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} required />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-medium text-slate-700">How much per piece? (₱) *</span>
                              <input id="inv-cost" name="unit_cost" type="number" step="1" min="0" className="input input-bordered mt-1 text-sm" placeholder="0.00" value={receiveForm.unit_cost} onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })} required />
                            </label>
                          </div>
                          <label className="form-control">
                            <span className="label-text font-medium text-slate-700">Who delivered it?</span>
                            <select id="inv-supplier" name="supplier_id" className="select select-bordered mt-1 text-sm" value={receiveForm.supplier_id} onChange={(e) => {
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
                              <option value="__new__">+ Add New Supplier</option>
                            </select>
                          </label>
                          {isNewSupplier && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-600">New Supplier</p>
                                <button type="button" className="btn btn-ghost btn-xs text-slate-400" onClick={() => { setIsNewSupplier(false); setNewSupplierName(''); setNewSupplierContact(''); setNewSupplierPhone(''); setReceiveForm({ ...receiveForm, supplier_id: '' }) }}>✕</button>
                              </div>
                              <input id="inv-sup-name" name="supplier_name" type="text" className="input input-bordered input-sm w-full text-sm" placeholder="Supplier name (required)" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                              <input id="inv-sup-contact" name="supplier_contact" type="text" className="input input-bordered input-sm w-full text-sm" placeholder="Contact person (optional)" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
                              <input id="inv-sup-phone" name="supplier_phone" type="text" className="input input-bordered input-sm w-full text-sm" placeholder="Phone number (optional)" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                            </div>
                          )}
                          {receiveForm.product_id && receiveForm.quantity && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex justify-between text-lg">
                                <span className="text-slate-600">Total cost for this delivery</span>
                                <span className="font-bold text-green-700">{peso(addFormTotalCost)}</span>
                              </div>
                            </div>
                          )}
                          <button type="submit" className="btn bg-green-600 hover:bg-green-700 text-white border-none btn-lg shadow-md mt-2" disabled={saving}>
                            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Add to Inventory'}
                          </button>
                        </>
                      )}
                    </form>
                  </div>
                </div>
                {/* Recent Stock-In Records */}
                <div className="card-pro">
                  <div className="p-5">
                    <h3 className="font-semibold text-sm text-slate-700 mb-3">Recent Stock-In Records</h3>
                    {purchases.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">No records yet</p>
                    ) : (
                      <div className="space-y-1 max-h-[500px] overflow-y-auto">
                        {purchases.slice(0, 20).map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-800 truncate">{p.products?.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-400">{p.suppliers?.name || 'Direct'} · {dateFmt(p.created_at, { dateStyle: 'short', timeStyle: 'short' })}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="font-semibold text-sm text-green-600">+{Number(p.quantity).toLocaleString()} {p.products?.unit}</p>
                              {isAdmin && <button className="btn btn-ghost btn-xs text-red-400" onClick={() => handleDeletePurchase(p)}>✕</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STOCK LEVELS */}
            {activeTab === 'stock' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <select id="inv-category-filter" name="category_filter" className="select select-bordered select-sm text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                  {statusFilter && <button className="btn btn-ghost btn-sm text-slate-600" onClick={() => setStatusFilter('')}>Clear: {statusFilter === 'low' ? 'Low Stock' : 'Out of Stock'} ✕</button>}
                </div>
                <div className="card-pro">
                  <div className="p-3">
                    <DataTable columns={stockColumns} data={filteredProducts} searchPlaceholder="Search products..." />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ADJUST STOCK */}
            {activeTab === 'adjust' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-pro">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-1">Adjust Stock</h2>
                    <p className="text-sm text-slate-500 mb-4">Manual stock correction for damaged goods, count errors, returns, etc.</p>
                    <form onSubmit={handleAdjust} className="flex flex-col gap-4">
                      {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{formError}</div>}
                      <label className="form-control">
                        <span className="label-text font-medium text-slate-700">Which product?</span>
                        <select id="inv-adjust-product" name="adjust_product_id" className="select select-bordered mt-1 text-sm" value={adjustForm.product_id} onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })} required>
                          <option value="">Choose a product...</option>
                          {products.map((p) => <option key={p.id} value={String(p.id)}>{p.name} ({p.sku}) — Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit}</option>)}
                        </select>
                      </label>
                      <label className="form-control">
                        <span className="label-text font-medium text-slate-700">How much to add or remove? *</span>
                        <input id="inv-adjust-qty" name="adjust_quantity_change" type="number" step="1" className="input input-bordered mt-1 text-sm" placeholder="Use + to add, - to remove" value={adjustForm.quantity_change} onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })} required />
                        <p className="text-xs text-slate-400 mt-1">Positive number = adding stock, negative = removing stock</p>
                      </label>
                      <label className="form-control">
                        <span className="label-text font-medium text-slate-700">Why are you adjusting? *</span>
                        <textarea id="inv-adjust-reason" name="adjust_reason" className="textarea textarea-bordered mt-1 text-sm" rows={2} placeholder="e.g. Physical count correction, Damaged goods, Returned items..." value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} required />
                      </label>
                      <button type="submit" className="btn bg-amber-500 hover:bg-amber-600 text-white border-none btn-lg shadow-md mt-2" disabled={saving}>
                        {saving ? <span className="loading loading-spinner loading-sm" /> : 'Apply Adjustment'}
                      </button>
                    </form>
                  </div>
                </div>
                <div className="card-pro">
                  <div className="p-5">
                    <h3 className="font-semibold text-sm text-slate-700 mb-3">Recent Adjustments</h3>
                    {adjustments.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">No adjustments yet</p>
                    ) : (
                      <div className="space-y-1 max-h-[500px] overflow-y-auto">
                        {adjustments.slice(0, 20).map((adj) => (
                          <div key={adj.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-800 truncate">{adj.products?.name || 'Unknown'} <span className="text-xs text-slate-400">({adj.products?.sku})</span></p>
                              <p className="text-xs text-slate-400">{adj.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className={`font-semibold text-sm ${adj.quantity_change > 0 ? 'text-green-600' : 'text-red-500'}`}>{adj.quantity_change > 0 ? '+' : ''}{Number(adj.quantity_change).toLocaleString()} {adj.products?.unit}</p>
                              {isAdmin && <button className="btn btn-ghost btn-xs text-red-400" onClick={() => handleDeleteAdjustment(adj)}>✕</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'history' && (
              <div>
                <p className="text-sm text-slate-500 mb-4">{movementLog.length} total entries</p>
                {movementLog.length === 0 ? (
                  <div className="card-pro"><div className="p-12 text-center text-slate-400"><p className="text-sm">No movement data yet</p></div></div>
                ) : (
                  <div className="space-y-1">
                    {movementLog.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors bg-white border border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${entry.type === 'purchase' ? 'bg-green-50' : 'bg-amber-50'}`}>
                            {entry.type === 'purchase'
                              ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                              : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-amber-600"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" /></svg>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{entry.productName} <span className="text-xs text-slate-400">({entry.sku})</span></p>
                            <p className="text-xs text-slate-400">{entry.type === 'purchase' ? `From ${entry.supplier}` : entry.reason}{entry.user && ` · by ${entry.user}`}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-semibold text-sm ${entry.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>{entry.quantity > 0 ? '+' : ''}{entry.quantity.toLocaleString()} {entry.unit}</p>
                          <p className="text-[11px] text-slate-400">{dateFmt(entry.date, { dateStyle: 'short', timeStyle: 'short' })}</p>
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
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{formError}</div>}
          {(() => { const p = products.find((x) => x.id === Number(editForm.product_id)); return p ? (<div className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-200"><p className="font-medium text-slate-800">{p.name}</p><p className="text-xs text-slate-400">{p.sku} · Stock: {Number(p.stock_quantity).toLocaleString()} {p.unit}</p></div>) : null })()}
          <label className="form-control"><span className="label-text text-sm font-medium text-slate-700">Alert when stock falls below</span><input id="inv-edit-reorder" name="edit_reorder_level" type="number" step="1" min="0" className="input input-bordered input-sm mt-1" value={editForm.reorder_level} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} required /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control"><span className="label-text text-sm font-medium text-slate-700">Selling Price (₱)</span><input id="inv-edit-price" name="edit_price" type="number" step="1" min="0" className="input input-bordered input-sm mt-1" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required /></label>
            <label className="form-control"><span className="label-text text-sm font-medium text-slate-700">Cost Price (₱)</span><input id="inv-edit-cost" name="edit_cost" type="number" step="1" min="0" className="input input-bordered input-sm mt-1" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} required /></label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} confirmLabel={confirmConfig.confirmLabel || 'Confirm'} danger />
    </div>
  )
}
