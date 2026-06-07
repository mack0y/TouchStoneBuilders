import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { createColumnHelper } from '@tanstack/react-table'

const emptyForm = { name: '', description: '' }

export default function Categories() {
  const { categories, loading, error: loadError, createCategory, updateCategory, deleteCategory } = useCategories()
  const { isAdmin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { addToast } = useToast()

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(cat) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '' })
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null }
      if (editing) {
        await updateCategory(editing.id, payload)
      } else {
        await createCategory(payload)
      }
      setModalOpen(false)
      addToast(editing ? 'Category updated successfully' : 'Category created successfully')
    } catch (err) {
      setError(err.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(cat) {
    setDeleteTarget(cat)
    setConfirmOpen(true)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setError('')
    deleteCategory(deleteTarget.id)
      .then(() => {
        addToast('Category deleted successfully')
        setConfirmOpen(false)
        setDeleteTarget(null)
      })
      .catch((err) => {
        setError(err.message || 'Failed to delete category')
        setConfirmOpen(false)
        setDeleteTarget(null)
      })
  }

  const columnHelper = createColumnHelper()
  const columns = [
    columnHelper.accessor('name', { header: 'Name', enableSorting: true }),
    columnHelper.accessor('description', { header: 'Description', cell: (info) => info.getValue() || '—' }),
    columnHelper.display({
      id: 'products',
      header: 'Products',
      cell: (info) => info.row.original.products?.[0]?.count ?? 0,
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
        title="Categories"
        description={`${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
        actions={
          isAdmin && <button className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" onClick={openCreate}>+ Add Category</button>
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
            <DataTable columns={columns} data={categories} searchPlaceholder="Search categories..." />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Name</span>
            <input className="input input-bordered input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Description</span>
            <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={deleteTarget ? `Delete category "${deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
