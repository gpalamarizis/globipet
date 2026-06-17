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
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  }

  const webSearchTool = { type: 'web_search_20250305' as const, name: 'web_search' as const }

  // Pet Health Analysis — now compares against public veterinary reference data via web search
  app.post('/pet-health', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, analysis_type, breed, species } = req.body as { image_url: string; analysis_type: 'skin' | 'eye'; breed?: string; species?: string }
    if (!image_url || !analysis_type) return reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })

    const systemPrompt = analysis_type === 'skin'
      ? `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη δερματολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές (π.χ. veterinary partner, merck vet manual, pet health sites) για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`
      : `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στην οφθαλμολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${analysis_type === 'skin' ? 'δέρματος' : 'ματιού'} κατοικίδιου ζώου${breed ? ` (ράτσα: ${breed})` : ''}${species ? ` (είδος: ${species})` : ''}.
Αν χρειάζεται, ψάξε στο διαδίκτυο για να συγκρίνεις τα ευρήματα με δημόσιες κτηνιατρικές πηγές σχετικά με συνήθεις παθήσεις αυτής της ράτσας/είδους.
Επέστρεψε ΜΟΝΟ JSON ως τελική απάντηση:
{"severity":"low"|"medium"|"high","findings":[],"conditions":[],"comparison_sources":["σύντομη αναφορά πηγής 1","σύντομη αναφορά πηγής 2"],"recommendation":"","urgency":"","disclaimer":"Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο."}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: image_url } }, { type: 'text', text: userPrompt }] }]
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
}

export default aiRoutes
