import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { createColumnHelper } from '@tanstack/react-table'

const emptyForm = { name: '', description: '', category_id: '', unit: 'pcs', price: '', cost: '', stock_quantity: '0', reorder_level: '0' }

export default function Products() {
  const { products, loading, error: loadError, updateProduct, deleteProduct } = useProducts()
  const { categories } = useCategories()
  const { isAdmin } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { addToast } = useToast()

  function openEdit(product) {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id?.toString() || '',
      unit: product.unit,
      price: String(product.price ?? ''),
      cost: String(product.cost ?? ''),
      stock_quantity: String(product.stock_quantity ?? '0'),
      reorder_level: String(product.reorder_level ?? '0'),
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        unit: form.unit,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        image_url: form.image_url.trim() || null,
      }
      if (editing) {
        await updateProduct(editing.id, payload)
      }
      setModalOpen(false)
      addToast('Product updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(product) {
    setDeleteTarget(product)
    setConfirmOpen(true)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteProduct(deleteTarget.id)
      .then(() => {
        addToast('Product deleted successfully')
        setConfirmOpen(false)
        setDeleteTarget(null)
      })
      .catch((err) => {
        setError(err.message)
        setConfirmOpen(false)
        setDeleteTarget(null)
      })
  }

  const filtered = categoryFilter
    ? products.filter((p) => p.category_id === Number(categoryFilter))
    : products

  const columnHelper = createColumnHelper()

  const columns = [
    columnHelper.accessor('sku', { header: 'SKU', enableSorting: true }),
    columnHelper.accessor('name', { header: 'Name', enableSorting: true }),
    columnHelper.accessor((row) => row.categories?.name || '-', { id: 'category', header: 'Category', enableSorting: true }),
    columnHelper.accessor('unit', { header: 'Unit', enableSorting: true }),
    columnHelper.accessor('price', {
      header: 'Price',
      enableSorting: true,
      cell: (info) => `₱${Number(info.getValue()).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    }),
    columnHelper.accessor('stock_quantity', {
      header: 'Stock',
      enableSorting: true,
      cell: (info) => {
        const qty = Number(info.getValue())
        const reorder = Number(info.row.original.reorder_level)
        return (
          <span className={qty <= reorder ? 'text-red-600 font-medium' : 'text-slate-700'}>
            {qty.toLocaleString()}
            {qty <= reorder && ' ⚠'}
          </span>
        )
      },
    }),
    ...(isAdmin ? [columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex gap-1 justify-end">
          <button className="btn btn-ghost btn-xs text-slate-600" onClick={() => openEdit(info.row.original)}>Edit</button>
          <button className="btn btn-ghost btn-xs text-red-500" onClick={() => handleDelete(info.row.original)}>Del</button>
        </div>
      ),
    })] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} product${products.length !== 1 ? 's' : ''} total`}
        actions={
          <>
            <select className="select select-bordered select-sm text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>

          </>
        }
      />

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{loadError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span></div>
      ) : (
        <div className="card-pro">
          <div className="p-3">
            <DataTable columns={columns} data={filtered} searchPlaceholder="Search products..." />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit Product">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Name</span>
              <input id="prod-name" name="name" className="input input-bordered input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Unit</span>
              <select id="prod-unit" name="unit" className="select select-bordered select-sm" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {['pcs', 'kg', 'sack', 'meter', 'liter', 'sheet', 'box', 'pack', 'set', 'gallon', 'roll', 'bd.ft', 'cu.m', 'pair'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Description</span>
            <textarea id="prod-description" name="description" className="textarea textarea-bordered textarea-sm" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Category</span>
              <select id="prod-category" name="category_id" className="select select-bordered select-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </label>
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Reorder Level</span>
              <input id="prod-reorder" name="reorder_level" type="number" step="1" min="0" className="input input-bordered input-sm" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Selling Price (₱)</span>
              <input id="prod-price" name="price" type="number" step="1" min="0" className="input input-bordered input-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </label>
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Cost Price (₱)</span>
              <input id="prod-cost" name="cost" type="number" step="1" min="0" className="input input-bordered input-sm" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
