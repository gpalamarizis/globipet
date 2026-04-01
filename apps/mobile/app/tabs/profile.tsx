import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()

  if (!isAuthenticated) return (
    <View style={styles.container}>
      <View style={styles.guestContainer}>
        <Text style={styles.guestEmoji}>🔒</Text>
        <Text style={styles.guestTitle}>Συνδεθείτε για πρόσβαση</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/auth/register')}>
          <Text style={styles.registerBtnText}>Εγγραφή</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const menuItems = [
    { emoji: '🐾', label: 'Τα κατοικίδιά μου', route: '/pets' },
    { emoji: '📅', label: 'Κρατήσεις', route: '/bookings' },
    { emoji: '📦', label: 'Παραγγελίες', route: '/orders' },
    { emoji: '❤️', label: 'Wishlist', route: '/wishlist' },
    { emoji: '🗺️', label: 'GPS Tracker', route: '/tracker' },
    { emoji: '🩺', label: 'Τηλεϊατρική', route: '/telehealth' },
    { emoji: '⚙️', label: 'Ρυθμίσεις', route: '/settings' },
  ]

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name?.[0] || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'service_provider' ? '🩺 Πάροχος' : user?.role === 'admin' ? '⚡ Admin' : '🐾 Ιδιοκτήτης'}
          </Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map(item => (
          <TouchableOpacity key={item.route} style={styles.menuItem}>
            <Text style={styles.menuEmoji}>{item.emoji}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn}
        onPress={() => Alert.alert('Αποσύνδεση', 'Σίγουρα θέλετε να αποσυνδεθείτε;', [
          { text: 'Ακύρωση', style: 'cancel' },
          { text: 'Αποσύνδεση', style: 'destructive', onPress: async () => { await logout(); router.replace('/auth/login') } }
        ])}>
        <Text style={styles.logoutText}>Αποσύνδεση</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 120 },
  guestEmoji: { fontSize: 64, marginBottom: 16 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24 },
  loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  registerBtn: { borderWidth: 1.5, borderColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  registerBtnText: { color: '#E65100', fontWeight: '700', fontSize: 16 },
  header: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 70, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#E65100' },
  name: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  roleBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  menu: { backgroundColor: '#fff', marginTop: 16, borderRadius: 16, marginHorizontal: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  menuEmoji: { fontSize: 22, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  menuArrow: { fontSize: 20, color: '#D1D5DB' },
  logoutBtn: { margin: 16, marginTop: 12, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16, alignItems: 'center' },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
})
