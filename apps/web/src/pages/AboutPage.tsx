import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Linkedin, Globe, Heart, Shield, Brain, Stethoscope, Scale, MapPin, ShoppingBag, Users } from 'lucide-react'

const FOUNDERS = [
  {
    name: 'George Palamarizis',
    role: 'CEO & Co-Founder',
    linkedin: 'https://www.linkedin.com/in/gpalamarizis/',
    photo: 'https://media.licdn.com/dms/image/v2/D4D03AQGXq0qQ_7BXPQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1698656749779?e=1756339200&v=beta&t=5K-R_G_G2K_R_G_G2K',
    bio: 'Μηχανολόγος Μηχανικός ΕΜΠ με 20+ χρόνια εμπειρία σε ψηφιακή διακυβέρνηση και τεχνολογία. Πρώην CIO Ελληνικής Κυβέρνησης.',
  },
  {
    name: 'Meropi Topalidou',
    role: 'COO & Co-Founder',
    linkedin: 'https://www.linkedin.com/in/meropi-topalidou/',
    photo: 'https://media.licdn.com/dms/image/v2/D4D03AQH',
    bio: 'Ειδικός σε επιχειρηματική ανάπτυξη και διαχείριση λειτουργιών. Εμπειρία σε startups και scale-ups στην Ευρώπη.',
  },
  {
    name: 'Vasilis Rallis',
    role: 'CTO & Co-Founder',
    linkedin: 'https://www.linkedin.com/in/vasilis-rallis/',
    photo: 'https://media.licdn.com/dms/image/v2/D4D03AQH',
    bio: 'Full-stack developer και αρχιτέκτονας συστημάτων. Εξειδίκευση σε AI, mobile applications και cloud infrastructure.',
  },
]

const SERVICES = [
  { icon: Stethoscope, title: 'Τηλεϊατρική', desc: 'Βιντεοκλήση με εξειδικευμένο κτηνίατρο οποιαδήποτε στιγμή. Άμεση πρόσβαση σε επαγγελματική φροντίδα χωρίς αναμονή.', color: 'bg-blue-50 text-blue-600', img: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&q=80' },
  { icon: Brain, title: 'AI Υγεία', desc: 'Ανάλυση φωτογραφιών δέρματος, ματιών και περιττωμάτων με τεχνητή νοημοσύνη. Έγκαιρη ανίχνευση προβλημάτων υγείας.', color: 'bg-purple-50 text-purple-600', img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80' },
  { icon: Shield, title: 'Ιατρικός Φάκελος', desc: 'Πλήρες ψηφιακό ιστορικό υγείας — εμβόλια, εξετάσεις, φάρμακα, χειρουργεία. Διαθέσιμο οποτεδήποτε, παντού.', color: 'bg-orange-50 text-orange-600', img: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&q=80' },
  { icon: Globe, title: 'Υπηρεσίες', desc: 'Grooming, εκπαίδευση, βόλτες, φιλοξενία, pet taxi — χιλιάδες επαληθευμένοι πάροχοι σε όλη την Ελλάδα.', color: 'bg-green-50 text-green-600', img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80' },
  { icon: Scale, title: 'Νομική Υποστήριξη', desc: 'AI νομικός σύμβουλος για θέματα κατοικιδίων βασισμένος στην ελληνική νομοθεσία (Ν.4830/2021). Σύνδεση με εξειδικευμένους δικηγόρους.', color: 'bg-indigo-50 text-indigo-600', img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80' },
  { icon: ShoppingBag, title: 'Marketplace', desc: 'Ηλεκτρονικό κατάστημα με τροφές, παιχνίδια, αξεσουάρ και φάρμακα. Γρήγορη παράδοση σε ολόκληρη την Ελλάδα.', color: 'bg-pink-50 text-pink-600', img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80' },
  { icon: MapPin, title: 'GPS Tracker', desc: 'Ζωντανή παρακολούθηση τοποθεσίας κατοικιδίου. Σύνδεση με δημοφιλείς trackers όπως Tractive και Weenect.', color: 'bg-red-50 text-red-600', img: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&q=80' },
  { icon: Heart, title: 'Ασφάλιση', desc: 'Ολοκληρωμένα πλάνα ασφάλισης κατοικιδίων. Κάλυψη κτηνιατρικών εξόδων, χειρουργείων και επειγόντων.', color: 'bg-teal-50 text-teal-600', img: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&q=80' },
  { icon: Users, title: 'Κοινότητα', desc: 'Playdates, κοινότητες ιδιοκτητών, social feed και events. Συνδέσου με χιλιάδες φιλόζωους σε ολόκληρη την Ελλάδα.', color: 'bg-yellow-50 text-yellow-600', img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80' },
]

function FounderCard({ founder }: { founder: typeof FOUNDERS[0] }) {
  const [imgError, setImgError] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="card p-6 text-center">
      <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 bg-gray-100">
        {!imgError
          ? <img src={founder.photo} alt={founder.name} className="w-full h-full object-cover"
              onError={() => setImgError(true)} />
          : <div className="w-full h-full flex items-center justify-center bg-brand-50">
              <span className="text-3xl font-bold text-brand-900">{founder.name[0]}</span>
            </div>}
      </div>
      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{founder.name}</h3>
      <p className="text-sm text-brand-900 font-medium mb-2">{founder.role}</p>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{founder.bio}</p>
      <a href={founder.linkedin} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
        <Linkedin size={16} /> LinkedIn
      </a>
    </motion.div>
  )
}

export default function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Hero */}
      <section className="bg-[#0F2A3F] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <img src="/logo-clean.png" alt="GlobiPet" className="h-16 w-auto mx-auto mb-6 brightness-0 invert" />
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">
              Ποιοί Είμαστε
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              Το GlobiPet είναι το πρώτο ολοκληρωμένο Pet Super-App στην Ευρώπη — 
              μία πλατφόρμα για όλες τις ανάγκες του κατοικιδίου σας και του ιδιοκτήτη του.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Η Αποστολή μας</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-center">
              {[
                { emoji: '🐾', title: 'Για τα κατοικίδια', text: 'Καλύτερη υγεία, φροντίδα και ποιότητα ζωής για κάθε ζώο συντροφιάς.' },
                { emoji: '👥', title: 'Για τους ιδιοκτήτες', text: 'Λιγότερη αναζήτηση, λιγότερο άγχος, περισσότερος χρόνος για τους αγαπημένους σας.' },
                { emoji: '🏥', title: 'Για τους παρόχους', text: 'Ψηφιακά εργαλεία, νέους πελάτες και αυξημένο εισόδημα για κάθε επαγγελματία.' },
              ].map(item => (
                <div key={item.title} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <span className="text-4xl mb-3 block">{item.emoji}</span>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Founders */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Οι Ιδρυτές</h2>
          <p className="text-gray-500 text-center mb-10">Η ομάδα πίσω από το GlobiPet</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FOUNDERS.map(f => <FounderCard key={f.name} founder={f} />)}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Οι Υπηρεσίες μας</h2>
          <p className="text-gray-500 text-center mb-10">Ένα πλήρες οικοσύστημα για κατοικίδια και ιδιοκτήτες</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(service => (
              <motion.div key={service.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="card overflow-hidden">
                <div className="h-40 overflow-hidden">
                  <img src={service.img} alt={service.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${service.color} flex items-center justify-center mb-3`}>
                    <service.icon size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{service.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-[#0F2A3F] text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center">GlobiPet σε αριθμούς</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { value: '50K+', label: 'Χρήστες' },
              { value: '2K+', label: 'Πάροχοι' },
              { value: '120K+', label: 'Κατοικίδια' },
              { value: '4.9★', label: 'Βαθμολογία' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-4xl font-black text-brand-400 mb-1">{s.value}</p>
                <p className="text-white/60 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
