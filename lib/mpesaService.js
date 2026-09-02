const axios = require('axios');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    this.baseUrl = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this.authToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token from Safaricom
   */
  async getAccessToken() {
    // Check if token is still valid
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`
          }
        }
      );

      this.authToken = response.data.access_token;
      // Token expires in 1 hour, set expiry to 55 minutes for safety
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);

      return this.authToken;
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  /**
   * Register C2B URLs for payment callbacks
   */
  async registerC2BUrls(validationUrl, confirmationUrl) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(
        `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
        {
          ShortCode: this.shortcode,
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

      return response.data;
    } catch (error) {
      console.error('Error registering C2B URLs:', error);
      throw new Error('Failed to register C2B URLs');
    }
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
        console.log(`No zaka member found for payment: TransID=${TransID}, Phone=${phoneNumber}, Ref=${BillRefNumber}`);
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
        notes: `Matched by ${matchedBy}`
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
    try {
      const SMSService = require('./smsService');
      const smsService = new SMSService();

      const message = `Thank you ${zakaMember.fullName}! We have received your zaka payment for ${month} ${year}. Your zaka number is ${zakaMember.zakaNumber}. Payment confirmed via M-Pesa. God bless you!`;

      await smsService.sendSMS(zakaMember.mobileNumber, message);
    } catch (error) {
      console.error('Error sending SMS confirmation:', error);
      // Don't throw error - payment should still be recorded even if SMS fails
    }
  }
}

module.exports = new MpesaService();
