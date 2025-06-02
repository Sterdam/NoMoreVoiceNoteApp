const cron = require('node-cron');
const User = require('../models/User');
const NotificationService = require('../services/NotificationsService');
const LogService = require('../services/LogService');

function setupNotificationJobs() {
    // Vérifier les quotas toutes les heures
    cron.schedule('0 * * * *', async () => {
        try {
            LogService.info('Running hourly quota check...');
            
            const activeUsers = await User.find({ isActive: true });
            
            for (const user of activeUsers) {
                await NotificationService.checkAndNotifyQuotaUsage(user._id.toString());
            }
            
            LogService.info('Quota check completed');
        } catch (error) {
            LogService.error('Error in quota check job:', error);
        }
    });
    
    LogService.info('Notification jobs scheduled');
}

module.exports = { setupNotificationJobs };