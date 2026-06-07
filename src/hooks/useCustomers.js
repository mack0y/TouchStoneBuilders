import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchCustomers()
    return () => { mountedRef.current = false }
  }, [])

  async function fetchCustomers() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('customers')
      .select('*, sales(count)')
      .order('name')
    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setCustomers([])
    } else {
      setCustomers(data || [])
    }
    setLoading(false)
  }

  async function createCustomer(values) {
    const { error } = await supabase.from('customers').insert(values)
    if (error) throw error
    await fetchCustomers()
  }

  async function updateCustomer(id, values) {
    const { error } = await supabase.from('customers').update(values).eq('id', id)
    if (error) throw error
    await fetchCustomers()
  }

  async function deleteCustomer(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
    await fetchCustomers()
  }

  return { customers, loading, error, createCustomer, updateCustomer, deleteCustomer, refetch: fetchCustomers }
}
