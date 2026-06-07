import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const TZ_OFFSET = '+08:00'

function todayPHT() {
  const now = new Date()
  const pht = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  return pht.toISOString().split('T')[0]
}

function startOfMonthPHT() {
  const now = new Date()
  const pht = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  return `${pht.getFullYear()}-${String(pht.getMonth() + 1).padStart(2, '0')}-01`
}

export function useDashboard() {
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    todaySalesCount: 0,
    todayRevenue: 0,
  })
  const [salesTrend, setSalesTrend] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchAll()
    return () => { mountedRef.current = false }
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchKPIs(),
        fetchSalesTrend(),
        fetchLowStockProducts(),
        fetchRecentSales(),
        fetchTopProducts(),
      ])
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function fetchKPIs() {
    const today = todayPHT()

    const [
      { count: totalProducts },
      { count: lowStockCount },
      { data: todaySales },
      { data: todayRevenueData },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .filter('stock_quantity', 'lte', 'reorder_level'),
      supabase
        .from('sales')
        .select('id', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00${TZ_OFFSET}`)
        .lte('created_at', `${today}T23:59:59${TZ_OFFSET}`),
      supabase
        .from('sales')
        .select('total')
        .gte('created_at', `${today}T00:00:00${TZ_OFFSET}`)
        .lte('created_at', `${today}T23:59:59${TZ_OFFSET}`),
    ])

    const todayRevenue = todayRevenueData?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0

    if (!mountedRef.current) return
    setKpis({
      totalProducts: totalProducts ?? 0,
      lowStockCount: lowStockCount ?? 0,
      todaySalesCount: todaySales ?? 0,
      todayRevenue,
    })
  }

  async function fetchSalesTrend() {
    const startDate = startOfMonthPHT()
    const { data, error } = await supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
      .order('created_at', { ascending: true })

    if (error) throw error

    const dailyMap = new Map()
    ;(data || []).forEach((sale) => {
      const date = new Date(sale.created_at).toISOString().split('T')[0]
      dailyMap.set(date, (dailyMap.get(date) || 0) + Number(sale.total))
    })

    const trend = []
    const start = new Date(startDate)
    const end = new Date(todayPHT())
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      trend.push({ date: key, total: dailyMap.get(key) || 0 })
    }

    if (!mountedRef.current) return
    setSalesTrend(trend)
  }

  async function fetchLowStockProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity, reorder_level, unit, categories(name)')
      .filter('stock_quantity', 'lte', 'reorder_level')
      .order('stock_quantity', { ascending: true })
      .limit(10)

    if (error) throw error
    if (!mountedRef.current) return
    setLowStockProducts(data || [])
  }

  async function fetchRecentSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('id, invoice_no, total, created_at, customers(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    if (!mountedRef.current) return
    setRecentSales(data || [])
  }

  async function fetchTopProducts() {
    const startDate = startOfMonthPHT()
    const { data, error } = await supabase
      .from('sale_items')
      .select('quantity, products(name, sku, unit)')
      .gte('sales.created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
      .order('quantity', { ascending: false })

    if (error) throw error

    const productMap = new Map()
    ;(data || []).forEach((item) => {
      const key = item.products?.id || item.products?.name
      if (!key) return
      const existing = productMap.get(key) || { name: item.products?.name, sku: item.products?.sku, unit: item.products?.unit, totalQty: 0 }
      existing.totalQty += Number(item.quantity)
      productMap.set(key, existing)
    })

    const top = Array.from(productMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5)

    if (!mountedRef.current) return
    setTopProducts(top)
  }

  return {
    kpis,
    salesTrend,
    lowStockProducts,
    recentSales,
    topProducts,
    loading,
    error,
    refetch: fetchAll,
  }
}