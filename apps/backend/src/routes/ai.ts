import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'

const aiRoutes: FastifyPluginAsync = async (app) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Extract the final text block from a response that may include web_search tool blocks
  function extractFinalText(content: any[]): string {
    const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text)
    return textBlocks[textBlocks.length - 1] || ''
  }

  function parseJsonResponse(text: string) {
    const cleaned = text.replace(/```json|```/g, '').trim()
    // Claude sometimes adds a short lead-in/trailing note after using tools — extract just the {...} block
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('Δεν βρέθηκε έγκυρο JSON στην απάντηση του AI')
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  }

  const webSearchTool = { type: 'web_search_20250305' as const, name: 'web_search' as const }

  // Pet Health Analysis — now compares against public veterinary reference data via web search
  app.post('/pet-health', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, analysis_type, breed, species } = req.body as { image_url: string; analysis_type: 'skin' | 'eye'; breed?: string; species?: string }
    if (!image_url || !analysis_type) return reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })

    // The /upload endpoint falls back to a base64 data: URI when no storage (R2) is configured.
    // Claude's "url" image source can't fetch data: URIs — convert those to a base64 image block instead.
    const dataUrlMatch = image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const imageContent = dataUrlMatch
      ? { type: 'image' as const, source: { type: 'base64' as const, media_type: dataUrlMatch[1] as any, data: dataUrlMatch[2] } }
      : { type: 'image' as const, source: { type: 'url' as const, url: image_url } }

    const systemPrompt = analysis_type === 'skin'
      ? `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη δερματολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές (π.χ. veterinary partner, merck vet manual, pet health sites) για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`
      : `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στην οφθαλμολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${analysis_type === 'skin' ? 'δέρματος' : 'ματιού'} κατοικίδιου ζώου${breed ? ` (ράτσα: ${breed})` : ''}${species ? ` (είδος: ${species})` : ''}.
Αν χρειάζεται, ψάξε στο διαδίκτυο για να συγκρίνεις τα ευρήματα με δημόσιες κτηνιατρικές πηγές σχετικά με συνήθεις παθήσεις αυτής της ράτσας/είδους.
Επέστρεψε ΜΟΝΟ JSON ως τελική απάντηση. Τα "findings" και "conditions" πρέπει να είναι arrays από ΑΠΛΑ strings (όχι objects):
{"severity":"low"|"medium"|"high","findings":["..."],"conditions":["..."],"comparison_sources":["σύντομη αναφορά πηγής 1","σύντομη αναφορά πηγής 2"],"recommendation":"","urgency":"","disclaimer":"Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο."}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI health error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })

  // Pet Emotion Analysis - single frame (image URL or base64)
  app.post('/emotion', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, image_base64, media_type, species, context } = req.body as any

    if (!image_url && !image_base64) return reply.code(400).send({ message: 'Απαιτείται εικόνα' })

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων συντροφιάς.
Αναλύεις εικόνες/frames βίντεο κατοικίδιων ζώων και αξιολογείς:
- Συναισθηματική κατάσταση (happy, calm, anxious, fearful, excited, playful, tired, stressed, neutral)
- Γλώσσα σώματος (στάση, αυτιά, ουρά, μάτια, στόμα)
- Επίπεδο ενέργειας (1-10)
- Συμβουλές για τον ιδιοκτήτη
Όταν χρειάζεται, μπορείς να αναζητήσεις στο διαδίκτυο δημόσιες πηγές για συμπεριφορά της ράτσας/είδους ώστε η σύγκριση να είναι πιο ακριβής.
Απαντάς ΜΟΝΟ σε JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε τη συναισθηματική κατάσταση ${species ? `του ${species}` : 'του κατοικίδιου'} σε αυτή την εικόνα.
${context ? `Πλαίσιο: ${context}` : ''}

Επέστρεψε ΜΟΝΟ JSON:
{
  "emotion": "happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral",
  "emotion_el": "χαρούμενο|ήρεμο|ανήσυχο|φοβισμένο|ενθουσιασμένο|παιχνιδιάρικο|κουρασμένο|αγχωμένο|ουδέτερο",
  "confidence": 0.0-1.0,
  "energy_level": 1-10,
  "body_language": {
    "posture": "περιγραφή στάσης",
    "ears": "περιγραφή αυτιών",
    "tail": "περιγραφή ουράς",
    "eyes": "περιγραφή ματιών",
    "mouth": "περιγραφή στόματος"
  },
  "observations": ["παρατήρηση 1", "παρατήρηση 2"],
  "advice": "συμβουλή για τον ιδιοκτήτη",
  "welfare_score": 1-10
}`

    try {
      const imageContent = image_base64
        ? { type: 'image' as const, source: { type: 'base64' as const, media_type: media_type || 'image/jpeg', data: image_base64 } }
        : { type: 'image' as const, source: { type: 'url' as const, url: image_url } }

      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI emotion error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })

  // Pet Emotion - analyze uploaded video frames (multiple frames)
  app.post('/emotion/video', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { frames, species, duration_seconds } = req.body as any
    // frames: array of base64 strings (extracted from video on frontend)
    if (!frames || !Array.isArray(frames) || frames.length === 0) return reply.code(400).send({ message: 'Απαιτούνται frames' })

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων. Αναλύεις πολλαπλά frames βίντεο για να αξιολογήσεις τη συνολική συναισθηματική κατάσταση. Όταν χρειάζεται, αναζητάς στο διαδίκτυο δημόσιες πηγές για συμπεριφορά της ράτσας/είδους. Απαντάς ΜΟΝΟ JSON στο τελικό σου μήνυμα.`

    // Αναλύουμε έως 5 frames
    const framesToAnalyze = frames.slice(0, 5)

    const imageContents = framesToAnalyze.map((f: string) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: f }
    }))

    const userPrompt = `Αυτά είναι ${framesToAnalyze.length} frames από βίντεο διάρκειας ${duration_seconds || '?'} δευτερολέπτων ${species ? `ενός ${species}` : 'ενός κατοικίδιου'}.
Ανάλυσε τη συναισθηματική κατάσταση συνολικά.

Επέστρεψε ΜΟΝΟ JSON:
{
  "overall_emotion": "happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral",
  "overall_emotion_el": "ελληνική μετάφραση",
  "confidence": 0.0-1.0,
  "energy_level": 1-10,
  "welfare_score": 1-10,
  "emotion_timeline": [{"frame": 1, "emotion": "...", "note": "..."}],
  "key_observations": ["παρατήρηση 1", "παρατήρηση 2", "παρατήρηση 3"],
  "body_language_summary": "σύνοψη γλώσσας σώματος",
  "advice": "συμβουλές για τον ιδιοκτήτη",
  "needs_attention": true|false,
  "attention_reason": "αιτία αν needs_attention=true"
}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI emotion video error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })
  // Stool & Urine Analysis
  app.post('/stool-urine', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const {
      image_url,
      sample_type,   // 'stool' | 'urine'
      species,       // 'dog' | 'cat'
      breed,
      age_years,
      weight_kg,
      is_sterilized,
      ate_from_street,
      recent_medications,
      diet_change,
      last_normal_stool,
      symptoms,      // free text
      additional_notes,
    } = req.body as any

    if (!image_url || !sample_type || !species) {
      return reply.code(400).send({ message: 'Απαιτούνται image_url, sample_type, species' })
    }

    const dataUrlMatch = image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const imageContent = dataUrlMatch
      ? { type: 'image' as const, source: { type: 'base64' as const, media_type: dataUrlMatch[1] as any, data: dataUrlMatch[2] } }
      : { type: 'image' as const, source: { type: 'url' as const, url: image_url } }

    const sampleEl = sample_type === 'stool' ? 'περιττώματα' : 'ούρα'
    const speciesEl = species === 'dog' ? 'σκύλου' : 'γάτας'

    const contextParts = [
      `Είδος: ${speciesEl}`,
      breed ? `Ράτσα: ${breed}` : null,
      age_years != null ? `Ηλικία: ${age_years} έτη` : null,
      weight_kg != null ? `Βάρος: ${weight_kg} kg` : null,
      is_sterilized != null ? `Στείρωση: ${is_sterilized ? 'Ναι' : 'Όχι'}` : null,
      ate_from_street ? `Έφαγε κάτι από τον δρόμο πρόσφατα: Ναι` : null,
      recent_medications ? `Πρόσφατα φάρμακα/αντιπαρασιτικά: ${recent_medications}` : null,
      diet_change ? `Αλλαγή διατροφής: ${diet_change}` : null,
      last_normal_stool ? `Τελευταία φυσιολογικά περιττώματα: ${last_normal_stool}` : null,
      symptoms ? `Συμπτώματα που παρατηρήθηκαν: ${symptoms}` : null,
      additional_notes ? `Επιπλέον σημειώσεις: ${additional_notes}` : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη γαστρεντερολογία και ουρολογία ζώων συντροφιάς.
Αναλύεις φωτογραφίες περιττωμάτων και ούρων σκύλων και γατών λαμβάνοντας υπόψη το ιστορικό του ζώου.
Όταν χρειάζεται, αναζητάς σε αξιόπιστες κτηνιατρικές πηγές (Merck Vet Manual, VCA Hospitals, PetMD, WSAVA guidelines) για να συγκρίνεις τα ευρήματα.
Απαντάς ΜΟΝΟ σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown backticks.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${sampleEl} ${speciesEl}.

ΙΣΤΟΡΙΚΟ ΖΩΟΥ:
${contextParts}

Λάβε υπόψη όλο το ιστορικό κατά την ανάλυση (π.χ. αν έφαγε από τον δρόμο, αν είναι στείρο, αλλαγές διατροφής, φάρμακα).
Αν χρειάζεται, ψάξε σε κτηνιατρικές πηγές για συχνές αιτίες και φυσιολογικό εύρος για αυτό το είδος/ράτσα/ηλικία.

Επέστρεψε ΜΟΝΟ JSON με αυτή τη δομή:
{
  "sample_type": "${sample_type}",
  "severity": "normal"|"mild"|"moderate"|"severe",
  "color": "χρώμα δείγματος",
  "consistency": "σύσταση (μόνο για περιττώματα)",
  "findings": ["εύρημα 1 ως plain string", "εύρημα 2 ως plain string"],
  "likely_causes": ["πιθανή αιτία 1", "πιθανή αιτία 2"],
  "context_factors": ["πώς επηρεάζει το ιστορικό τα ευρήματα"],
  "comparison_sources": ["σύντομη αναφορά πηγής"],
  "recommendation": "σαφής σύσταση για τον ιδιοκτήτη",
  "vet_urgency": "routine"|"within_48h"|"today"|"emergency",
  "vet_urgency_el": "Τακτικό ραντεβού"|"Εντός 48 ωρών"|"Σήμερα"|"Άμεσα / Έκτακτο",
  "home_care": ["τι μπορεί να κάνει ο ιδιοκτήτης στο σπίτι"],
  "warning_signs": ["συμπτώματα που να οδηγούν αμέσως σε κτηνίατρο"],
  "disclaimer": "Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την εξέταση από κτηνίατρο."
}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI stool/urine error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })
  // ─── LEGAL Q&A ──────────────────────────────────────────────────
  app.post('/legal', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { question, country = 'GR', context } = req.body as any
    if (!question) return reply.code(400).send({ message: 'Απαιτείται ερώτηση' })

    const systemPrompt = `Είσαι εξειδικευμένος νομικός σύμβουλος σε θέματα νομοθεσίας κατοικιδίων ζώων στην Ελλάδα.
Έχεις πλήρη γνώση της ελληνικής νομοθεσίας:

ΒΑΣΙΚΗ ΝΟΜΟΘΕΣΙΑ ΕΛΛΑΔΑ:
• Ν. 4830/2021 "Νέο πλαίσιο για τα ζώα συντροφιάς" - Ο κύριος νόμος. Υποχρεωτική στείρωση, μικροτσίπ, εγγραφή στο ΕΜΖΕ, ηλεκτρονικό βιβλιάριο. Πρόστιμα €1.000-€30.000 για παραβάσεις. Απαγόρευση εγκατάλειψης, κακοποίησης, ευθανασίας σε αδέσποτα.
• Ν. 4039/2012 - Προηγούμενος νόμος για αδέσποτα ζώα. Δημοτικά καταφύγια, υιοθεσία, τσιπ.
• Ν. 3170/2003 - Πρώτος νόμος προστασίας ζώων συντροφιάς.
• Ν. 1197/1981 - Αρχικός νόμος προστασίας ζώων.
• ΠΔ 463/1978 - Κανόνες για επικίνδυνα ζώα.

ΥΠΟΧΡΕΩΣΕΙΣ ΙΔΙΟΚΤΗΤΗ (Ν.4830/2021):
• Υποχρεωτικό μικροτσίπ (ISO 11784/11785) εντός 2 μηνών από απόκτηση
• Εγγραφή στο ΕΜΖΕ (Εθνικό Μητρώο Ζώων Συντροφιάς) - μέχρι 31/12/2024 για υπάρχοντα, αμέσως για νέα
• Ηλεκτρονικό βιβλιάριο υγείας
• Υποχρεωτική στείρωση σκύλων & γάτων (εξαίρεση για εκτροφείς με άδεια)
• Εμβόλιο κατά λύσσας για σκύλους
• Σήμα αναγνώρισης (κολάρο με στοιχεία ιδιοκτήτη)

ΕΥΘΥΝΗ ΙΔΙΟΚΤΗΤΗ:
• Αστική ευθύνη (ΑΚ 924) για ζημιές που προκαλεί το ζώο - εκτός αν αποδείξει ανωτέρα βία
• Ποινική ευθύνη για κακοποίηση (φυλάκιση 6 μηνών - 2 χρόνια + πρόστιμο €5.000-€30.000)
• Ευθύνη για θόρυβο/ενόχληση γειτόνων (ΚΟΚ, κανονισμοί πολυκατοικίας)

ΖΩΝΤΑΝΑ ΣΕ ΕΝΟΙΚΙΑΖΟΜΕΝΑ:
• Ο ιδιοκτήτης ΔΕΝ μπορεί να απαγορεύσει γενικώς κατοικίδια αν δεν αναφέρεται στο μισθωτήριο
• Το άρθρο 13 Ν.1493/1984 επιτρέπει ρύθμιση στο μισθωτήριο
• Πρακτικά: αν το συμβόλαιο απαγορεύει, ισχύει. Αν δεν λέει τίποτα, επιτρέπεται
• Ζημιές από κατοικίδιο = ευθύνη μισθωτή

ΑΔΕΣΠΟΤΑ ΖΩΙΑ:
• Απαγορεύεται η θανάτωση / ευθανασία αδέσποτων (εκτός ανίατης νόσου)
• Δήμοι υποχρεούνται σε ΔΤΣΤΕ (Δράσεις Τσιπ-Στείρωση-Τοποθέτηση-Επιστροφή)
• Τροφοδότες αδέσποτων: νόμιμοι, υπό προϋποθέσεις
• Υιοθεσία αδέσποτου: δωρεάν, μέσω δήμου ή φιλοζωικού

ΜΕΤΑΦΟΡΑ - ΤΑΞΙΔΙ:
• Εσωτερικό: μικροτσίπ + εμβόλιο λύσσας + βιβλιάριο
• ΕΕ: EU Pet Passport + μικροτσίπ + λύσσα (21+ ημέρες πριν ταξίδι)
• Αεροπλάνο: κάθε εταιρεία έχει δικές της πολιτικές
• ΜΜΜ (Αττικό Μετρό/ΗΣΑΠ): σε τσάντα μεταφοράς ή κλουβί

ΕΚΤΡΟΦΕΙΑ / ΠΩΛΗΣΗ:
• Υποχρεωτική άδεια εκτροφείου από Κτηνιατρική Αρχή
• Μητρώο ΕΜΖΕ για εκτροφείς
• Πώληση κουταβιών <8 εβδομάδων: ΑΠΑΓΟΡΕΥΕΤΑΙ (πρόστιμο €3.000-€10.000)
• Pet shops: επιτρέπεται μόνο πώληση ψαριών/πτηνών/ερπετών - ΟΧΙ σκύλων/γάτων από Ν.4830/2021

ΠΑΡΟΥΣΙΑ ΣΕ ΔΗΜΟΣΙΟΥΣ ΧΩΡΟΥΣ:
• Σκύλοι σε δημόσιους χώρους: υποχρεωτικά με λουρί & φίμωτρο αν >20kg ή επιθετικής ράτσας
• Παραλίες: αποκλείονται γενικά, εκτός ειδικά σημειωμένων pet-friendly
• Εστιατόρια/καφέ: απόφαση ιδιοκτήτη, δεν υπάρχει γενική απαγόρευση
• Δημόσια κτίρια: απαγορεύονται εκτός ΑμεΑ με σκύλο οδηγό

ΑΠΟΖΗΜΙΩΣΗ / ΔΙΚΑΣΤΙΚΕΣ ΕΝΕΡΓΕΙΕΣ:
• Ατύχημα από αδέσποτο: ευθύνη του Δήμου αν αποδειχθεί αμέλεια
• Θάνατος κατοικιδίου από τρίτο: αστική ευθύνη, αποζημίωση αξίας ζώου + ηθική βλάβη
• Παράνομη κατάσχεση κατοικιδίου: αίτηση αποδοχής στον Εισαγγελέα

Απάντησε ΠΑΝΤΑ:
1. Στα ΕΛΛΗΝΙΚΑ
2. Αναφέροντας συγκεκριμένα άρθρα/νόμους
3. Εξηγώντας πρακτικά βήματα
4. Τονίζοντας ότι δεν αντικαθιστάς δικηγόρο για σοβαρές υποθέσεις
5. Σε JSON format:
{
  "answer": "πλήρης απάντηση σε Markdown",
  "relevant_laws": ["Ν.4830/2021 άρθρο X", "..."],
  "practical_steps": ["βήμα 1", "βήμα 2"],
  "urgency": "low"|"medium"|"high",
  "recommend_lawyer": true|false,
  "disclaimer": "Η απάντηση αυτή παρέχεται για ενημερωτικούς σκοπούς..."
}`

    const userPrompt = `${context ? `Πλαίσιο: ${context}\n` : ''}Ερώτηση: ${question}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const text = (response.content[0] as any)?.text || ''
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI legal error:', err)
      return reply.code(500).send({ message: 'Σφάλμα: ' + err.message })
    }
  })
}

export default aiRoutes