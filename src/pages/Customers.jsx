import { useState } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { createColumnHelper } from '@tanstack/react-table'

const emptyForm = { name: '', phone: '', email: '', address: '' }

function translateDeleteError(message) {
  if (!message) return 'Failed to delete customer'
  if (message.includes('foreign key') || message.includes('violates')) {
    return 'Cannot delete customer. They have existing sales records.'
  }
  return message
}

export default function Customers() {
  const { customers, loading, error: loadError, createCustomer, updateCustomer, deleteCustomer } = useCustomers()
  const { isAdmin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { addToast } = useToast()

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(customer) {
    setEditing(customer)
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      }
      if (editing) {
        await updateCustomer(editing.id, payload)
      } else {
        await createCustomer(payload)
      }
      setModalOpen(false)
      addToast(editing ? 'Customer updated successfully' : 'Customer created successfully')
    } catch (err) {
      setFormError(err.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(customer) {
    setDeleteTarget(customer)
    setConfirmOpen(true)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setPageError('')
    deleteCustomer(deleteTarget.id)
      .then(() => {
        addToast('Customer deleted successfully')
        setConfirmOpen(false)
        setDeleteTarget(null)
      })
      .catch((err) => {
        setPageError(translateDeleteError(err.message))
        setConfirmOpen(false)
        setDeleteTarget(null)
      })
  }

  const columnHelper = createColumnHelper()
  const columns = [
    columnHelper.accessor('name', { header: 'Name', enableSorting: true }),
    columnHelper.accessor('phone', { header: 'Phone', cell: (info) => info.getValue() || '—' }),
    columnHelper.accessor('email', { header: 'Email', cell: (info) => info.getValue() || '—' }),
    columnHelper.accessor('address', { header: 'Address', cell: (info) => info.getValue() || '—' }),
    columnHelper.accessor((row) => row.sales?.[0]?.count ?? 0, {
      id: 'sales',
      header: 'Sales',
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex gap-1 justify-end">
          <button className="btn btn-ghost btn-xs text-slate-600" onClick={() => openEdit(info.row.original)}>Edit</button>
          {isAdmin && (
            <button className="btn btn-ghost btn-xs text-red-500" onClick={() => handleDelete(info.row.original)}>Del</button>
          )}
        </div>
      ),
    }),
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} customer${customers.length !== 1 ? 's' : ''} total`}
        actions={
          <button className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" onClick={openCreate}>+ Add Customer</button>
        }
      />

      {(loadError || pageError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{loadError || pageError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span></div>
      ) : (
        <div className="card-pro">
          <div className="p-3">
            <DataTable columns={columns} data={customers} searchPlaceholder="Search customers..." />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg" role="alert">{formError}</div>}

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Name</span>
            <input className="input input-bordered input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Phone</span>
              <input type="tel" className="input input-bordered input-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="form-control">
              <span className="label-text text-sm font-medium text-slate-700">Email</span>
              <input type="email" className="input input-bordered input-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Address</span>
            <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
        title="Delete Customer"
        message={deleteTarget ? `Delete customer "${deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
