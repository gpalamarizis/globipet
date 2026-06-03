import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Dimensions } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../src/lib/api'

const { width } = Dimensions.get('window')
const cats = ['all','food','toys','accessories','health','grooming']

export default function MarketplaceScreen() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const { data: products = [] } = useQuery({
    queryKey: ['products', cat, search],
    queryFn: () => api.get(`/products?limit=20${cat!=='all'?`&category=${cat}`:''}${search?`&search=${search}`:''}`).then(r => r.data?.data ?? []),
  })
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('marketplace.title')}</Text>
        <TextInput style={s.search} placeholder={t('marketplace.search')} value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
        <FlatList horizontal data={cats} keyExtractor={i=>i} showsHorizontalScrollIndicator={false} style={{marginTop:10}}
          renderItem={({item}) => (
            <TouchableOpacity style={[s.chip, cat===item && s.chipActive]} onPress={()=>setCat(item)}>
              <Text style={[s.chipText, cat===item && s.chipTextActive]}>{t(`marketplace.categories.${item}`)}</Text>
            </TouchableOpacity>
          )} />
      </View>
      <FlatList data={products} keyExtractor={i=>i.id} numColumns={2} contentContainerStyle={{padding:8}}
        renderItem={({item}: any) => (
          <TouchableOpacity style={s.card}>
            <View style={s.img}><Text style={{fontSize:36}}>📦</Text></View>
            <Text style={s.name} numberOfLines={2}>{item.name}</Text>
            <View style={s.footer}>
              <Text style={s.price}>€{item.price}</Text>
              <TouchableOpacity style={s.addBtn}><Text style={s.addBtnText}>+</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>{t('marketplace.no_products')}</Text>} />
    </View>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F9FAFB'},
  header:{backgroundColor:'#fff',paddingTop:60,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6'},
  title:{fontSize:24,fontWeight:'800',color:'#111827',marginBottom:12},
  search:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,padding:12,fontSize:14,color:'#111827'},
  chip:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:'#F3F4F6',marginRight:8},
  chipActive:{backgroundColor:'#E65100'},
  chipText:{fontSize:12,color:'#6B7280',fontWeight:'500'},
  chipTextActive:{color:'#fff',fontWeight:'700'},
  card:{width:(width-24)/2,backgroundColor:'#fff',borderRadius:16,margin:4,padding:12,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  img:{height:100,borderRadius:12,backgroundColor:'#F9FAFB',alignItems:'center',justifyContent:'center',marginBottom:8},
  name:{fontSize:13,fontWeight:'600',color:'#111827',marginBottom:8,lineHeight:18},
  footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  price:{fontSize:15,fontWeight:'800',color:'#E65100'},
  addBtn:{width:30,height:30,borderRadius:15,backgroundColor:'#E65100',alignItems:'center',justifyContent:'center'},
  addBtnText:{color:'#fff',fontSize:18,fontWeight:'700',lineHeight:22},
  empty:{textAlign:'center',color:'#9CA3AF',marginTop:40},
})
