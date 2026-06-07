import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchSuppliers()
    return () => { mountedRef.current = false }
  }, [])

  async function fetchSuppliers() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, purchases(count)')
      .order('name')
    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setSuppliers([])
    } else {
      setSuppliers(data || [])
    }
    setLoading(false)
  }

  async function createSupplier(values) {
    const { error } = await supabase.from('suppliers').insert(values)
    if (error) throw error
    await fetchSuppliers()
  }

  async function updateSupplier(id, values) {
    const { error } = await supabase.from('suppliers').update(values).eq('id', id)
    if (error) throw error
    await fetchSuppliers()
  }

  async function deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) throw error
    await fetchSuppliers()
  }

  return { suppliers, loading, error, createSupplier, updateSupplier, deleteSupplier, refetch: fetchSuppliers }
}
