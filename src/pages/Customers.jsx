import { useState } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
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
    } catch (err) {
      setFormError(err.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(customer) {
    if (!window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return
    setPageError('')
    deleteCustomer(customer.id).catch((err) => {
      setPageError(translateDeleteError(err.message))
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
          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(info.row.original)}>Edit</button>
          {isAdmin && (
            <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(info.row.original)}>Del</button>
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
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Customer</button>
        }
      />

      {(loadError || pageError) && (
        <div className="alert alert-error text-sm mb-4" role="alert">{loadError || pageError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-3">
            <DataTable columns={columns} data={customers} searchPlaceholder="Search customers..." />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {formError && <div className="alert alert-error text-sm py-2" role="alert">{formError}</div>}

          <label className="form-control">
            <span className="label-text">Name</span>
            <input className="input input-bordered input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text">Phone</span>
              <input type="tel" className="input input-bordered input-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="form-control">
              <span className="label-text">Email</span>
              <input type="email" className="input input-bordered input-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>

          <label className="form-control">
            <span className="label-text">Address</span>
            <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
