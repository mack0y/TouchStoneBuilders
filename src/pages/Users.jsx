import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { createColumnHelper } from '@tanstack/react-table'
import { dateFmt } from '../lib/format'

const emptyForm = { email: '', password: '', full_name: '', role: 'worker' }

export default function Users() {
  const { users, loading, error: loadError, createUser, updateRole, toggleActive } = useUsers()
  const { user: currentUser } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null })
  const { addToast } = useToast()

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.password || !form.full_name.trim()) {
      setError('Email, password, and full name are required')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setSaving(true)
    try {
      await createUser({
        email: form.email,
        password: form.password,
        fullName: form.full_name,
        role: form.role,
      })
      setModalOpen(false)
      addToast('User created successfully')
    } catch (err) {
      setError(err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  function showConfirm(title, message, onConfirm) {
    setConfirmConfig({ title, message, onConfirm })
    setConfirmOpen(true)
  }

  function handleToggleActive(u) {
    const active = u.is_active ?? true
    showConfirm(
      `${active ? 'Deactivate' : 'Activate'} User`,
      `${active ? 'Deactivate' : 'Activate'} user "${u.full_name || u.email}"?`,
      async () => {
        try {
          await toggleActive(u.id, !active)
          addToast(`User ${active ? 'deactivated' : 'activated'} successfully`)
        } catch (err) {
          setError(err.message || 'Failed to toggle user status')
        }
        setConfirmOpen(false)
      }
    )
  }

  function handleRoleChange(u, role) {
    showConfirm(
      'Change Role',
      `Change role for "${u.full_name || u.email}" to ${role}?`,
      async () => {
        try {
          await updateRole(u.id, role)
          addToast('Role updated successfully')
        } catch (err) {
          setError(err.message || 'Failed to update role')
        }
        setConfirmOpen(false)
      }
    )
  }

  const columnHelper = createColumnHelper()
  const columns = [
    columnHelper.accessor('full_name', { header: 'Name', enableSorting: true, cell: (info) => info.getValue() || '—' }),
    columnHelper.accessor('email', { header: 'Email', enableSorting: true }),
    columnHelper.accessor('role', {
      header: 'Role',
      enableSorting: true,
      cell: (info) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.getValue() === 'admin' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600'}`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.is_active ?? true, {
      id: 'is_active',
      header: 'Status',
      enableSorting: true,
      cell: (info) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.getValue() ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {info.getValue() ? 'Active' : 'Inactive'}
        </span>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      enableSorting: true,
      cell: (info) => dateFmt(info.getValue(), { dateStyle: 'short' }),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const u = info.row.original
        const isSelf = u.id === currentUser?.id
        return (
          <div className="flex gap-1 justify-end">
            {u.role === 'admin'
              ? <button className="btn btn-ghost btn-xs text-slate-600" onClick={() => handleRoleChange(u, 'worker')} disabled={isSelf}>Demote</button>
              : <button className="btn btn-ghost btn-xs text-slate-600" onClick={() => handleRoleChange(u, 'admin')} disabled={isSelf}>Promote</button>
            }
            <button
              className={`btn btn-ghost btn-xs ${(u.is_active ?? true) ? 'text-amber-600' : 'text-green-600'}`}
              onClick={() => handleToggleActive(u)}
              disabled={isSelf}
            >
              {(u.is_active ?? true) ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        )
      },
    }),
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} user${users.length !== 1 ? 's' : ''} total`}
        actions={
          <button className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" onClick={openCreate}>+ Add User</button>
        }
      />

      {(loadError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{loadError || error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span></div>
      ) : (
        <div className="card-pro">
          <div className="p-3">
            <DataTable columns={columns} data={users} searchPlaceholder="Search users..." />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg" role="alert">{error}</div>}

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Full Name</span>
            <input id="user-name" name="full_name" className="input input-bordered input-sm" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </label>

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Email</span>
            <input id="user-email" name="email" type="email" className="input input-bordered input-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Password</span>
            <input id="user-password" name="password" type="password" className="input input-bordered input-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </label>

          <label className="form-control">
            <span className="label-text text-sm font-medium text-slate-700">Role</span>
            <select id="user-role" name="role" className="select select-bordered select-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-ghost btn-sm text-slate-600" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-sm bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel="Confirm"
        danger
      />
    </div>
  )
}
