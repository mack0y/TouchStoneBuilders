import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const TZ_OFFSET = '+08:00'

export function useSales({ startDate, endDate } = {}) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchSales()
    return () => { mountedRef.current = false }
  }, [startDate, endDate])

  async function fetchSales() {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('sales')
      .select('*, customers(name), sale_items(count)')
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
      setSales([])
    } else {
      setSales(data || [])
    }
    setLoading(false)
  }

  return { sales, loading, error, refetch: fetchSales }
}

export function useSale(id) {
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchSale()
    return () => { mountedRef.current = false }
  }, [id])

  async function fetchSale() {
    if (!id || !/^\d+$/.test(String(id))) {
      setSale(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('sales')
      .select('*, customers(name, phone, email, address), sale_items(*, products(name, unit, sku))')
      .eq('id', id)
      .single()

    if (!mountedRef.current) return
    if (error) {
      setError(error.message)
      setSale(null)
    } else {
      setSale(data)
    }
    setLoading(false)
  }

  return { sale, loading, error, refetch: fetchSale }
}

export async function createSale({ customerId, discount, items, deliveryAddress, deliveryFee }) {
  const payload = {
    p_customer_id: customerId || null,
    p_discount: discount || 0,
    p_items: items.map((it) => ({
      product_id: it.product_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    p_delivery_address: deliveryAddress || null,
    p_delivery_fee: deliveryFee || 0,
  }
  const { data, error } = await supabase.rpc('create_sale', payload)
  if (error) throw error
  const row = data?.[0]
  if (!row) return null
  return { sale_id: Number(row.sale_id), invoice_no: row.inv_no, total: row.sale_total }
}
