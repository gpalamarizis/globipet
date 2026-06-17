import cron from 'node-cron'
import prisma from './prisma.js'
import { broadcastToUser } from '../routes/notifications.js'

export function startAiTrialExpiryCron() {
  // Runs once a day at 09:00 server time
  cron.schedule('0 9 * * *', async () => {
    try {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)

      const expiredTrialUsers = await prisma.user.findMany({
        where: {
          ai_subscription_status: 'trial',
          ai_trial_started_at: { lte: fifteenDaysAgo },
        },
        select: { id: true, email: true, full_name: true },
      })

      for (const user of expiredTrialUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: { ai_subscription_status: 'expired' },
        })

        const notification = await prisma.notification.create({
          data: {
            user_email: user.email,
            title: 'Η δωρεάν δοκιμή AI Health έληξε',
            message: 'Οι 15 δωρεάν ημέρες σου στο AI Health ολοκληρώθηκαν. Συνδρομήσε για να συνεχίσεις να έχεις πρόσβαση στις λειτουργίες AI υγείας.',
            type: 'ai_trial_expired',
            link: '/medical-center',
          },
        })

        broadcastToUser(user.id, { type: 'notification', notification })
      }

      if (expiredTrialUsers.length > 0) {
        console.log(`🐾 AI trial expiry check: ${expiredTrialUsers.length} χρήστες έληξε το trial τους`)
      }
    } catch (err) {
      console.error('AI trial expiry cron error:', err)
    }
  })
}
