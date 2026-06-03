import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../src/store/auth'

export default function ProfileScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuthStore()

  if (!isAuthenticated) return (
    <View style={s.center}>
      <Text style={s.emoji}>🔒</Text>
      <Text style={s.guestTitle}>{t('profile.guest_title')}</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.push('/auth/login')}>
        <Text style={s.btnText}>{t('auth.login')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/auth/register')}>
        <Text style={s.outlineBtnText}>{t('auth.register')}</Text>
      </TouchableOpacity>
    </View>
  )

  const menu = [
    { emoji:'🐾', label: t('profile.menu.pets'), onPress: () => router.push('/pets') },
    { emoji:'📅', label: t('profile.menu.bookings'), onPress: () => {} },
    { emoji:'📦', label: t('profile.menu.orders'), onPress: () => {} },
    { emoji:'🗺️', label: t('profile.menu.tracker'), onPress: () => {} },
    { emoji:'🩺', label: t('profile.menu.telehealth'), onPress: () => {} },
    { emoji:'🌐', label: t('profile.menu.language'), onPress: () => router.push('/language') },
  ]

  const roleLabel = user?.role === 'service_provider' ? t('profile.provider') : user?.role === 'admin' ? t('profile.admin') : t('profile.owner')

  return (
    <ScrollView style={s.container}>
      <View style={s.profileHeader}>
        <View style={s.avatar}><Text style={s.avatarText}>{user?.full_name?.[0]||'U'}</Text></View>
        <Text style={s.name}>{user?.full_name}</Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{roleLabel}</Text>
        </View>
      </View>
      <View style={s.menu}>
        {menu.map((item, i) => (
          <TouchableOpacity key={i} style={s.menuItem} onPress={item.onPress}>
            <Text style={s.menuEmoji}>{item.emoji}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={s.logoutBtn} onPress={() =>
        Alert.alert(t('profile.logout_title'), t('common.logout_confirm'), [
          {text:t('common.cancel'),style:'cancel'},
          {text:t('auth.logout'),style:'destructive',onPress: async () => { await logout(); router.replace('/auth/login') }}
        ])}>
        <Text style={s.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
      <View style={{height:40}} />
    </ScrollView>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F9FAFB'},
  center:{flex:1,alignItems:'center',justifyContent:'center',padding:40,marginTop:80},
  emoji:{fontSize:64,marginBottom:16},
  guestTitle:{fontSize:18,fontWeight:'700',color:'#111827',marginBottom:24},
  btn:{backgroundColor:'#E65100',borderRadius:12,padding:16,width:'100%',alignItems:'center',marginBottom:12},
  btnText:{color:'#fff',fontWeight:'700',fontSize:16},
  outlineBtn:{borderWidth:1.5,borderColor:'#E65100',borderRadius:12,padding:16,width:'100%',alignItems:'center'},
  outlineBtnText:{color:'#E65100',fontWeight:'700',fontSize:16},
  profileHeader:{backgroundColor:'#fff',alignItems:'center',paddingTop:70,paddingBottom:28,borderBottomWidth:1,borderBottomColor:'#F3F4F6'},
  avatar:{width:80,height:80,borderRadius:40,backgroundColor:'#FFF7ED',alignItems:'center',justifyContent:'center',marginBottom:12},
  avatarText:{fontSize:32,fontWeight:'800',color:'#E65100'},
  name:{fontSize:20,fontWeight:'800',color:'#111827',marginBottom:4},
  email:{fontSize:14,color:'#6B7280',marginBottom:8},
  roleBadge:{backgroundColor:'#FFF7ED',paddingHorizontal:12,paddingVertical:4,borderRadius:20},
  roleText:{fontSize:13,color:'#E65100',fontWeight:'600'},
  menu:{backgroundColor:'#fff',marginTop:16,borderRadius:16,marginHorizontal:16},
  menuItem:{flexDirection:'row',alignItems:'center',padding:16,borderBottomWidth:1,borderBottomColor:'#F9FAFB'},
  menuEmoji:{fontSize:22,marginRight:12},
  menuLabel:{flex:1,fontSize:15,color:'#111827',fontWeight:'500'},
  menuArrow:{fontSize:20,color:'#D1D5DB'},
  logoutBtn:{margin:16,padding:16,backgroundColor:'#FEF2F2',borderRadius:16,alignItems:'center'},
  logoutText:{color:'#EF4444',fontWeight:'700',fontSize:15},
})
