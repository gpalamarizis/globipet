import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../src/store/auth'
import { signInWithGoogle } from '../../src/lib/googleAuth'
import Svg, { Path } from 'react-native-svg'

function GoogleIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </Svg>
  )
}

export default function LoginScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { login, signInWithGoogleToken, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert(t('common.error'), t('auth.fill_credentials')); return }
    try {
      await login(email, password)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert(t('auth.login_error'), err.response?.data?.message || t('auth.wrong_credentials'))
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithGoogle()
      if (!result) {
        // User cancelled
        setGoogleLoading(false)
        return
      }

      await signInWithGoogleToken({
        idToken: result.idToken,
        accessToken: result.accessToken,
        user: {
          email: result.user.email,
          full_name: result.user.name,
          profile_photo: result.user.photo,
        },
      })
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Σφάλμα κατά τη σύνδεση με Google'
      Alert.alert(t('auth.login_error') || 'Σφάλμα', msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>🐾</Text>
        <Text style={s.title}>GlobiPet</Text>
        <Text style={s.subtitle}>{t('auth.subtitle_login')}</Text>

        <View style={s.form}>
          <TouchableOpacity
            style={[s.googleBtn, (isLoading || googleLoading) && {opacity:0.6}]}
            onPress={handleGoogleLogin}
            disabled={isLoading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#4285F4"/>
            ) : (
              <>
                <GoogleIcon/>
                <Text style={s.googleBtnText}>{t('auth.login_google') || 'Σύνδεση με Google'}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.dividerWrap}>
            <View style={s.divider}/>
            <Text style={s.dividerText}>{t('auth.or_with_email') || 'ή με email'}</Text>
            <View style={s.divider}/>
          </View>

          <TextInput style={s.input} placeholder={t('auth.email')} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
          <View style={s.passwordWrapper}>
            <TextInput
              style={s.passwordInput}
              placeholder={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={s.eyeButton} onPress={() => setShowPassword(!showPassword)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
            <Text style={s.forgot}>{t('auth.forgot_password')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, (isLoading || googleLoading)&&{opacity:0.6}]} onPress={handleLogin} disabled={isLoading || googleLoading}>
            <Text style={s.btnText}>{isLoading?t('auth.signing_in'):t('auth.login')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>{t('auth.no_account')}</Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={s.footerLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#FFF7ED'},
  inner:{alignItems:'center',padding:24,paddingTop:48,flexGrow:1},
  logo:{fontSize:48,marginBottom:6},
  title:{fontSize:28,fontWeight:'800',color:'#E65100',marginBottom:4},
  subtitle:{fontSize:14,color:'#6B7280',marginBottom:20},
  form:{width:'100%',backgroundColor:'#fff',borderRadius:20,padding:24,shadowColor:'#000',shadowOpacity:0.08,shadowRadius:16,elevation:4},
  googleBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:'#fff',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:14,marginBottom:14},
  googleBtnText:{fontSize:15,fontWeight:'600',color:'#374151'},
  dividerWrap:{flexDirection:'row',alignItems:'center',marginBottom:14},
  divider:{flex:1,height:1,backgroundColor:'#E5E7EB'},
  dividerText:{paddingHorizontal:12,fontSize:12,color:'#9CA3AF'},
  input:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:14,fontSize:15,marginBottom:12,color:'#111827'},
  passwordWrapper:{position:'relative',marginBottom:12},
  passwordInput:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:14,paddingRight:48,fontSize:15,color:'#111827'},
  eyeButton:{position:'absolute',right:14,top:0,bottom:0,justifyContent:'center'},
  forgot:{textAlign:'right',color:'#E65100',fontSize:13,marginBottom:16},
  btn:{backgroundColor:'#E65100',borderRadius:12,padding:16,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'700',fontSize:16},
  footer:{flexDirection:'row',marginTop:20},
  footerText:{color:'#6B7280',fontSize:14},
  footerLink:{color:'#E65100',fontWeight:'700',fontSize:14},
})
