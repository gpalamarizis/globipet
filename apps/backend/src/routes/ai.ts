import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'

const aiRoutes: FastifyPluginAsync = async (app) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  app.post('/pet-health', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, analysis_type } = req.body as { image_url: string; analysis_type: 'skin' | 'eye' }

    if (!image_url || !analysis_type) {
      return reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })
    }

    const systemPrompt = analysis_type === 'skin'
      ? `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη δερματολογία ζώων συντροφιάς. 
         Αναλύεις φωτογραφίες δέρματος κατοικίδιων ζώων και παρέχεις ενδεικτική αξιολόγηση.
         Πάντα απαντάς σε JSON με την παρακάτω δομή και ΜΟΝΟ JSON, χωρίς markdown.`
      : `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στην οφθαλμολογία ζώων συντροφιάς.
         Αναλύεις φωτογραφίες ματιών κατοικίδιων ζώων και παρέχεις ενδεικτική αξιολόγηση.
         Πάντα απαντάς σε JSON με την παρακάτω δομή και ΜΟΝΟ JSON, χωρίς markdown.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${analysis_type === 'skin' ? 'δέρματος' : 'ματιού'} κατοικίδιου ζώου.
    
Επέστρεψε ΜΟΝΟ ένα JSON object με αυτή ακριβώς τη δομή:
{
  "severity": "low" | "medium" | "high",
  "findings": ["εύρημα 1", "εύρημα 2", ...],
  "conditions": ["πιθανή πάθηση 1", "πιθανή πάθηση 2"],
  "recommendation": "σύσταση για τον ιδιοκτήτη",
  "urgency": "περιγραφή επείγοντος",
  "disclaimer": "Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο."
}

Αν η εικόνα δεν είναι ${analysis_type === 'skin' ? 'δέρμα ζώου' : 'μάτι ζώου'}, επέστρεψε severity: "low" και findings: ["Η εικόνα δεν φαίνεται να απεικονίζει ${analysis_type === 'skin' ? 'δέρμα ζώου' : 'μάτι ζώου'}"].`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: image_url } },
            { type: 'text', text: userPrompt }
          ]
        }]
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const clean = text.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)
      return result

    } catch (err: any) {
      console.error('AI analysis error:', err)
      return reply.code(500).send({ message: 'Σφάλμα κατά την ανάλυση AI: ' + err.message })
    }
  })
}

export default aiRoutes
