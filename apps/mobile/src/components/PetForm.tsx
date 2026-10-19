import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react-native'
import { Input } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Πεδία κατοικιδίου — κοινά σε προσθήκη και επεξεργασία.
 *
 * Ίδια πεδία με το web (AddPetModal.tsx), που χρησιμοποιεί την ίδια φόρμα
 * και για τα δύο: φωτογραφία, όνομα, είδος, ράτσα, χρώμα, ηλικία, βάρος,
 * φύλο, στείρωση (τρεις επιλογές) και microchip. Πριν, η προσθήκη στο
 * κινητό δεν είχε φωτογραφία/βάρος/χρώμα/microchip, και η επεξεργασία δεν
 * είχε είδος/ηλικία/φύλο/στείρωση/φωτογραφία.
 */
export const PET_SPECIES = [
  { id: 'dog',     labelKey: 'pets.kind_dog',     emoji: '🐶' },
  { id: 'cat',     labelKey: 'pets.kind_cat',     emoji: '🐱' },
  { id: 'bird',    labelKey: 'pets.kind_bird',    emoji: '🦜' },
  { id: 'rabbit',  labelKey: 'pets.kind_rabbit',  emoji: '🐰' },
  { id: 'fish',    labelKey: 'pets.kind_fish',    emoji: '🐠' },
  { id: 'reptile', labelKey: 'pets.kind_reptile', emoji: '🦎' },
  { id: 'horse',   labelKey: 'pets.kind_horse',   emoji: '🐴' },
  { id: 'other',   labelKey: 'pets.kind_other',   emoji: '🐾' },
]

export const petEmoji = (species?: string) =>
  PET_SPECIES.find(x => x.id === species)?.emoji ?? '🐾'

type Sterilized = '' | 'yes' | 'no'

export type PetFormState = {
  name: string; species: string; breed: string; color: string
  age: string; weight: string; gender: string
  is_sterilized: Sterilized; microchip_number: string; image_url: string
}

export const EMPTY_PET_FORM: PetFormState = {
  name: '', species: 'dog', breed: '', color: '', age: '', weight: '',
  gender: 'male', is_sterilized: '', microchip_number: '', image_url: '',
}

/** Από το κατοικίδιο του server στη φόρμα (επεξεργασία). */
export function petToForm(pet: any): PetFormState {
  return {
    name: pet?.name ?? '',
    species: pet?.species || 'dog',
    breed: pet?.breed ?? '',
    color: pet?.color ?? '',
    age: pet?.age != null ? String(pet.age) : '',
    weight: pet?.weight != null ? String(pet.weight) : '',
    gender: pet?.gender || 'male',
    is_sterilized: pet?.is_sterilized === true ? 'yes' : pet?.is_sterilized === false ? 'no' : '',
    microchip_number: pet?.microchip_number ?? '',
    image_url: pet?.image_url ?? '',
  }
}

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return v.trim() && Number.isFinite(n) ? n : null
}

/**
 * Σώμα για POST/PATCH /pets — ίδιο με το web. Τα κενά στέλνονται ως null,
 * ώστε στην επεξεργασία να μπορεί κανείς να σβήσει ράτσα/χρώμα/microchip
 * (με undefined ο server κρατούσε την παλιά τιμή).
 */
export function petPayload(f: PetFormState) {
  return {
    name: f.name.trim(),
    species: f.species,
    breed: f.breed.trim() || null,
    age: num(f.age),
    weight: num(f.weight),
    gender: f.gender,
    color: f.color.trim() || null,
    microchip_number: f.microchip_number.trim() || null,
    image_url: f.image_url || null,
    is_sterilized: f.is_sterilized === 'yes' ? true : f.is_sterilized === 'no' ? false : null,
  }
}

export function PetFormFields({ form, onChange }: {
  form: PetFormState
  /**
   * Δέχεται και updater, όπως το setState. Το ανέβασμα φωτογραφίας τελειώνει
   * δευτερόλεπτα αργότερα: με `{ ...form }` θα έγραφε πάνω σε ό,τι πληκτρολόγησε
   * ο χρήστης στο μεταξύ.
   */
  onChange: (next: PetFormState | ((prev: PetFormState) => PetFormState)) => void
}) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const set = <K extends keyof PetFormState>(k: K, v: PetFormState[K]) => onChange(f => ({ ...f, [k]: v }))

  const pickPhoto = async () => {
    setUploading(true)
    try {
      const url = await pickAndUploadImage('pets')
      if (url) onChange(f => ({ ...f, image_url: url }))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission'
        ? t('providerEdit.photoPermission')
        : e?.response?.data?.message || t('providerEdit.errUpload'))
    } finally { setUploading(false) }
  }

  return (
    <View>
      <TouchableOpacity activeOpacity={0.8} style={s.photo} onPress={pickPhoto} disabled={uploading}>
        {form.image_url
          ? <Image source={{ uri: form.image_url }} style={s.photoImg} />
          : <Camera size={icon.lg} color={colors.textLight} />}
      </TouchableOpacity>
      <Text style={s.photoLabel}>
        {uploading ? t('providerEdit.uploading')
          : form.image_url ? t('providerEdit.changePhoto') : t('providerEdit.addPhoto')}
      </Text>

      <Input label={t('pets.name_label')} value={form.name} onChangeText={v => set('name', v)}
        placeholder={t('pets.name_placeholder')} />

      <Chips label={t('pets.species')} value={form.species} onChange={v => set('species', v)}
        options={PET_SPECIES.map(sp => ({ value: sp.id, label: `${sp.emoji} ${t(sp.labelKey)}` }))} />

      <Input label={t('pets.breed')} value={form.breed} onChangeText={v => set('breed', v)}
        placeholder={t('pets.breed_placeholder')} />
      <Input label={t('pets.color')} value={form.color} onChangeText={v => set('color', v)}
        placeholder={t('pets.color_placeholder')} />

      <View style={s.row}>
        <Input label={t('pets.age')} value={form.age} keyboardType="decimal-pad"
          onChangeText={v => set('age', v)} placeholder={t('pets.age_placeholder')} style={{ flex: 1 }} />
        <Input label={t('pets.weight')} value={form.weight} keyboardType="decimal-pad"
          onChangeText={v => set('weight', v)} style={{ flex: 1 }} />
      </View>

      <Chips label={t('pets.gender')} value={form.gender} onChange={v => set('gender', v)}
        options={[{ value: 'male', label: t('pets.male') }, { value: 'female', label: t('pets.female') }]} />

      {/* Τρεις επιλογές, όχι checkbox: «δεν γνωρίζω» είναι πραγματική
          απάντηση, και το κενό δεν πρέπει να καταγράφεται ως «όχι». */}
      <Chips<Sterilized> label={t('pets.neutered')} value={form.is_sterilized}
        onChange={v => set('is_sterilized', v)}
        options={[
          { value: 'yes', label: t('common.yes') },
          { value: 'no', label: t('common.no') },
          { value: '', label: t('pets.unknown') },
        ]} />

      <Input label={t('pets.microchip')} value={form.microchip_number}
        onChangeText={v => set('microchip_number', v)} placeholder={t('pets.microchip_placeholder')}
        style={{ marginBottom: 0 }} />
    </View>
  )
}

const s = StyleSheet.create({
  photo: {
    width: 96, height: 96, borderRadius: radius.lg, alignSelf: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoLabel: {
    ...type.caption, color: colors.brand, fontWeight: weight.semibold,
    textAlign: 'center', marginTop: space.sm, marginBottom: space.lg,
  },
  row: { flexDirection: 'row', gap: space.md },
})
