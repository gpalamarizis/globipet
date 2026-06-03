import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, ScrollView } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'

const speciesEmoji: Record<string,string> = { dog:'🐶', cat:'🐱', bird:'🐦', rabbit:'🐰', fish:'🐟', reptile:'🦎', horse:'🐴', other:'🐾' }
const defaultForm = { name:'', species:'dog', breed:'', age:'', weight:'', gender:'male', color:'', microchip_number:'' }

export default function PetsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const addPet = useMutation({
    mutationFn: () => api.post('/pets', { ...form, age: form.age ? parseFloat(form.age) : null, weight: form.weight ? parseFloat(form.weight) : null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-pets'] }); setShowAdd(false); setForm(defaultForm); Alert.alert('✅', t('pets.added')) },
    onError: (err: any) => Alert.alert(t('common.error'), err.response?.data?.message || t('pets.add_error')),
  })

  const toggleLost = useMutation({
    mutationFn: ({ id, isLost }: any) => api.patch(`/pets/${id}`, { is_lost: isLost }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-pets'] }),
  })

  if (!isAuthenticated) return (
    <View style={s.center}>
      <Text style={s.bigEmoji}>🔒</Text>
      <Text style={s.emptyText}>{t('pets.auth_required')}</Text>
      <TouchableOpacity style={s.primaryBtn} onPress={()=>router.push('/auth/login')}>
        <Text style={s.primaryBtnText}>{t('auth.login')}</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('pets.title')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={()=>setShowAdd(true)}>
          <Text style={s.addBtnText}>{t('pets.add')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={pets} keyExtractor={i=>i.id} contentContainerStyle={{padding:16}}
        renderItem={({item}:any)=>(
          <View style={s.card}>
            <Text style={s.petEmoji}>{speciesEmoji[item.species]||'🐾'}</Text>
            <View style={s.petInfo}>
              <Text style={s.petName}>{item.name}</Text>
              <Text style={s.petDetail}>{item.breed||item.species}{item.age?` · ${item.age} ${t('pets.years')}`:''}</Text>
              {item.microchip_number ? <Text style={s.chipText}>📱 {item.microchip_number}</Text> : <Text style={s.noChip}>{t('pets.no_chip')}</Text>}
            </View>
            {item.is_lost && <View style={s.lostBadge}><Text style={s.lostBadgeText}>{t('pets.lost_badge')}</Text></View>}
            <TouchableOpacity onPress={()=>toggleLost.mutate({id:item.id,isLost:!item.is_lost})} style={[s.statusBtn,item.is_lost?s.foundBtn:s.lostBtn]}>
              <Text style={s.statusBtnText}>{item.is_lost?t('pets.mark_found'):t('pets.mark_lost')}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.bigEmoji}>🐾</Text>
            <Text style={s.emptyText}>{t('pets.no_pets')}</Text>
            <TouchableOpacity style={[s.primaryBtn,{marginTop:16}]} onPress={()=>setShowAdd(true)}>
              <Text style={s.primaryBtnText}>{t('pets.add_pet')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} contentContainerStyle={{padding:20,paddingBottom:80}}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('pets.new_pet')}</Text>
            <TouchableOpacity onPress={()=>setShowAdd(false)}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <Text style={s.label}>{t('pets.species')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
            {Object.entries(speciesEmoji).map(([k,e])=>(
              <TouchableOpacity key={k} onPress={()=>setForm(f=>({...f,species:k}))} style={[s.speciesChip,form.species===k&&s.speciesChipActive]}>
                <Text style={{fontSize:22}}>{e}</Text>
                <Text style={[s.speciesLabel,form.species===k&&s.speciesLabelActive]}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>{t('pets.name')}</Text>
          <TextInput style={s.input} placeholder={t('pets.name_placeholder')} value={form.name} onChangeText={v=>setForm(f=>({...f,name:v}))} />

          <Text style={s.label}>{t('pets.breed')}</Text>
          <TextInput style={s.input} placeholder={t('pets.breed_placeholder')} value={form.breed} onChangeText={v=>setForm(f=>({...f,breed:v}))} />

          <View style={{flexDirection:'row',gap:12}}>
            <View style={{flex:1}}>
              <Text style={s.label}>{t('pets.age')}</Text>
              <TextInput style={s.input} placeholder="3" keyboardType="numeric" value={form.age} onChangeText={v=>setForm(f=>({...f,age:v}))} />
            </View>
            <View style={{flex:1}}>
              <Text style={s.label}>{t('pets.weight')}</Text>
              <TextInput style={s.input} placeholder="5.5" keyboardType="numeric" value={form.weight} onChangeText={v=>setForm(f=>({...f,weight:v}))} />
            </View>
          </View>

          <Text style={s.label}>{t('pets.gender')}</Text>
          <View style={{flexDirection:'row',gap:10,marginBottom:14}}>
            {[['male',t('pets.male')],['female',t('pets.female')]].map(([v,l])=>(
              <TouchableOpacity key={v} onPress={()=>setForm(f=>({...f,gender:v}))} style={[s.genderBtn,form.gender===v&&s.genderBtnActive]}>
                <Text style={[s.genderLabel,form.gender===v&&s.genderLabelActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>{t('pets.color')}</Text>
          <TextInput style={s.input} placeholder={t('pets.color_placeholder')} value={form.color} onChangeText={v=>setForm(f=>({...f,color:v}))} />

          <Text style={s.label}>{t('pets.microchip')}</Text>
          <View style={s.chipRow}>
            <TextInput style={[s.input,{flex:1,marginBottom:0}]} placeholder={t('pets.microchip_placeholder')} keyboardType="numeric" maxLength={15}
              value={form.microchip_number} onChangeText={v=>setForm(f=>({...f,microchip_number:v}))} />
          </View>
          <Text style={{fontSize:11,color:'#9CA3AF',marginBottom:4,fontStyle:'italic'}}>{t('pets.microchip_note')}</Text>

          <TouchableOpacity onPress={()=>addPet.mutate()} disabled={!form.name||addPet.isPending}
            style={[s.primaryBtn,{marginTop:20},(!form.name||addPet.isPending)&&{opacity:0.5}]}>
            <Text style={s.primaryBtnText}>{addPet.isPending?t('pets.saving'):t('pets.save')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F9FAFB'},
  center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,paddingTop:60},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#fff',paddingTop:60,paddingHorizontal:16,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'#F3F4F6'},
  headerTitle:{fontSize:24,fontWeight:'800',color:'#111827'},
  addBtn:{backgroundColor:'#E65100',borderRadius:10,paddingHorizontal:14,paddingVertical:8},
  addBtnText:{color:'#fff',fontWeight:'700',fontSize:13},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:16,padding:14,marginBottom:10,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  petEmoji:{fontSize:36,marginRight:12},
  petInfo:{flex:1},
  petName:{fontSize:16,fontWeight:'700',color:'#111827'},
  petDetail:{fontSize:13,color:'#6B7280',marginTop:2},
  chipText:{fontSize:11,color:'#6B7280',marginTop:3},
  noChip:{fontSize:11,color:'#D1D5DB',marginTop:3},
  lostBadge:{backgroundColor:'#FEE2E2',paddingHorizontal:8,paddingVertical:3,borderRadius:8,marginRight:8},
  lostBadgeText:{fontSize:10,color:'#DC2626',fontWeight:'700'},
  statusBtn:{borderRadius:8,paddingHorizontal:10,paddingVertical:6},
  lostBtn:{backgroundColor:'#FEF3C7'},
  foundBtn:{backgroundColor:'#D1FAE5'},
  statusBtnText:{fontSize:12,fontWeight:'600',color:'#374151'},
  bigEmoji:{fontSize:64,marginBottom:16},
  emptyText:{fontSize:16,color:'#6B7280',marginBottom:8},
  primaryBtn:{backgroundColor:'#E65100',borderRadius:12,paddingHorizontal:24,paddingVertical:14,alignItems:'center'},
  primaryBtnText:{color:'#fff',fontWeight:'700',fontSize:15},
  modal:{flex:1,backgroundColor:'#fff'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:22,fontWeight:'800',color:'#111827'},
  closeBtn:{fontSize:18,color:'#9CA3AF'},
  label:{fontSize:13,fontWeight:'600',color:'#374151',marginBottom:6},
  input:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:13,fontSize:15,marginBottom:14,color:'#111827'},
  speciesChip:{alignItems:'center',padding:10,marginRight:8,borderRadius:12,borderWidth:1.5,borderColor:'#E5E7EB',minWidth:68},
  speciesChipActive:{borderColor:'#E65100',backgroundColor:'#FFF7ED'},
  speciesLabel:{fontSize:10,color:'#9CA3AF',marginTop:4},
  speciesLabelActive:{color:'#E65100',fontWeight:'600'},
  genderBtn:{flex:1,padding:13,borderRadius:12,borderWidth:1.5,borderColor:'#E5E7EB',alignItems:'center'},
  genderBtnActive:{borderColor:'#E65100',backgroundColor:'#FFF7ED'},
  genderLabel:{fontSize:14,fontWeight:'500',color:'#6B7280'},
  genderLabelActive:{color:'#E65100',fontWeight:'700'},
  chipRow:{flexDirection:'row',gap:10,marginBottom:6},
})
