import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { api } from '../../src/lib/api'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) { Alert.alert(t('common.error'), t('auth.email_required')); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch { Alert.alert(t('common.error'), t('auth.try_again')) }
    finally { setLoading(false) }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
      <View style={s.inner}>
        <Text style={s.logo}>🔐</Text>
        <Text style={s.title}>{t('auth.reset_password')}</Text>
        {sent ? (
          <View style={s.success}>
            <Text style={s.successText}>{t('auth.email_sent')}</Text>
            <TouchableOpacity style={s.btn} onPress={() => router.back()}>
              <Text style={s.btnText}>{t('auth.back_to_login')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
            <Text style={s.desc}>{t('auth.reset_desc')}</Text>
            <TextInput style={s.input} placeholder={t('auth.email')} value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            <TouchableOpacity style={[s.btn, loading&&{opacity:0.6}]} onPress={handleSubmit} disabled={loading}>
              <Text style={s.btnText}>{loading?t('auth.sending'):t('auth.send')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{marginTop:16,alignItems:'center'}}>
              <Text style={{color:'#E65100'}}>{t('auth.back_arrow')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#FFF7ED'},
  inner:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  logo:{fontSize:56,marginBottom:12},
  title:{fontSize:24,fontWeight:'800',color:'#111827',marginBottom:20},
  form:{width:'100%',backgroundColor:'#fff',borderRadius:20,padding:24},
  desc:{fontSize:14,color:'#6B7280',marginBottom:16,lineHeight:22},
  input:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:14,fontSize:15,marginBottom:16,color:'#111827'},
  btn:{backgroundColor:'#E65100',borderRadius:12,padding:16,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'700',fontSize:15},
  success:{width:'100%',alignItems:'center',gap:20},
  successText:{fontSize:16,color:'#111827',textAlign:'center',lineHeight:24},
})
