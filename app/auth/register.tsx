import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../src/store/auth'

export default function RegisterScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({ full_name:'', email:'', password:'', role:'user' })

  const handleRegister = async () => {
    if (!form.full_name||!form.email||!form.password) { Alert.alert(t('common.error'), t('auth.fill_all_fields')); return }
    if (form.password.length < 8) { Alert.alert(t('common.error'), t('auth.password_min_error')); return }
    try {
      await register(form)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('auth.register_error'))
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={s.inner}>
        <Text style={s.logo}>🐾</Text>
        <Text style={s.title}>{t('auth.register')}</Text>
        <View style={s.form}>
          <TextInput style={s.input} placeholder={t('auth.full_name')} value={form.full_name}
            onChangeText={v=>setForm(f=>({...f,full_name:v}))} placeholderTextColor="#9CA3AF" />
          <TextInput style={s.input} placeholder={t('auth.email')} value={form.email}
            onChangeText={v=>setForm(f=>({...f,email:v}))} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
          <TextInput style={s.input} placeholder={t('auth.password_min')} value={form.password}
            onChangeText={v=>setForm(f=>({...f,password:v}))} secureTextEntry placeholderTextColor="#9CA3AF" />
          <Text style={s.roleLabel}>{t('auth.account_type')}</Text>
          <View style={s.roleRow}>
            {[{v:'user',l:t('auth.user_owner')},{v:'service_provider',l:t('auth.service_provider_short')}].map(r => (
              <TouchableOpacity key={r.v} style={[s.roleBtn, form.role===r.v&&s.roleBtnActive]} onPress={()=>setForm(f=>({...f,role:r.v}))}>
                <Text style={[s.roleBtnText, form.role===r.v&&s.roleBtnTextActive]}>{r.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.btn, isLoading&&{opacity:0.6}]} onPress={handleRegister} disabled={isLoading}>
            <Text style={s.btnText}>{isLoading?t('auth.registering'):t('auth.create_account')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.footer}>
          <Text style={s.footerText}>{t('auth.have_account')}</Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={s.footerLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#FFF7ED'},
  inner:{alignItems:'center',padding:24,paddingTop:60,flexGrow:1},
  logo:{fontSize:48,marginBottom:8},
  title:{fontSize:28,fontWeight:'800',color:'#E65100',marginBottom:20},
  form:{width:'100%',backgroundColor:'#fff',borderRadius:20,padding:24},
  input:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:14,fontSize:15,marginBottom:12,color:'#111827'},
  roleLabel:{fontSize:13,fontWeight:'600',color:'#374151',marginBottom:8},
  roleRow:{flexDirection:'row',gap:10,marginBottom:16},
  roleBtn:{flex:1,padding:12,borderRadius:12,borderWidth:1.5,borderColor:'#E5E7EB',alignItems:'center'},
  roleBtnActive:{borderColor:'#E65100',backgroundColor:'#FFF7ED'},
  roleBtnText:{fontSize:13,color:'#6B7280',fontWeight:'500'},
  roleBtnTextActive:{color:'#E65100',fontWeight:'700'},
  btn:{backgroundColor:'#E65100',borderRadius:12,padding:16,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'700',fontSize:16},
  footer:{flexDirection:'row',marginTop:24},
  footerText:{color:'#6B7280',fontSize:14},
  footerLink:{color:'#E65100',fontWeight:'700',fontSize:14},
})
