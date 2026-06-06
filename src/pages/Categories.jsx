import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
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
    } catch (err) {
      setError(err.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(cat) {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return
    setError('')
    deleteCategory(cat.id).catch((err) => {
      setError(err.message || 'Failed to delete category')
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
          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(info.row.original)}>Edit</button>
          <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(info.row.original)}>Del</button>
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
          isAdmin && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Category</button>
        }
      />

      {loadError && (
        <div className="alert alert-error text-sm mb-4">{loadError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-3">
            <DataTable columns={columns} data={categories} searchPlaceholder="Search categories..." />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {error && <div className="alert alert-error text-sm py-2">{error}</div>}

          <label className="form-control">
            <span className="label-text">Name</span>
            <input className="input input-bordered input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>

          <label className="form-control">
            <span className="label-text">Description</span>
            <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
