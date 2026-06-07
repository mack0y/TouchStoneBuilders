import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setUsers([])
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchUsers()
    return () => { mountedRef.current = false }
  }, [fetchUsers])

  async function createUser({ email, password, fullName, role }) {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email.trim(),
      p_password,
      p_full_name: fullName.trim(),
      p_role: role || 'worker',
    })
    if (error) throw error
    await fetchUsers()
    return data
  }

  async function updateRole(userId, role) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (error) throw error
    await fetchUsers()
  }

  async function toggleActive(userId, isActive) {
    const { error } = await supabase.rpc('admin_toggle_user_active', {
      p_user_id: userId,
      p_is_active: isActive,
    })
    if (error) throw error
    await fetchUsers()
  }

  return { users, loading, error, createUser, updateRole, toggleActive, refetch: fetchUsers }
}