import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchCategories()
    return () => { mountedRef.current = false }
  }, [])

  async function fetchCategories() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(count)')
      .order('name')
    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setCategories([])
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }

  async function createCategory(values) {
    const { error } = await supabase.from('categories').insert(values)
    if (error) throw error
    await fetchCategories()
  }

  async function updateCategory(id, values) {
    const { error } = await supabase.from('categories').update(values).eq('id', id)
    if (error) throw error
    await fetchCategories()
  }

  async function deleteCategory(id) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    await fetchCategories()
  }

  return { categories, loading, error, createCategory, updateCategory, deleteCategory, refetch: fetchCategories }
}
