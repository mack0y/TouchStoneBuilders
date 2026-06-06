import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchProducts()
    return () => { mountedRef.current = false }
  }, [])

  async function fetchProducts() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name')
    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setProducts([])
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  async function createProduct(values) {
    const { error } = await supabase.from('products').insert(values)
    if (error) throw error
    await fetchProducts()
  }

  async function updateProduct(id, values) {
    const { error } = await supabase.from('products').update(values).eq('id', id)
    if (error) throw error
    await fetchProducts()
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    await fetchProducts()
  }

  return { products, loading, error, createProduct, updateProduct, deleteProduct, refetch: fetchProducts }
}
