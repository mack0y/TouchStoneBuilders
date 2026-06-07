import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const TZ_OFFSET = '+08:00'

export function useReports({ startDate, endDate } = {}) {
  const [salesReport, setSalesReport] = useState(null)
  const [inventoryReport, setInventoryReport] = useState(null)
  const [profitReport, setProfitReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchAll()
    return () => { mountedRef.current = false }
  }, [startDate, endDate])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchSalesReport(),
        fetchInventoryReport(),
        fetchProfitReport(),
      ])
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function fetchSalesReport() {
    let query = supabase
      .from('sales')
      .select('id, total, discount, subtotal, created_at, sale_items(quantity, products(cost))')

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)
    }

    const { data, error } = await query
    if (error) throw error

    const sales = data || []
    const totalSales = sales.length
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0)
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount || 0), 0)
    const totalItems = sales.reduce((sum, s) => sum + (s.sale_items?.reduce((s2, i) => s2 + Number(i.quantity), 0) || 0), 0)
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

    if (!mountedRef.current) return
    setSalesReport({
      totalSales,
      totalRevenue,
      totalDiscount,
      totalItems,
      avgOrderValue,
    })
  }

  async function fetchInventoryReport() {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity, unit, price, cost, categories(name)')
      .order('name')

    if (error) throw error

    const products = data || []
    const totalProducts = products.length
    const totalStockValue = products.reduce((sum, p) => sum + Number(p.stock_quantity) * Number(p.price), 0)
    const totalCostValue = products.reduce((sum, p) => sum + Number(p.stock_quantity) * Number(p.cost), 0)
    const lowStockCount = products.filter(p => Number(p.stock_quantity) <= Number(p.reorder_level)).length
    const outOfStockCount = products.filter(p => Number(p.stock_quantity) <= 0).length

    if (!mountedRef.current) return
    setInventoryReport({
      totalProducts,
      totalStockValue,
      totalCostValue,
      lowStockCount,
      outOfStockCount,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.categories?.name || '—',
        stock: Number(p.stock_quantity),
        unit: p.unit,
        price: Number(p.price),
        cost: Number(p.cost),
        stockValue: Number(p.stock_quantity) * Number(p.price),
        costValue: Number(p.stock_quantity) * Number(p.cost),
      })),
    })
  }

  async function fetchProfitReport() {
    let salesQuery = supabase
      .from('sales')
      .select('id, total, discount, subtotal, created_at, sale_items(quantity, unit_price, products(cost, name, sku))')

    if (startDate) {
      salesQuery = salesQuery.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    }
    if (endDate) {
      salesQuery = salesQuery.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)
    }

    const { data: sales, error: salesError } = await salesQuery
    if (salesError) throw salesError

    let totalRevenue = 0
    let totalCOGS = 0
    let totalDiscount = 0
    const productProfitMap = new Map()

    ;(sales || []).forEach(sale => {
      const saleTotal = Number(sale.total)
      const saleDiscount = Number(sale.discount || 0)
      totalRevenue += saleTotal
      totalDiscount += saleDiscount

      ;(sale.sale_items || []).forEach(item => {
        const qty = Number(item.quantity)
        const unitPrice = Number(item.unit_price)
        const productCost = Number(item.products?.cost || 0)
        const itemRevenue = qty * unitPrice
        const itemCOGS = qty * productCost

        totalCOGS += itemCOGS

        const key = item.products?.id || item.products?.name
        if (key) {
          const existing = productProfitMap.get(key) || {
            name: item.products?.name || 'Unknown',
            sku: item.products?.sku || '',
            revenue: 0,
            cogs: 0,
            qty: 0,
          }
          existing.revenue += itemRevenue
          existing.cogs += itemCOGS
          existing.qty += qty
          productProfitMap.set(key, existing)
        }
      })
    })

    const grossProfit = totalRevenue - totalCOGS
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    const topProductsByProfit = Array.from(productProfitMap.values())
      .map(p => ({ ...p, profit: p.revenue - p.cogs, margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0 }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)

    if (!mountedRef.current) return
    setProfitReport({
      totalRevenue,
      totalCOGS,
      totalDiscount,
      grossProfit,
      profitMargin,
      topProductsByProfit,
    })
  }

  return {
    salesReport,
    inventoryReport,
    profitReport,
    loading,
    error,
    refetch: fetchAll,
  }
}

export function convertToCSV(data, headers) {
  const rows = [headers.join(',')]
  data.forEach(row => {
    rows.push(headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(','))
  })
  return rows.join('\n')
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}