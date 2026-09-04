import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Shop analytics.
 *
 * SCOPE
 *   An admin sees the whole shop. A provider sees only their own products —
 *   the same page, a narrower window. Anyone else gets nothing, because the
 *   route sits behind PrivateRoute and "logged in" is not a reason to see
 *   what the platform sells and for how much.
 *
 * WHERE THE NUMBERS COME FROM
 *   Sales are read out of order line items, which are stored as a Json[]
 *   column rather than rows — so the aggregation happens here in memory over
 *   a bounded window rather than in SQL. Views come from products.views_count,
 *   which counts one visitor per product per day.
 */

type Row = {
  product_id: string
  name: string
  image_url: string | null
  category: string | null
  price: number
  units: number
  revenue: number
  views: number
  orders: number
  stock: number
  rating: number
  provider_email: string | null
}

const insightsRoutes: FastifyPluginAsync = async (app) => {

  /**
   * Trading figures — revenue, units, stock, conversion, who sells what — are
   * for the people running the shop. A customer gets /popular instead, which
   * answers the only question they actually have: what is everyone else
   * buying.
   */
  const requireShopAccess = async (req: any, reply: any) => {
    try { await (app as any).authenticate(req, reply) }
    catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
    const role = (req.user as any)?.role
    if (!['admin', 'service_provider', 'both'].includes(role)) {
      return reply.code(403).send({ message: 'Δεν έχεις πρόσβαση στα στατιστικά καταστήματος' })
    }
  }

  /**
   * Most popular products — public.
   *
   * Ranked by units sold over the window, with views breaking ties and
   * standing in for products that have been looked at but not yet bought.
   *
   * Deliberately absent: revenue, units, stock, conversion and the seller's
   * address. A shopper needs to know what is popular, not how the business is
   * doing. Publishing per-product sales figures would also tell every
   * competitor exactly what to stock.
   */
  app.get('/popular', async (req: any) => {
    const days = Math.min(Math.max(parseInt(req.query?.days) || 30, 1), 365)
    const since = new Date(Date.now() - days * 86_400_000)
    const category = req.query?.category || undefined
    const limit = Math.min(Math.max(parseInt(req.query?.limit) || 12, 1), 48)

    const products = await prisma.product.findMany({
      where: { ...(category ? { category } : {}) },
      select: {
        id: true, name: true, image_url: true, category: true, brand: true,
        price: true, sale_price: true, rating: true, reviews_count: true,
        views_count: true, stock: true,
      },
      take: 500,
    })
    if (products.length === 0) return { data: [] }

    const inScope = new Set(products.map(p => p.id))
    const sold = new Map<string, number>()

    const orders = await prisma.order.findMany({
      where: { payment_status: 'paid', created_at: { gte: since } },
      select: { items: true },
      orderBy: { created_at: 'desc' },
      take: 5000,
    })
    for (const order of orders) {
      for (const item of (order.items ?? []) as any[]) {
        const pid = item?.product_id
        if (!pid || !inScope.has(pid)) continue
        sold.set(pid, (sold.get(pid) ?? 0) + (Number(item.quantity) || 0))
      }
    }

    const ranked = products
      .map(p => ({ p, units: sold.get(p.id) ?? 0 }))
      // Something nobody has bought and nobody has looked at is not popular,
      // it is just present.
      .filter(r => r.units > 0 || (r.p.views_count ?? 0) > 0)
      .sort((a, b) => b.units - a.units || (b.p.views_count ?? 0) - (a.p.views_count ?? 0))
      .slice(0, limit)

    return {
      data: ranked.map((r, i) => ({
        rank: i + 1,
        id: r.p.id,
        name: r.p.name,
        image_url: r.p.image_url,
        category: r.p.category,
        brand: r.p.brand,
        price: r.p.sale_price ?? r.p.price,
        original_price: r.p.sale_price ? r.p.price : null,
        rating: r.p.rating,
        reviews_count: r.p.reviews_count,
        in_stock: (r.p.stock ?? 0) > 0,
      })),
      range_days: days,
    }
  })

  app.get('/shop', { preHandler: [requireShopAccess] }, async (req: any) => {
    const user = req.user as any
    const isAdmin = user.role === 'admin'

    const days = Math.min(Math.max(parseInt(req.query?.days) || 30, 1), 365)
    const since = new Date(Date.now() - days * 86_400_000)
    const category = req.query?.category || undefined

    // A provider only ever sees their own catalogue.
    const productWhere: any = {
      ...(isAdmin ? {} : { provider_email: user.email }),
      ...(category ? { category } : {}),
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true, name: true, image_url: true, category: true, price: true,
        sale_price: true, stock: true, rating: true, views_count: true,
        provider_email: true, is_featured: true, created_at: true,
      },
    })
    if (products.length === 0) {
      return {
        data: {
          range_days: days,
          totals: { revenue: 0, units: 0, orders: 0, views: 0, products: 0 },
          products: [], by_category: [], daily: [], low_stock: [], never_viewed: [],
        },
      }
    }

    const byId = new Map(products.map(p => [p.id, p]))
    const mine = new Set(products.map(p => p.id))

    // Only paid orders count as sales. A pending basket is not revenue.
    const orders = await prisma.order.findMany({
      where: { payment_status: 'paid', created_at: { gte: since } },
      select: { id: true, items: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5000,
    })

    const agg = new Map<string, { units: number; revenue: number; orders: Set<string> }>()
    const daily = new Map<string, { revenue: number; units: number }>()

    for (const order of orders) {
      const items = (order.items ?? []) as any[]
      const day = order.created_at.toISOString().slice(0, 10)
      for (const item of items) {
        const pid = item?.product_id
        // Skip lines for products outside this viewer's scope.
        if (!pid || !mine.has(pid)) continue
        const qty = Number(item.quantity) || 0
        const line = (Number(item.price) || 0) * qty

        const a = agg.get(pid) ?? { units: 0, revenue: 0, orders: new Set<string>() }
        a.units += qty
        a.revenue += line
        a.orders.add(order.id)
        agg.set(pid, a)

        const d = daily.get(day) ?? { revenue: 0, units: 0 }
        d.revenue += line
        d.units += qty
        daily.set(day, d)
      }
    }

    const rows: Row[] = products.map(p => {
      const a = agg.get(p.id)
      return {
        product_id: p.id,
        name: p.name,
        image_url: p.image_url,
        category: p.category,
        price: p.sale_price ?? p.price,
        units: a?.units ?? 0,
        revenue: Math.round((a?.revenue ?? 0) * 100) / 100,
        views: p.views_count ?? 0,
        orders: a?.orders.size ?? 0,
        stock: p.stock ?? 0,
        rating: p.rating ?? 0,
        provider_email: p.provider_email,
      }
    })

    const totals = rows.reduce((acc, r) => ({
      revenue: acc.revenue + r.revenue,
      units: acc.units + r.units,
      orders: acc.orders + r.orders,
      views: acc.views + r.views,
    }), { revenue: 0, units: 0, orders: 0, views: 0 })

    const byCategory = new Map<string, { revenue: number; units: number; views: number; products: number }>()
    for (const r of rows) {
      const key = r.category || 'other'
      const c = byCategory.get(key) ?? { revenue: 0, units: 0, views: 0, products: 0 }
      c.revenue += r.revenue; c.units += r.units; c.views += r.views; c.products += 1
      byCategory.set(key, c)
    }

    // Every day in the window, so a chart does not skip quiet days.
    const dailySeries: { day: string; revenue: number; units: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
      const v = daily.get(d)
      dailySeries.push({ day: d, revenue: Math.round((v?.revenue ?? 0) * 100) / 100, units: v?.units ?? 0 })
    }

    return {
      data: {
        range_days: days,
        scope: isAdmin ? 'platform' : 'provider',
        totals: {
          ...totals,
          revenue: Math.round(totals.revenue * 100) / 100,
          products: rows.length,
        },
        // The page sorts and filters; sending it once avoids a request per tab.
        products: rows,
        by_category: [...byCategory.entries()]
          .map(([category, v]) => ({ category, ...v, revenue: Math.round(v.revenue * 100) / 100 }))
          .sort((a, b) => b.revenue - a.revenue),
        daily: dailySeries,
        // Two lists worth surfacing on their own: what is about to run out,
        // and what nobody has even opened.
        low_stock: rows.filter(r => r.stock > 0 && r.stock <= 5)
          .sort((a, b) => a.stock - b.stock).slice(0, 20),
        never_viewed: rows.filter(r => r.views === 0)
          .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20),
      },
    }
  })

  /** Distinct categories in scope, for the filter. */
  app.get('/shop/categories', { preHandler: [requireShopAccess] }, async (req: any) => {
    const user = req.user as any
    const rows = await prisma.product.groupBy({
      by: ['category'],
      where: user.role === 'admin' ? {} : { provider_email: user.email },
      _count: { _all: true },
    })
    return {
      data: rows
        .filter(r => r.category)
        .map(r => ({ category: r.category as string, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
    }
  })
}

export default insightsRoutes
