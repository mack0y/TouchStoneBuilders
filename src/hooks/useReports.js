import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const TZ_OFFSET = '+08:00'

export function useReports({ startDate, endDate, categoryFilter } = {}) {
  const [dailySales, setDailySales] = useState(null)
  const [salesByCategory, setSalesByCategory] = useState(null)
  const [topProducts, setTopProducts] = useState(null)
  const [salesByCustomer, setSalesByCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchAll()
    return () => { mountedRef.current = false }
  }, [startDate, endDate, categoryFilter])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchDailySales(),
        fetchSalesByCategory(),
        fetchTopProducts(),
        fetchSalesByCustomer(),
      ])
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function fetchDailySales() {
    let query = supabase
      .from('sales')
      .select(`
        id, invoice_no, total, discount, subtotal, created_at,
        customers(name),
        sale_items(quantity, unit_price, products(name))
      `)
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)

    const { data, error: err } = await query
    if (err) throw err

    const sales = (data || []).map(sale => {
      const itemCount = (sale.sale_items || []).reduce((sum, i) => sum + Number(i.quantity), 0)
      const customerName = Array.isArray(sale.customers) ? sale.customers[0]?.name : sale.customers?.name
      return {
        id: sale.id,
        inv_no: sale.invoice_no,
        total: Number(sale.total),
        discount: Number(sale.discount || 0),
        subtotal: Number(sale.subtotal || sale.total),
        created_at: sale.created_at,
        customer: customerName || 'Walk-in',
        itemCount,
      }
    })

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
    const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0)
    const totalItems = sales.reduce((sum, s) => sum + s.itemCount, 0)
    const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0

    if (!mountedRef.current) return
    setDailySales({
      sales,
      totalRevenue,
      totalDiscount,
      totalSalesCount: sales.length,
      totalItems,
      avgOrderValue,
    })
  }

  async function fetchSalesByCategory() {
    let query = supabase
      .from('sales')
      .select(`
        id, invoice_no, total, created_at,
        customers(name),
        sale_items(quantity, unit_price, subtotal, products(name, sku, unit, categories(name)))
      `)
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)

    const { data, error: err } = await query
    if (err) throw err

    const categoryMap = new Map()
    let grandTotal = 0

    ;(data || []).forEach(sale => {
      const customerName = Array.isArray(sale.customers) ? sale.customers[0]?.name : sale.customers?.name
      ;(sale.sale_items || []).forEach(item => {
        const qty = Number(item.quantity)
        const unitPrice = Number(item.unit_price)
        const itemTotal = qty * unitPrice
        const p = item.products
        const catName = Array.isArray(p?.categories)
          ? p.categories[0]?.name
          : p?.categories?.name || 'Uncategorized'

        // Apply category filter if set
        if (categoryFilter && catName !== categoryFilter) return

        grandTotal += itemTotal
        const existing = categoryMap.get(catName) || { name: catName, revenue: 0, qty: 0, products: [] }
        existing.revenue += itemTotal
        existing.qty += qty

        // Add itemized product details
        existing.products.push({
          productName: p?.name || 'Unknown',
          sku: p?.sku || '',
          unit: p?.unit || 'pcs',
          quantity: qty,
          unitPrice: unitPrice,
          subtotal: itemTotal,
          invoiceNo: sale.invoice_no || `#${sale.id}`,
          customer: customerName || 'Walk-in',
          date: sale.created_at,
        })

        categoryMap.set(catName, existing)
      })
    })

    const categories = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        percentage: grandTotal > 0 ? (c.revenue / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    if (!mountedRef.current) return
    setSalesByCategory({
      categories,
      grandTotal,
    })
  }

  async function fetchTopProducts() {
    let query = supabase
      .from('sales')
      .select(`
        sale_items(quantity, unit_price, products(name, sku, unit, cost, categories(name)))
      `)

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)

    const { data, error: err } = await query
    if (err) throw err

    const productMap = new Map()

    ;(data || []).forEach(sale => {
      ;(sale.sale_items || []).forEach(item => {
        const p = item.products
        if (!p) return
        const key = p.name
        const qty = Number(item.quantity)
        const unitPrice = Number(item.unit_price)
        const cost = Number(p.cost || 0)
        const catName = Array.isArray(p.categories) ? p.categories[0]?.name : p.categories?.name || '—'

        const existing = productMap.get(key) || {
          name: p.name,
          sku: p.sku || '',
          unit: p.unit || 'pcs',
          category: catName,
          totalQty: 0,
          revenue: 0,
          cogs: 0,
        }
        existing.totalQty += qty
        existing.revenue += qty * unitPrice
        existing.cogs += qty * cost
        productMap.set(key, existing)
      })
    })

    const products = Array.from(productMap.values())
      .map(p => ({ ...p, profit: p.revenue - p.cogs }))
      .sort((a, b) => b.totalQty - a.totalQty)

    if (!mountedRef.current) return
    setTopProducts({ products })
  }

  async function fetchSalesByCustomer() {
    let query = supabase
      .from('sales')
      .select(`
        id, total, created_at,
        customers(id, name, phone)
      `)

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00${TZ_OFFSET}`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59${TZ_OFFSET}`)

    const { data, error: err } = await query
    if (err) throw err

    const customerMap = new Map()

    ;(data || []).forEach(sale => {
      const cust = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers
      const name = cust?.name || 'Walk-in'
      const key = cust?.id || name

      const existing = customerMap.get(key) || {
        name,
        phone: cust?.phone || '—',
        salesCount: 0,
        totalSpent: 0,
      }
      existing.salesCount += 1
      existing.totalSpent += Number(sale.total)
      customerMap.set(key, existing)
    })

    const customers = Array.from(customerMap.values())
      .map(c => ({ ...c, avgOrder: c.salesCount > 0 ? c.totalSpent / c.salesCount : 0 }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const uniqueCustomers = customers.filter(c => c.name !== 'Walk-in').length

    if (!mountedRef.current) return
    setSalesByCustomer({
      customers,
      totalRevenue,
      totalCustomers: customers.length,
      uniqueCustomers,
    })
  }

  return {
    dailySales,
    salesByCategory,
    topProducts,
    salesByCustomer,
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
