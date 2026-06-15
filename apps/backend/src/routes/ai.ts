import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'

const aiRoutes: FastifyPluginAsync = async (app) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Pet Health Analysis
  app.post('/pet-health', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, analysis_type } = req.body as { image_url: string; analysis_type: 'skin' | 'eye' }
    if (!image_url || !analysis_type) return reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })

    const systemPrompt = analysis_type === 'skin'
      ? `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη δερματολογία ζώων συντροφιάς. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON, χωρίς markdown.`
      : `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στην οφθαλμολογία ζώων συντροφιάς. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON, χωρίς markdown.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${analysis_type === 'skin' ? 'δέρματος' : 'ματιού'} κατοικίδιου ζώου.
Επέστρεψε ΜΟΝΟ JSON:
{"severity":"low"|"medium"|"high","findings":[],"conditions":[],"recommendation":"","urgency":"","disclaimer":"Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο."}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5', max_tokens: 1024, system: systemPrompt,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: image_url } }, { type: 'text', text: userPrompt }] }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return JSON.parse(text.replace(/```json|```/g, '').trim())
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
Απαντάς ΜΟΝΟ σε JSON, χωρίς markdown.`

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
        model: 'claude-opus-4-5', max_tokens: 1024, system: systemPrompt,
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return JSON.parse(text.replace(/```json|```/g, '').trim())
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

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων. Αναλύεις πολλαπλά frames βίντεο για να αξιολογήσεις τη συνολική συναισθηματική κατάσταση. Απαντάς ΜΟΝΟ JSON.`

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
        model: 'claude-opus-4-5', max_tokens: 1500, system: systemPrompt,
        messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: userPrompt }] }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch (err: any) {
      console.error('AI emotion video error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })
}

export default aiRoutes
