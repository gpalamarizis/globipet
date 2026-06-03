import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../src/lib/api'

const types = ['all','grooming','veterinary','walking','pet_sitting','training','boarding','pet_taxi']

export default function ServicesScreen() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const { data: services = [] } = useQuery({
    queryKey: ['services', type, search],
    queryFn: () => api.get(`/services?limit=20${type !== 'all' ? `&type=${type}` : ''}${search ? `&search=${search}` : ''}`).then(r => r.data?.data ?? []),
  })
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('services.title')}</Text>
        <TextInput style={s.search} placeholder={t('services.search')} value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
      </View>
      <FlatList horizontal data={types} keyExtractor={i=>i} showsHorizontalScrollIndicator={false}
        style={s.filters} contentContainerStyle={{ paddingHorizontal:16 }}
        renderItem={({item}) => (
          <TouchableOpacity style={[s.chip, type===item && s.chipActive]} onPress={() => setType(item)}>
            <Text style={[s.chipText, type===item && s.chipTextActive]}>{t(`services.types.${item}`)}</Text>
          </TouchableOpacity>
        )} />
      <FlatList data={services} keyExtractor={i=>i.id} contentContainerStyle={{ padding:16 }}
        renderItem={({item}: any) => (
          <View style={s.card}>
            <View style={s.avatar}><Text style={s.avatarText}>{item.name?.[0]||'🐾'}</Text></View>
            <View style={s.info}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.sub}>{item.type} · {item.duration_minutes} {t('services.minutes')}</Text>
              <Text style={s.rating}>⭐ {item.rating||'5.0'}</Text>
            </View>
            <View>
              <Text style={s.price}>€{item.price}</Text>
              <TouchableOpacity style={s.bookBtn}><Text style={s.bookBtnText}>{t('services.book')}</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>{t('services.no_services')}</Text>} />
    </View>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F9FAFB'},
  header:{backgroundColor:'#fff',paddingTop:60,paddingHorizontal:16,paddingBottom:12},
  title:{fontSize:24,fontWeight:'800',color:'#111827',marginBottom:12},
  search:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:12,fontSize:14,color:'#111827'},
  filters:{backgroundColor:'#fff',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6'},
  chip:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:'#F3F4F6',marginRight:8},
  chipActive:{backgroundColor:'#E65100'},
  chipText:{fontSize:13,color:'#6B7280',fontWeight:'500'},
  chipTextActive:{color:'#fff',fontWeight:'700'},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:16,padding:14,marginBottom:10,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  avatar:{width:48,height:48,borderRadius:24,backgroundColor:'#FFF7ED',alignItems:'center',justifyContent:'center',marginRight:12},
  avatarText:{fontSize:20,fontWeight:'700',color:'#E65100'},
  info:{flex:1},
  name:{fontSize:14,fontWeight:'700',color:'#111827'},
  sub:{fontSize:12,color:'#6B7280',marginTop:2},
  rating:{fontSize:12,color:'#6B7280'},
  price:{fontSize:15,fontWeight:'700',color:'#E65100',textAlign:'right'},
  bookBtn:{backgroundColor:'#E65100',borderRadius:8,paddingHorizontal:10,paddingVertical:6,marginTop:6},
  bookBtnText:{color:'#fff',fontSize:11,fontWeight:'700'},
  empty:{textAlign:'center',color:'#9CA3AF',marginTop:40},
})
