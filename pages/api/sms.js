// pages/api/sms.js
import { getServerSession } from "next-auth";
import { Zaka } from "@/models/Zaka";
import { ZakaPayment } from "@/models/ZakaPayment";
import { SMSTemplate } from "@/models/SMSTemplate";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";
import smsService from "@/lib/smsService";

async function hasPermission(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handle(req, res) {
  const { method } = req;
  
  try {
    await mongooseConnect();

    // Check permissions for all SMS operations
    const isAuthorized = await hasPermission(req, res);
    if (!isAuthorized) return;

    if (method === "POST") {
      const { action, recipients, message, mobileNumbers, zakaNumbers, groups, templateId, templateData } = req.body;
      
      if (action === "send_bulk") {
        // Send bulk SMS to specific recipients
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return res.status(400).json({ 
            error: "Recipients array is required for bulk SMS" 
          });
        }

        let messageToSend = message;
        
        // If template is provided, use template content
        if (templateId) {
          const template = await SMSTemplate.findById(templateId);
          if (template) {
            messageToSend = template.content;
          }
        }

        if (!messageToSend || messageToSend.trim() === '') {
          return res.status(400).json({ 
            error: "Message content is required" 
          });
        }

        // Prepare personalized messages if template data is provided
        let normalizedRecipients;
        if (templateData && templateId) {
          // Fetch payment details for each recipient if it's a payment confirmation template
          const template = await SMSTemplate.findById(templateId);
          
          if (template && template.category === 'payment_confirmation') {
            // Fetch payment details for each recipient
            const recipientsWithPayments = await Promise.all(
              recipients.map(async (recipient) => {
                try {
                  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
                  const currentYear = new Date().getFullYear();
                  
                  const payment = await ZakaPayment.findOne({
                    zakaNumber: recipient.zakaNumber,
                    month: currentMonth,
                    year: currentYear
                  });
                  
                  if (payment) {
                    return {
                      ...recipient,
                      amount: payment.amount.toString(),
                      paymentMonth: payment.month,
                      paymentYear: payment.year
                    };
                  }
                } catch (err) {
                  console.error('Error fetching payment for recipient:', recipient.zakaNumber);
                }
                return recipient;
              })
            );
            
            const personalizedMessages = smsService.preparePersonalizedMessages(
              messageToSend,
              recipientsWithPayments,
              templateData
            );
            normalizedRecipients = personalizedMessages
              .filter(rec => rec.mobile && smsService.validatePhoneNumber(rec.mobile))
              .map(rec => ({
                mobile: smsService.normalizePhoneNumber(rec.mobile),
                message: rec.message
              }));
          } else {
            // Use provided template data for other template types
            const personalizedMessages = smsService.preparePersonalizedMessages(
              messageToSend,
              recipients,
              templateData
            );
            normalizedRecipients = personalizedMessages
              .filter(rec => rec.mobile && smsService.validatePhoneNumber(rec.mobile))
              .map(rec => ({
                mobile: smsService.normalizePhoneNumber(rec.mobile),
                message: rec.message
              }));
          }
        } else {
          // Normalize phone numbers without personalization
          normalizedRecipients = recipients
            .filter(rec => rec.mobile && smsService.validatePhoneNumber(rec.mobile))
            .map(rec => ({
              mobile: smsService.normalizePhoneNumber(rec.mobile),
              message: messageToSend.trim()
            }));
        }

        if (normalizedRecipients.length === 0) {
          return res.status(400).json({ 
            error: "No valid phone numbers provided" 
          });
        }

        const result = await smsService.sendBulkSMS(normalizedRecipients);
        
        if (result.success) {
          return res.json({
            success: true,
            message: result.message,
            sent: result.count,
            data: result.data
          });
        } else {
          return res.status(500).json({ 
            error: result.message,
            details: result.error
          });
        }
      }

      if (action === "send_to_zaka") {
        // Send SMS to zaka members by zakaNumbers
        if (!zakaNumbers || !Array.isArray(zakaNumbers) || zakaNumbers.length === 0) {
          return res.status(400).json({ 
            error: "Zaka numbers array is required" 
          });
        }

        let messageToSend = message;
        
        // If template is provided, use template content
        if (templateId) {
          const template = await SMSTemplate.findById(templateId);
          if (template) {
            messageToSend = template.content;
          }
        }

        if (!messageToSend || messageToSend.trim() === '') {
          return res.status(400).json({ 
            error: "Message content is required" 
          });
        }

        // Fetch zaka members
        const zakas = await Zaka.find({ 
          zakaNumber: { $in: zakaNumbers } 
        });

        if (zakas.length === 0) {
          return res.status(404).json({ 
            error: "No zaka members found with provided numbers" 
          });
        }

        // Prepare personalized messages if template data is provided
        if (templateData && templateId) {
          const personalizedMessages = smsService.preparePersonalizedMessages(
            messageToSend,
            zakas,
            templateData
          );
          const normalizedRecipients = personalizedMessages
            .filter(rec => rec.mobile && smsService.validatePhoneNumber(rec.mobile))
            .map(rec => ({
              mobile: smsService.normalizePhoneNumber(rec.mobile),
              message: rec.message
            }));

          if (normalizedRecipients.length === 0) {
            return res.status(400).json({ 
              error: "No valid phone numbers found for selected zaka members" 
            });
          }

          const result = await smsService.sendBulkSMS(normalizedRecipients);
          
          if (result.success) {
            return res.json({
              success: true,
              message: result.message,
              sent: result.count,
              targeted: zakas.length,
              data: result.data
            });
          } else {
            return res.status(500).json({ 
              error: result.message,
              details: result.error
            });
          }
        } else {
          // Collect phone numbers without personalization
          const phoneNumbers = zakas
            .map(zaka => zaka.mobileNumber)
            .filter(mobile => mobile && smsService.validatePhoneNumber(mobile))
            .map(mobile => smsService.normalizePhoneNumber(mobile));

          if (phoneNumbers.length === 0) {
            return res.status(400).json({ 
              error: "No valid phone numbers found for selected zaka members" 
            });
          }

          const result = await smsService.sendBulkMessage(phoneNumbers, messageToSend.trim());
          
          if (result.success) {
            return res.json({
              success: true,
              message: result.message,
              sent: result.count,
              targeted: zakas.length,
              data: result.data
            });
          } else {
            return res.status(500).json({ 
              error: result.message,
              details: result.error
            });
          }
        }
      }

      if (action === "send_to_group") {
        // Send SMS to zaka members by group/jumuiya
        if (!groups || !Array.isArray(groups) || groups.length === 0) {
          return res.status(400).json({ 
            error: "Groups array is required" 
          });
        }

        let messageToSend = message;
        
        // If template is provided, use template content
        if (templateId) {
          const template = await SMSTemplate.findById(templateId);
          if (template) {
            messageToSend = template.content;
          }
        }

        if (!messageToSend || messageToSend.trim() === '') {
          return res.status(400).json({ 
            error: "Message content is required" 
          });
        }

        // Fetch zaka members by groups
        const zakas = await Zaka.find({ 
          group: { $in: groups } 
        });

        if (zakas.length === 0) {
          return res.status(404).json({ 
            error: "No zaka members found in selected groups" 
          });
        }

        // Prepare personalized messages if template data is provided
        if (templateData && templateId) {
          const personalizedMessages = smsService.preparePersonalizedMessages(
            messageToSend,
            zakas,
            templateData
          );
          const normalizedRecipients = personalizedMessages
            .filter(rec => rec.mobile && smsService.validatePhoneNumber(rec.mobile))
            .map(rec => ({
              mobile: smsService.normalizePhoneNumber(rec.mobile),
              message: rec.message
            }));

          if (normalizedRecipients.length === 0) {
            return res.status(400).json({ 
              error: "No valid phone numbers found for selected groups" 
            });
          }

          const result = await smsService.sendBulkSMS(normalizedRecipients);
          
          if (result.success) {
            return res.json({
              success: true,
              message: result.message,
              sent: result.count,
              targeted: zakas.length,
              data: result.data
            });
          } else {
            return res.status(500).json({ 
              error: result.message,
              details: result.error
            });
          }
        } else {
          // Collect phone numbers without personalization
          const phoneNumbers = zakas
            .map(zaka => zaka.mobileNumber)
            .filter(mobile => mobile && smsService.validatePhoneNumber(mobile))
            .map(mobile => smsService.normalizePhoneNumber(mobile));

          if (phoneNumbers.length === 0) {
            return res.status(400).json({ 
              error: "No valid phone numbers found for selected groups" 
            });
          }

          const result = await smsService.sendBulkMessage(phoneNumbers, messageToSend.trim());
          
          if (result.success) {
            return res.json({
              success: true,
              message: result.message,
              sent: result.count,
              targeted: zakas.length,
              data: result.data
            });
          } else {
            return res.status(500).json({ 
              error: result.message,
              details: result.error
            });
          }
        }
      }

      if (action === "send_to_all") {
        // Send SMS to all zaka members
        let messageToSend = message;
        
        // If template is provided, use template content
        if (templateId) {
          const template = await SMSTemplate.findById(templateId);
          if (template) {
            messageToSend = template.content;
          }
        }

        if (!messageToSend || messageToSend.trim() === '') {
          return res.status(400).json({ 
            error: "Message content is required" 
          });
        }

        // Fetch all zaka members
        const zakas = await Zaka.find({});

        if (zakas.length === 0) {
          return res.status(404).json({ 
            error: "No zaka members found" 
          });
        }

        // Prepare personalized messages if template data is provided
        if (templateData && templateId) {
          const personalizedMessages = smsService.preparePersonalizedMessages(
            messageToSend,
            zakas,
            templateData
          );
          const normalizedRecipients = personalizedMessages
            .filter(rec => rec.mobile && smsService.validatePhoneNumber(rec.mobile))
            .map(rec => ({
              mobile: smsService.normalizePhoneNumber(rec.mobile),
              message: rec.message
            }));

          if (normalizedRecipients.length === 0) {
            return res.status(400).json({ 
              error: "No valid phone numbers found" 
            });
          }

          const result = await smsService.sendBulkSMS(normalizedRecipients);
          
          if (result.success) {
            return res.json({
              success: true,
              message: result.message,
              sent: result.count,
              targeted: zakas.length,
              data: result.data
            });
          } else {
            return res.status(500).json({ 
              error: result.message,
              details: result.error
            });
          }
        } else {
          // Collect phone numbers without personalization
          const phoneNumbers = zakas
            .map(zaka => zaka.mobileNumber)
            .filter(mobile => mobile && smsService.validatePhoneNumber(mobile))
            .map(mobile => smsService.normalizePhoneNumber(mobile));

          if (phoneNumbers.length === 0) {
            return res.status(400).json({ 
              error: "No valid phone numbers found" 
            });
          }

          const result = await smsService.sendBulkMessage(phoneNumbers, messageToSend.trim());
          
          if (result.success) {
            return res.json({
              success: true,
              message: result.message,
              sent: result.count,
              targeted: zakas.length,
              data: result.data
            });
          } else {
            return res.status(500).json({ 
              error: result.message,
              details: result.error
            });
          }
        }
      }

      if (action === "send_single") {
        // Send single SMS
        const { mobile } = req.body;
        
        if (!mobile) {
          return res.status(400).json({ 
            error: "Mobile number is required" 
          });
        }

        if (!message || message.trim() === '') {
          return res.status(400).json({ 
            error: "Message content is required" 
          });
        }

        if (!smsService.validatePhoneNumber(mobile)) {
          return res.status(400).json({ 
            error: "Invalid phone number format" 
          });
        }

        const normalizedMobile = smsService.normalizePhoneNumber(mobile);
        const result = await smsService.sendSingleSMS(normalizedMobile, message.trim());
        
        if (result.success) {
          return res.json({
            success: true,
            message: result.message,
            data: result.data
          });
        } else {
          return res.status(500).json({ 
            error: result.message,
            details: result.error
          });
        }
      }

      return res.status(400).json({ error: "Invalid action specified" });
    }

    if (method === "GET") {
      const { action } = req.query;

      if (action === "balance") {
        // Check SMS balance
        const result = await smsService.getBalance();
        
        if (result.success) {
          return res.json({
            success: true,
            balance: result.data,
            message: result.message
          });
        } else {
          return res.status(500).json({ 
            error: result.message,
            details: result.error
          });
        }
      }

      if (action === "groups") {
        // Get unique groups/jumuiyas
        const groups = await Zaka.distinct('group');
        return res.json({
          success: true,
          groups: groups.filter(g => g && g.trim() !== '').sort()
        });
      }

      if (action === "stats") {
        // Get SMS statistics
        const totalZakas = await Zaka.countDocuments();
        const zakaWithPhone = await Zaka.countDocuments({ 
          mobileNumber: { $exists: true, $ne: null, $ne: '' } 
        });
        
        return res.json({
          success: true,
          stats: {
            totalZakas,
            zakaWithPhone,
            deliveryRate: totalZakas > 0 ? ((zakaWithPhone / totalZakas) * 100).toFixed(2) : 0
          }
        });
      }

      if (action === "payment_filter") {
        // Get recipients filtered by payment status
        const { month, year, status } = req.query;
        
        if (!month || !year || !status) {
          return res.status(400).json({ 
            error: "Required parameters: month, year, status (paid/unpaid)" 
          });
        }

        const yearInt = parseInt(year);
        
        // Get all zaka members with phone numbers
        const allZakas = await Zaka.find({ 
          mobileNumber: { $exists: true, $ne: null, $ne: '' } 
        });
        
        // Get payments for the specified month/year
        const payments = await ZakaPayment.find({
          month,
          year: yearInt
        });
        
        const paidZakaNumbers = new Set(payments.map(p => p.zakaNumber));
        
        let filteredZakas;
        if (status === 'paid') {
          filteredZakas = allZakas.filter(z => paidZakaNumbers.has(z.zakaNumber));
        } else if (status === 'unpaid') {
          filteredZakas = allZakas.filter(z => !paidZakaNumbers.has(z.zakaNumber));
        } else {
          filteredZakas = allZakas;
        }
        
        return res.json({
          success: true,
          recipients: filteredZakas.map(z => ({
            zakaNumber: z.zakaNumber,
            fullName: z.fullName,
            mobileNumber: z.mobileNumber,
            group: z.group
          })),
          count: filteredZakas.length,
          total: allZakas.length,
          paidCount: paidZakaNumbers.size,
          unpaidCount: allZakas.length - paidZakaNumbers.size
        });
      }

      return res.status(400).json({ error: "Invalid action specified" });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("SMS API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
