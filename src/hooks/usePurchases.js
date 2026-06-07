import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const TZ_OFFSET = '+08:00'

export function usePurchases({ startDate, endDate } = {}) {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchPurchases()
    return () => { mountedRef.current = false }
  }, [startDate, endDate])

  async function fetchPurchases() {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('purchases')
      .select('*, products(name, sku, unit), suppliers(name)')
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)
    }

    const { data, error } = await query

    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setPurchases([])
    } else {
      setPurchases(data || [])
    }
    setLoading(false)
  }

  return { purchases, loading, error, refetch: fetchPurchases }
}

export async function createPurchase({ productId, supplierId, quantity, unitCost }) {
  const totalCost = Math.round(quantity * unitCost * 100) / 100
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      product_id: productId,
      supplier_id: supplierId || null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}