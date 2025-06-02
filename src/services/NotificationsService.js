const nodemailer = require('nodemailer');
const LogService = require('./LogService');
const User = require('../models/User');
const Usage = require('../models/Usage');
const Subscription = require('../models/Subscription');

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.initializeEmailTransporter();
        
        // Templates d'emails
        this.emailTemplates = {
            quotaWarning: {
                subject: {
                    fr: "⚠️ VoxKill - Quota bientôt atteint",
                    en: "⚠️ VoxKill - Quota almost reached"
                },
                html: {
                    fr: (data) => `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <h2 style="color: #333;">Attention, votre quota est presque atteint !</h2>
                                <p>Bonjour ${data.userName},</p>
                                <p>Vous avez utilisé <strong>${data.usedPercent}%</strong> de votre quota mensuel.</p>
                                <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p><strong>Utilisation actuelle :</strong></p>
                                    <ul>
                                        <li>Minutes utilisées : ${data.usedMinutes} / ${data.totalMinutes}</li>
                                        <li>Minutes restantes : ${data.remainingMinutes}</li>
                                    </ul>
                                </div>
                                <p>Pour continuer à profiter de VoxKill sans interruption, pensez à upgrader votre plan :</p>
                                <a href="${data.upgradeUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Augmenter ma limite</a>
                            </div>
                        </div>
                    `,
                    en: (data) => `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <h2 style="color: #333;">Warning, your quota is almost reached!</h2>
                                <p>Hello ${data.userName},</p>
                                <p>You have used <strong>${data.usedPercent}%</strong> of your monthly quota.</p>
                                <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p><strong>Current usage:</strong></p>
                                    <ul>
                                        <li>Minutes used: ${data.usedMinutes} / ${data.totalMinutes}</li>
                                        <li>Minutes remaining: ${data.remainingMinutes}</li>
                                    </ul>
                                </div>
                                <p>To continue enjoying VoxKill without interruption, consider upgrading your plan:</p>
                                <a href="${data.upgradeUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Increase my limit</a>
                            </div>
                        </div>
                    `
                }
            },
            quotaExhausted: {
                subject: {
                    fr: "🔴 VoxKill - Quota mensuel atteint",
                    en: "🔴 VoxKill - Monthly quota reached"
                },
                html: {
                    fr: (data) => `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <h2 style="color: #dc3545;">Votre quota mensuel est épuisé</h2>
                                <p>Bonjour ${data.userName},</p>
                                <p>Vous avez atteint votre limite mensuelle de ${data.totalMinutes} minutes de transcription.</p>
                                <p>Pour continuer à utiliser VoxKill, vous pouvez :</p>
                                <ul>
                                    <li>Attendre le renouvellement de votre quota le ${data.renewalDate}</li>
                                    <li>Ou passer à un plan supérieur pour plus de minutes</li>
                                </ul>
                                <a href="${data.upgradeUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Upgrader maintenant</a>
                            </div>
                        </div>
                    `,
                    en: (data) => `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <h2 style="color: #dc3545;">Your monthly quota is exhausted</h2>
                                <p>Hello ${data.userName},</p>
                                <p>You have reached your monthly limit of ${data.totalMinutes} minutes of transcription.</p>
                                <p>To continue using VoxKill, you can:</p>
                                <ul>
                                    <li>Wait for your quota renewal on ${data.renewalDate}</li>
                                    <li>Or upgrade to a higher plan for more minutes</li>
                                </ul>
                                <a href="${data.upgradeUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Upgrade now</a>
                            </div>
                        </div>
                    `
                }
            },
            welcome: {
                subject: {
                    fr: "🎉 Bienvenue sur VoxKill !",
                    en: "🎉 Welcome to VoxKill!"
                },
                html: {
                    fr: (data) => `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <h1 style="color: #333; text-align: center;">Bienvenue sur VoxKill ! 🎉</h1>
                                <p>Bonjour ${data.userName},</p>
                                <p>Merci de nous faire confiance ! Votre compte VoxKill est maintenant actif.</p>
                                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <h3>🚀 Comment démarrer :</h3>
                                    <ol>
                                        <li>Connectez votre WhatsApp depuis le tableau de bord</li>
                                        <li>Envoyez une note vocale à n'importe quel contact</li>
                                        <li>Recevez la transcription instantanément !</li>
                                    </ol>
                                </div>
                                <p><strong>Votre essai gratuit inclut :</strong></p>
                                <ul>
                                    <li>✅ 30 minutes de transcription</li>
                                    <li>✅ Support français et anglais</li>
                                    <li>✅ 7 jours d'accès complet</li>
                                </ul>
                                <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Accéder à mon tableau de bord</a>
                            </div>
                        </div>
                    `,
                    en: (data) => `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <h1 style="color: #333; text-align: center;">Welcome to VoxKill! 🎉</h1>
                                <p>Hello ${data.userName},</p>
                                <p>Thank you for trusting us! Your VoxKill account is now active.</p>
                                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <h3>🚀 How to get started:</h3>
                                    <ol>
                                        <li>Connect your WhatsApp from the dashboard</li>
                                        <li>Send a voice note to any contact</li>
                                        <li>Receive the transcription instantly!</li>
                                    </ol>
                                </div>
                                <p><strong>Your free trial includes:</strong></p>
                                <ul>
                                    <li>✅ 30 minutes of transcription</li>
                                    <li>✅ French and English support</li>
                                    <li>✅ 7 days of full access</li>
                                </ul>
                                <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Access my dashboard</a>
                            </div>
                        </div>
                    `
                }
            }
        };
    }

    initializeEmailTransporter() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.emailTransporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            
            LogService.info('Email transporter initialized');
        } else {
            LogService.warn('Email configuration missing, notifications will be logged only');
        }
    }

    async sendEmail(to, template, data, language = 'fr') {
        try {
            if (!this.emailTransporter) {
                LogService.info('Email would be sent:', { to, template, data });
                return true;
            }
            
            const emailTemplate = this.emailTemplates[template];
            if (!emailTemplate) {
                throw new Error(`Email template '${template}' not found`);
            }
            
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'VoxKill <noreply@voxkill.com>',
                to,
                subject: emailTemplate.subject[language] || emailTemplate.subject.fr,
                html: emailTemplate.html[language](data) || emailTemplate.html.fr(data)
            };
            
            await this.emailTransporter.sendMail(mailOptions);
            
            LogService.info('Email sent successfully', {
                to,
                template,
                subject: mailOptions.subject
            });
            
            return true;
        } catch (error) {
            LogService.error('Error sending email:', {
                to,
                template,
                error: error.message
            });
            return false;
        }
    }

    async sendWhatsAppNotification(userId, message) {
        try {
            const WhatsAppService = require('./WhatsAppService');
            const client = WhatsAppService.clients.get(userId);
            
            if (client && client.isConnected) {
                const user = await User.findById(userId);
                const selfChatId = client.info.wid.user + '@c.us';
                
                await client.sendMessage(selfChatId, message);
                
                LogService.info('WhatsApp notification sent', { userId });
                return true;
            }
            
            return false;
        } catch (error) {
            LogService.error('Error sending WhatsApp notification:', {
                userId,
                error: error.message
            });
            return false;
        }
    }

    async checkAndNotifyQuotaUsage(userId) {
        try {
            const user = await User.findById(userId);
            const subscription = await Subscription.findOne({ userId });
            const usage = await Usage.getOrCreate(userId, subscription._id);
            
            if (!user || !subscription || !usage) {
                return;
            }
            
            const totalMinutes = subscription.limits.minutesPerMonth;
            const usedMinutes = totalMinutes - (await usage.getRemainingMinutes());
            const usedPercent = Math.round((usedMinutes / totalMinutes) * 100);
            
            // Vérifier si on doit envoyer une notification
            const shouldNotify = user.settings.notificationPreferences?.usageAlerts !== false;
            
            if (!shouldNotify) {
                return;
            }
            
            // Notification à 80%
            if (usedPercent >= 80 && usedPercent < 85 && !usage.notifiedAt80) {
                await this.sendQuotaWarning(user, subscription, usage, usedPercent);
                usage.notifiedAt80 = true;
                await usage.save();
            }
            
            // Notification à 100%
            if (usedPercent >= 100 && !usage.notifiedAt100) {
                await this.sendQuotaExhausted(user, subscription, usage);
                usage.notifiedAt100 = true;
                await usage.save();
            }
            
        } catch (error) {
            LogService.error('Error checking quota usage:', {
                userId,
                error: error.message
            });
        }
    }

    async sendQuotaWarning(user, subscription, usage, usedPercent) {
        const language = user.settings.transcriptionLanguage || 'fr';
        const totalMinutes = subscription.limits.minutesPerMonth;
        const remainingMinutes = await usage.getRemainingMinutes();
        const usedMinutes = totalMinutes - remainingMinutes;
        
        const emailData = {
            userName: user.email.split('@')[0],
            usedPercent,
            usedMinutes: Math.round(usedMinutes),
            totalMinutes,
            remainingMinutes: Math.round(remainingMinutes),
            upgradeUrl: `${process.env.FRONTEND_URL}/dashboard?section=subscription`
        };
        
        // Email
        if (user.settings.notificationPreferences?.email !== false) {
            await this.sendEmail(user.email, 'quotaWarning', emailData, language);
        }
        
        // WhatsApp
        if (user.settings.notificationPreferences?.whatsapp !== false) {
            const whatsappMessage = language === 'fr'
                ? `⚠️ *Attention !*\n\nVous avez utilisé ${usedPercent}% de votre quota mensuel.\nIl vous reste ${Math.round(remainingMinutes)} minutes sur ${totalMinutes}.\n\n👉 Augmentez votre limite : ${emailData.upgradeUrl}`
                : `⚠️ *Warning!*\n\nYou have used ${usedPercent}% of your monthly quota.\nYou have ${Math.round(remainingMinutes)} minutes left out of ${totalMinutes}.\n\n👉 Increase your limit: ${emailData.upgradeUrl}`;
            
            await this.sendWhatsAppNotification(user._id.toString(), whatsappMessage);
        }
    }

    async sendQuotaExhausted(user, subscription, usage) {
        const language = user.settings.transcriptionLanguage || 'fr';
        const renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString(
            language === 'fr' ? 'fr-FR' : 'en-US'
        );
        
        const emailData = {
            userName: user.email.split('@')[0],
            totalMinutes: subscription.limits.minutesPerMonth,
            renewalDate,
            upgradeUrl: `${process.env.FRONTEND_URL}/dashboard?section=subscription`
        };
        
        // Email
        if (user.settings.notificationPreferences?.email !== false) {
            await this.sendEmail(user.email, 'quotaExhausted', emailData, language);
        }
        
        // WhatsApp
        if (user.settings.notificationPreferences?.whatsapp !== false) {
            const whatsappMessage = language === 'fr'
                ? `🔴 *Quota épuisé*\n\nVous avez atteint votre limite mensuelle de ${emailData.totalMinutes} minutes.\n\nRenouvellement : ${renewalDate}\n\n👉 Upgrader maintenant : ${emailData.upgradeUrl}`
                : `🔴 *Quota exhausted*\n\nYou have reached your monthly limit of ${emailData.totalMinutes} minutes.\n\nRenewal: ${renewalDate}\n\n👉 Upgrade now: ${emailData.upgradeUrl}`;
            
            await this.sendWhatsAppNotification(user._id.toString(), whatsappMessage);
        }
    }

    async sendWelcomeEmail(user) {
        const language = user.settings.transcriptionLanguage || 'fr';
        
        const emailData = {
            userName: user.email.split('@')[0],
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        };
        
        await this.sendEmail(user.email, 'welcome', emailData, language);
    }

    // Méthode pour envoyer des notifications personnalisées
    async sendCustomNotification(userId, { email, whatsapp, push }) {
        try {
            const user = await User.findById(userId);
            if (!user) return;
            
            const results = {
                email: false,
                whatsapp: false,
                push: false
            };
            
            if (email && user.settings.notificationPreferences?.email !== false) {
                results.email = await this.sendEmail(user.email, 'custom', email);
            }
            
            if (whatsapp && user.settings.notificationPreferences?.whatsapp !== false) {
                results.whatsapp = await this.sendWhatsAppNotification(userId, whatsapp);
            }
            
            return results;
        } catch (error) {
            LogService.error('Error sending custom notification:', {
                userId,
                error: error.message
            });
            return null;
        }
    }
}

module.exports = new NotificationService();