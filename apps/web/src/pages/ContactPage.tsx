import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/contact', { name, email, subject, message })
      toast.success(t('contact.success'))
      setName(''); setEmail(''); setSubject(''); setMessage('')
    } catch {
      toast.error(t('contact.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <MessageSquare size={48} className="mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t('contact.title')}</h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">{t('contact.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-3">
                <Mail size={20} className="text-brand-900 dark:text-yellow-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('contact.email')}</h3>
              <a href="mailto:info@globipet.com" className="text-sm text-brand-900 dark:text-yellow-400 hover:underline">info@globipet.com</a>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3">
                <Phone size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('contact.phone')}</h3>
              <a href="tel:+302100000000" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+30 210 000 0000</a>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-3">
                <MapPin size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('contact.address')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Αθήνα, Ελλάδα</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4">{t('contact.formTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.name')}</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="input" placeholder={t('contact.namePlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.emailLabel')}</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="input" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.subject')}</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                  className="input" placeholder={t('contact.subjectPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.message')}</label>
                <textarea required rows={6} value={message} onChange={e => setMessage(e.target.value)}
                  className="input resize-none" placeholder={t('contact.messagePlaceholder')} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                {submitting ? t('contact.sending') : (<><Send size={16} /> {t('contact.send')}</>)}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
