import { useTranslation } from 'react-i18next'
import MarketInsightsView from '@/components/MarketInsightsView'

/**
 * Στατιστικά παρόχου.
 *
 * Πριν: διάβαζε `term`/`count` από το /insights/popular, που επιστρέφει
 * προϊόντα — όχι όρους αναζήτησης — και έδειχνε κενές γραμμές. Τώρα δείχνει
 * τα ίδια με την καρτέλα «Στατιστικά» του web dashboard (/insights/shop):
 * έσοδα, τεμάχια, προβολές, μετατροπή, απόθεμα, μόνο για τα δικά του προϊόντα.
 */
export default function ProviderInsights() {
  const { t } = useTranslation()
  return <MarketInsightsView title={t('providerTabs.insights')} />
}
