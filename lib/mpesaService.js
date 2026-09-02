const axios = require('axios');

class MpesaService {
  constructor() {
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    this.baseUrl = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    // Parish credentials
    this.parish = {
      consumerKey: process.env.MPESA_PARISH_CONSUMER_KEY,
      consumerSecret: process.env.MPESA_PARISH_CONSUMER_SECRET,
      passkey: process.env.MPESA_PARISH_PASSKEY,
      paybill: process.env.MPESA_PARISH_PAYBILL
    };

    // Outstation credentials
    this.outstation = {
      consumerKey: process.env.MPESA_OUTSTATION_CONSUMER_KEY,
      consumerSecret: process.env.MPESA_OUTSTATION_CONSUMER_SECRET,
      passkey: process.env.MPESA_OUTSTATION_PASSKEY,
      paybill: process.env.MPESA_OUTSTATION_PAYBILL
    };

    // Token cache for each paybill
    this.tokens = {
      parish: { token: null, expiry: null },
      outstation: { token: null, expiry: null }
    };
  }

  /**
   * Get OAuth access token from Safaricom for specific paybill
   */
  async getAccessToken(paybillType = 'parish') {
    const credentials = paybillType === 'parish' ? this.parish : this.outstation;
    const tokenCache = this.tokens[paybillType];

    // Check if token is still valid
    if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
      return tokenCache.token;
    }

    try {
      const auth = Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64');
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`
          }
        }
      );

      tokenCache.token = response.data.access_token;
      // Token expires in 1 hour, set expiry to 55 minutes for safety
      tokenCache.expiry = Date.now() + (55 * 60 * 1000);

      return tokenCache.token;
    } catch (error) {
      console.error(`Error getting M-Pesa access token for ${paybillType}:`, error);
      throw new Error(`Failed to get M-Pesa access token for ${paybillType}`);
    }
  }

  /**
   * Register C2B URLs for payment callbacks
   * Can register both parish and outstation paybills with their respective credentials
   */
  async registerC2BUrls(validationUrl, confirmationUrl) {
    const results = [];
    const paybills = [];

    // Add parish paybill
    if (this.parish.paybill) {
      paybills.push({ name: 'Parish', type: 'parish', shortcode: this.parish.paybill });
    }

    // Add outstation paybill if different
    if (this.outstation.paybill && this.outstation.paybill !== this.parish.paybill) {
      paybills.push({ name: 'Outstation', type: 'outstation', shortcode: this.outstation.paybill });
    }

    for (const paybill of paybills) {
      try {
        const token = await this.getAccessToken(paybill.type);
        const response = await axios.post(
          `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
          {
            ShortCode: paybill.shortcode,
            ResponseType: 'Completed',
            ConfirmationURL: confirmationUrl,
            ValidationURL: validationUrl
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        results.push({
          paybill: paybill.name,
          shortcode: paybill.shortcode,
          success: true,
          data: response.data
        });
      } catch (error) {
        console.error(`Error registering C2B URLs for ${paybill.name}:`, error);
        results.push({
          paybill: paybill.name,
          shortcode: paybill.shortcode,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Validate C2B payment (called by Safaricom before payment is processed)
   */
  validateC2BPayment(paymentData) {
    // Always return success to accept all payments
    // Validation logic can be added here if needed
    return {
      ResponseCode: '00000000',
      ResponseDesc: 'Success'
    };
  }

  /**
   * Process C2B payment confirmation (called by Safaricom after payment is successful)
   * Handles payments from both parish and outstation paybills
   */
  async processC2BConfirmation(paymentData) {
    try {
      const {
        TransID,
        TransAmount,
        BillRefNumber,
        MSISDN,
        TransTime,
        BusinessShortCode
      } = paymentData;

      // Determine which paybill received the payment
      const paybillSource = BusinessShortCode === this.parish.paybill ? 'Parish' :
                           BusinessShortCode === this.outstation.paybill ? 'Outstation' : 'Unknown';

      // Normalize phone number
      const phoneNumber = this.normalizePhoneNumber(MSISDN);

      // Try to match by zaka number first
      let zakaMember = null;
      let matchedBy = null;

      if (BillRefNumber && BillRefNumber.trim()) {
        // Try to match by zaka number
        const Zaka = require('../models/Zaka').Zaka;
        zakaMember = await Zaka.findOne({ zakaNumber: BillRefNumber.trim() });
        if (zakaMember) {
          matchedBy = 'zakaNumber';
        }
      }

      // If not matched by zaka number, try by phone number
      if (!zakaMember) {
        const Zaka = require('../models/Zaka').Zaka;
        zakaMember = await Zaka.findOne({
          $or: [
            { mobileNumber: phoneNumber },
            { mobileNumber2: phoneNumber }
          ]
        });
        if (zakaMember) {
          matchedBy = 'phoneNumber';
        }
      }

      if (!zakaMember) {
        console.log(`No zaka member found for payment: TransID=${TransID}, Phone=${phoneNumber}, Ref=${BillRefNumber}, Paybill=${paybillSource}`);
        return {
          ResultCode: 1,
          ResultDesc: 'No matching zaka member found'
        };
      }

      // Determine month and year
      const transactionDate = this.parseMpesaDate(TransTime);
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();

      // Create payment record
      const ZakaPayment = require('../models/ZakaPayment').ZakaPayment;
      const payment = await ZakaPayment.create({
        zakaNumber: zakaMember.zakaNumber,
        zakaMember: zakaMember._id,
        month: currentMonth,
        year: currentYear,
        amount: parseFloat(TransAmount),
        paymentMethod: 'mpesa',
        paymentDate: transactionDate,
        mpesaReceipt: TransID,
        mpesaPhoneNumber: phoneNumber,
        mpesaTransactionDate: transactionDate,
        mpesaPaybillNumber: BusinessShortCode,
        recordedBy: 'M-Pesa System',
        notes: `Matched by ${matchedBy}, Paybill: ${paybillSource}`
      });

      // Send SMS confirmation
      await this.sendPaymentConfirmation(zakaMember, payment, currentMonth, currentYear);

      return {
        ResultCode: 0,
        ResultDesc: 'Payment processed successfully'
      };
    } catch (error) {
      console.error('Error processing C2B confirmation:', error);
      return {
        ResultCode: 1,
        ResultDesc: 'Error processing payment'
      };
    }
  }

  /**
   * Normalize phone number to standard format
   */
  normalizePhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7')) {
      cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  }

  /**
   * Parse M-Pesa date format (YYYYMMDDHHmmss)
   */
  parseMpesaDate(mpesaDate) {
    const year = mpesaDate.substring(0, 4);
    const month = mpesaDate.substring(4, 6);
    const day = mpesaDate.substring(6, 8);
    const hour = mpesaDate.substring(8, 10);
    const minute = mpesaDate.substring(10, 12);
    const second = mpesaDate.substring(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  /**
   * Send SMS confirmation for successful payment
   */
  async sendPaymentConfirmation(zakaMember, payment, month, year) {
    const SmsLog = require('../models/SmsLog').SmsLog;
    const ZakaPayment = require('../models/ZakaPayment').ZakaPayment;

    try {
      const SMSService = require('./smsService');
      const smsService = new SMSService();

      // Get M-Pesa confirmation template
      const SmsTemplate = require('../models/SmsTemplate').SmsTemplate;
      const template = await SmsTemplate.findOne({
        type: 'mpesa_confirmation',
        isActive: true
      });

      let message;
      if (template) {
        // Replace variables in template
        const variables = {
          fullName: zakaMember.fullName,
          zakaNumber: zakaMember.zakaNumber,
          month: month,
          year: year,
          amount: payment.amount,
          receipt: payment.mpesaReceipt,
          paybill: payment.mpesaPaybillNumber
        };
        message = this.replaceTemplateVariables(template.template, variables);
      } else {
        // Default message if no template found
        message = `Thank you ${zakaMember.fullName}! We have received your zaka payment for ${month} ${year}. Your zaka number is ${zakaMember.zakaNumber}. Payment confirmed via M-Pesa. God bless you!`;
      }

      // Log SMS attempt
      const smsLog = await SmsLog.create({
        recipient: zakaMember.mobileNumber,
        recipientName: zakaMember.fullName,
        zakaNumber: zakaMember.zakaNumber,
        message: message,
        templateType: 'mpesa_confirmation',
        status: 'pending',
        paymentId: payment._id
      });

      // Send SMS
      const result = await smsService.sendSMS(zakaMember.mobileNumber, message);

      // Update SMS log
      smsLog.status = result.success ? 'sent' : 'failed';
      smsLog.apiResponse = result.data;
      smsLog.error = result.error || null;
      smsLog.sentAt = new Date();
      await smsLog.save();

      // Update payment record
      await ZakaPayment.findByIdAndUpdate(payment._id, {
        smsSent: result.success,
        smsSentAt: new Date(),
        smsStatus: result.success ? 'sent' : 'failed',
        smsError: result.error || null
      });

    } catch (error) {
      console.error('Error sending SMS confirmation:', error);

      // Log failed SMS attempt
      try {
        await SmsLog.create({
          recipient: zakaMember.mobileNumber,
          recipientName: zakaMember.fullName,
          zakaNumber: zakaMember.zakaNumber,
          message: 'Failed to generate/send SMS',
          templateType: 'mpesa_confirmation',
          status: 'failed',
          paymentId: payment._id,
          error: error.message
        });

        // Update payment record with failure
        await ZakaPayment.findByIdAndUpdate(payment._id, {
          smsSent: false,
          smsStatus: 'failed',
          smsError: error.message
        });
      } catch (logError) {
        console.error('Error logging SMS failure:', logError);
      }
    }
  }

  /**
   * Replace variables in template with actual values
   */
  replaceTemplateVariables(template, variables) {
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return message;
  }
}

module.exports = new MpesaService();
