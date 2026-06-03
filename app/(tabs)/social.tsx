import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../src/lib/api'

export default function SocialScreen() {
  const { t, i18n } = useTranslation()
  const localeMap: Record<string, string> = { el: 'el-GR', en: 'en-US', es: 'es-ES' }

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.get('/posts?limit=20').then(r => r.data?.data ?? []),
  })
  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>{t('social.title')}</Text></View>
      <FlatList data={posts} keyExtractor={i=>i.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{padding:16}}
        renderItem={({item}: any) => (
          <View style={s.post}>
            <View style={s.row}>
              <View style={s.avatar}><Text style={s.avatarText}>{item.author_name?.[0]||'U'}</Text></View>
              <View>
                <Text style={s.author}>{item.author_name}</Text>
                <Text style={s.time}>{new Date(item.created_at).toLocaleDateString(localeMap[i18n.language] || 'el-GR')}</Text>
              </View>
            </View>
            <Text style={s.content}>{item.content}</Text>
            <View style={s.actions}>
              <TouchableOpacity style={s.action}><Text>❤️ {item.likes_count||0}</Text></TouchableOpacity>
              <TouchableOpacity style={s.action}><Text>💬 {item.comments_count||0}</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>{t('social.no_posts')}</Text>} />
    </View>
  )
}
const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F9FAFB'},
  header:{backgroundColor:'#fff',paddingTop:60,paddingHorizontal:16,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'#F3F4F6'},
  title:{fontSize:24,fontWeight:'800',color:'#111827'},
  post:{backgroundColor:'#fff',borderRadius:16,padding:16,marginBottom:12,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  row:{flexDirection:'row',alignItems:'center',marginBottom:12},
  avatar:{width:40,height:40,borderRadius:20,backgroundColor:'#FFF7ED',alignItems:'center',justifyContent:'center',marginRight:10},
  avatarText:{fontSize:16,fontWeight:'700',color:'#E65100'},
  author:{fontSize:14,fontWeight:'700',color:'#111827'},
  time:{fontSize:12,color:'#9CA3AF'},
  content:{fontSize:14,color:'#374151',lineHeight:21,marginBottom:10},
  actions:{flexDirection:'row',gap:16,paddingTop:10,borderTopWidth:1,borderTopColor:'#F3F4F6'},
  action:{flexDirection:'row',alignItems:'center',gap:4},
  empty:{textAlign:'center',color:'#9CA3AF',marginTop:40},
})
