/**
 * Τίτλοι προσωπικού — ΙΔΙΕΣ τιμές με το web (ProviderStaffPage). Πριν, το
 * κινητό είχε ελεύθερο κείμενο, οπότε ό,τι γραφόταν από εδώ δεν ταίριαζε
 * με καμία επιλογή του web.
 */
export const STAFF_TITLE_KEYS: Record<string, string> = {
  dr: 'providerStaff.titles.dr',
  md: 'providerStaff.titles.md',
  dvm: 'providerStaff.titles.dvm',
  nurse: 'providerStaff.titles.nurse',
  tech: 'providerStaff.titles.tech',
  other: 'providerStaff.titles.other',
}

export const STAFF_TITLE_OPTIONS = [
  { value: '', key: 'providerStaff.titles.none' },
  ...Object.entries(STAFF_TITLE_KEYS).map(([value, key]) => ({ value, key })),
]
