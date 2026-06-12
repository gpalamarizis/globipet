import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

export default function CartScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: cart = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const updateQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      qty <= 0 ? api.delete(`/cart/${id}`) : api.patch(`/cart/${id}`, { quantity: qty }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  const total = cart.reduce((s: number, i: any) => s + i.product_price * i.quantity, 0)

  if (!isAuthenticated) return (
    <View style={styles.centered}>
      <Text style={styles.lockEmoji}>🔒</Text>
      <Text style={styles.guestTitle}>Συνδεθείτε για πρόσβαση στο καλάθι</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.loginBtnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  if (isLoading) return (
    <View style={styles.centered}><ActivityIndicator color="#E65100" size="large"/></View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Καλάθι ({cart.length})</Text>
      </View>

      {cart.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Το καλάθι σας είναι άδειο</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/marketplace')}>
            <Text style={styles.browseBtnText}>Δείτε προϊόντα</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.list}>
            {cart.map((item: any) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.itemImage}>
                  {item.product_image
                    ? <Image source={{ uri: item.product_image }} style={styles.image}/>
                    : <Text style={styles.imagePlaceholder}>📦</Text>
                  }
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                  <Text style={styles.itemPrice}>€{item.product_price.toFixed(2)}</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity style={styles.qtyBtn}
                    onPress={() => updateQty.mutate({ id: item.id, qty: item.quantity - 1 })}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn}
                    onPress={() => updateQty.mutate({ id: item.id, qty: item.quantity + 1 })}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 120 }}/>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Σύνολο</Text>
              <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
              <Text style={styles.checkoutBtnText}>Ολοκλήρωση αγοράς →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  itemImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
  image: { width: 60, height: 60 },
  imagePlaceholder: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#E65100' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: '#374151', fontWeight: '600' },
  qty: { fontSize: 15, fontWeight: '700', color: '#111827', minWidth: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  totalLabel: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#111827' },
  checkoutBtn: { backgroundColor: '#E65100', borderRadius: 14, padding: 16, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockEmoji: { fontSize: 48, marginBottom: 16 },
  guestTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginBottom: 20 },
  browseBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
