import * as ImagePicker from 'expo-image-picker'
import { api } from './api'

/**
 * Επιλογή φωτογραφίας από τη συλλογή και ανέβασμα στο /upload.
 *
 * Επιστρέφει το δημόσιο URL, ή null αν ο χρήστης ακύρωσε. Σφάλματα
 * (άδεια, δίκτυο, μέγεθος > 5MB) πετιούνται με το μήνυμα του server, ώστε η
 * οθόνη να τα δείξει όπως είναι.
 *
 * `folder` πρέπει να είναι από τους επιτρεπόμενους του server (products,
 * services, campaigns, …) — αλλιώς ο server τα βάζει σιωπηλά στο uploads.
 */
export async function pickAndUploadImage(folder: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error('permission')

  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
  if (picked.canceled || !picked.assets?.[0]) return null

  const asset = picked.assets[0]
  const mime = asset.mimeType || 'image/jpeg'
  const name = asset.fileName || asset.uri.split('/').pop() || 'photo.jpg'

  const form = new FormData()
  form.append('file', { uri: asset.uri, type: mime, name } as any)
  const res = await api.post(`/upload?folder=${encodeURIComponent(folder)}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.url || res.data?.file_url || null
}
