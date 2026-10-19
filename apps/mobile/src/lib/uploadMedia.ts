import * as ImagePicker from 'expo-image-picker'
import i18n from '../../lib/i18n'
import { api } from './api'

/**
 * Επιλογή εικόνας ή βίντεο από τη συλλογή και ανέβασμα στο /upload.
 *
 * Ίδια όρια με τον server: εικόνα έως 5MB, βίντεο έως 25MB και μόνο MP4 ή
 * WebM. Ελέγχονται ΠΡΙΝ το ανέβασμα, ώστε ο πάροχος να μην περιμένει ένα
 * αρχείο 40MB για να μάθει στο τέλος ότι απορρίφθηκε.
 *
 * Επιστρέφει το δημόσιο URL, ή null αν ο χρήστης ακύρωσε. Τα σφάλματα
 * πετιούνται με μεταφρασμένο μήνυμα για να εμφανιστούν όπως είναι.
 */
const IMAGE_LIMIT = 5 * 1024 * 1024
const VIDEO_LIMIT = 25 * 1024 * 1024
const VIDEO_TYPES = ['video/mp4', 'video/webm']

const mb = (n: number) => (n / 1048576).toFixed(1)

export async function pickAndUploadMedia(folder: string, kind: 'image' | 'video'): Promise<string | null> {
  const t = i18n.t.bind(i18n)
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error(t('campaignUi.errPermission'))

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: [kind === 'video' ? 'videos' : 'images'],
    quality: 0.8,
  })
  if (picked.canceled || !picked.assets?.[0]) return null

  const a = picked.assets[0]
  const ext = (a.fileName || a.uri).split('.').pop()?.toLowerCase() || ''
  const mime = a.mimeType
    || (kind === 'video' ? (ext === 'webm' ? 'video/webm' : ext === 'mp4' ? 'video/mp4' : `video/${ext}`) : 'image/jpeg')

  if (kind === 'video') {
    if (!mime.startsWith('video/')) throw new Error(t('campaignUi.errNotVideo'))
    if (!VIDEO_TYPES.includes(mime)) throw new Error(t('campaignUi.errVideoFormat'))
    if (a.fileSize && a.fileSize > VIDEO_LIMIT) throw new Error(t('campaignUi.errVideoSize', { mb: mb(a.fileSize) }))
  } else {
    if (!mime.startsWith('image/')) throw new Error(t('campaignUi.errNotImage'))
    if (a.fileSize && a.fileSize > IMAGE_LIMIT) throw new Error(t('campaignUi.errImageSize', { mb: mb(a.fileSize) }))
  }

  const name = a.fileName || a.uri.split('/').pop() || (kind === 'video' ? 'clip.mp4' : 'photo.jpg')
  const form = new FormData()
  form.append('file', { uri: a.uri, type: mime, name } as any)
  const res = await api.post(`/upload?folder=${encodeURIComponent(folder)}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Ένα βίντεο 25MB σε κινητό δίκτυο θέλει χρόνο.
    timeout: kind === 'video' ? 180000 : 60000,
  })
  const url = res.data?.url || res.data?.file_url
  if (!url) throw new Error(t('campaignUi.errNoUrl'))
  return url
}
