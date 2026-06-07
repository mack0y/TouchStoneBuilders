import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useInventory() {
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
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
    const [productsRes, purchasesRes, adjustmentsRes, suppliersRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(name)')
        .order('name'),
      supabase
        .from('purchases')
        .select('*, products(name, sku, unit), suppliers(name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('stock_adjustments')
        .select('*, products(name, sku, unit), profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('suppliers')
        .select('id, name')
        .order('name'),
      supabase
        .from('categories')
        .select('id, name')
        .order('name'),
    ])

    if (!mountedRef.current) return

    if (productsRes.error) {
      setError(productsRes.error.message)
      setProducts([])
    } else {
      setProducts(productsRes.data || [])
    }

    if (!purchasesRes.error) setPurchases(purchasesRes.data || [])
    if (!adjustmentsRes.error) setAdjustments(adjustmentsRes.data || [])
    if (!suppliersRes.error) setSuppliers(suppliersRes.data || [])
    if (!categoriesRes.error) setCategories(categoriesRes.data || [])
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  // ── Receive Stock (creates purchase record, auto-adds stock via trigger) ──
  async function receiveStock({ productId, supplierId, quantity, unitCost }) {
    const totalCost = Math.round(quantity * unitCost * 100) / 100
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('purchases').insert({
      product_id: productId,
      supplier_id: supplierId || null,
      user_id: userId,
      quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
    })
    if (error) throw error
    await fetchAll()
  }

  // ── Manual Stock Adjustment ──
  async function adjustStock(productId, quantityChange, reason) {
    const { error } = await supabase.rpc('adjust_stock', {
      p_product_id: productId,
      p_quantity_change: quantityChange,
      p_reason: reason,
    })
    if (error) throw error
    await fetchAll()
  }

  // ── Delete Purchase (reverses stock via trigger) ──
  async function deletePurchase(id) {
    const { error } = await supabase.from('purchases').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  // ── Delete Stock Adjustment (reverses stock via trigger) ──
  async function deleteAdjustment(id) {
    const { error } = await supabase.from('stock_adjustments').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  // ── Update Product (reorder level, cost, price) ──
  async function updateProduct(id, values) {
    const { error } = await supabase.from('products').update(values).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  // ── Create New Product ──
  async function createProduct(values) {
    const { error } = await supabase.from('products').insert(values)
    if (error) throw error
    await fetchAll()
  }

  // ── Create New Category (returns created category id) ──
  async function createCategory(values) {
    const { data, error } = await supabase.from('categories').insert(values).select('id').single()
    if (error) throw error
    await fetchAll()
    return data
  }

  // ── Create New Supplier (returns created supplier id) ──
  async function createSupplier(values) {
    const { data, error } = await supabase.from('suppliers').insert(values).select('id').single()
    if (error) throw error
    await fetchAll()
    return data
  }

  // ── Movement Log (unified timeline of purchases + adjustments) ──
  const movementLog = [
    ...purchases.map((p) => ({
      id: `purchase-${p.id}`,
      type: 'purchase',
      productName: p.products?.name || 'Unknown',
      sku: p.products?.sku || '',
      unit: p.products?.unit || 'pcs',
      quantity: Number(p.quantity),
      cost: Number(p.unit_cost),
      supplier: p.suppliers?.name || 'Direct',
      date: p.created_at,
      user: null,
    })),
    ...adjustments.map((a) => ({
      id: `adjustment-${a.id}`,
      type: 'adjustment',
      productName: a.products?.name || 'Unknown',
      sku: a.products?.sku || '',
      unit: a.products?.unit || 'pcs',
      quantity: Number(a.quantity_change),
      reason: a.reason,
      date: a.created_at,
      user: a.profiles?.full_name || 'Unknown',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  // ── Summary Stats ──
  const totalProducts = products.length
  const totalStockValue = products.reduce((sum, p) => sum + Number(p.stock_quantity) * Number(p.cost), 0)
  const lowStockCount = products.filter((p) => Number(p.stock_quantity) <= Number(p.reorder_level) && Number(p.stock_quantity) > 0).length
  const outOfStockCount = products.filter((p) => Number(p.stock_quantity) <= 0).length

  // ── Auto-generate SKU from category ──
  function generateSku(categoryId) {
    const cat = categories.find((c) => c.id === categoryId)
    const prefix = cat ? cat.name.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() : 'ITM'
    const existingInCategory = products.filter((p) => p.category_id === categoryId && p.sku.startsWith(prefix))
    const nextNum = existingInCategory.length + 1
    return `${prefix}-${String(nextNum).padStart(3, '0')}`
  }

  return {
    products,
    purchases,
    adjustments,
    suppliers,
    categories,
    generateSku,
    movementLog,
    loading,
    error,
    receiveStock,
    adjustStock,
    deletePurchase,
    deleteAdjustment,
    updateProduct,
    createProduct,
    createCategory,
    createSupplier,
    refetch: fetchAll,
    totalProducts,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
  }
}
