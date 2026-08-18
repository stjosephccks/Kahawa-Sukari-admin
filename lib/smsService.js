// lib/smsService.js
// Afrinet Telecom SMS API Service

const SMS_API_BASE = 'https://bulksms.afrinettelecom.co.ke/api/services';

class SMSService {
  constructor() {
    this.partnerID = process.env.SMS_PARTNER_ID;
    this.apiKey = process.env.SMS_API_KEY;
    this.shortcode = process.env.SMS_SHORTCODE;
    this.otpUrl = process.env.SMS_OTP_URL || `${SMS_API_BASE}/sendotp`;
  }

  /**
   * Send a single SMS
   * @param {string} mobile - Phone number (format: 2547xxxxxxxx)
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} API response
   */
  async sendSingleSMS(mobile, message) {
    try {
      const response = await fetch(`${SMS_API_BASE}/sendsms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID,
          mobile: mobile,
          message: message,
          shortcode: this.shortcode,
          pass_type: 'plain'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send SMS');
      }

      return {
        success: true,
        data,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      console.error('Single SMS Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send SMS'
      };
    }
  }

  /**
   * Send OTP to a phone number
   * @param {string} mobile - Phone number (format: 2547xxxxxxxx)
   * @param {string} otp - OTP code to send
   * @returns {Promise<Object>} API response
   */
  async sendOTP(mobile, otp) {
    try {
      const normalizedMobile = this.normalizePhoneNumber(mobile);
      
      const response = await fetch(this.otpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID,
          mobile: normalizedMobile,
          otp: otp
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return {
        success: true,
        data,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('OTP Sending Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send OTP'
      };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   * @param {Array} recipients - Array of objects with mobile and message
   * @returns {Promise<Object>} API response
   */
  async sendBulkSMS(recipients) {
    try {
      const smsList = recipients.map((recipient, index) => ({
        partnerID: this.partnerID,
        apikey: this.apiKey,
        pass_type: 'plain',
        clientsmsid: Date.now() + index, // Unique ID for each SMS
        mobile: recipient.mobile,
        message: recipient.message,
        shortcode: this.shortcode
      }));

      const response = await fetch(`${SMS_API_BASE}/sendbulk/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: smsList.length,
          smslist: smsList
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send bulk SMS');
      }

      return {
        success: true,
        data,
        message: `Bulk SMS sent to ${smsList.length} recipients`,
        count: smsList.length
      };
    } catch (error) {
      console.error('Bulk SMS Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send bulk SMS'
      };
    }
  }

  /**
   * Send the same message to multiple recipients (simplified bulk)
   * @param {Array} mobileNumbers - Array of phone numbers
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} API response
   */
  async sendBulkMessage(mobileNumbers, message) {
    const recipients = mobileNumbers.map(mobile => ({
      mobile,
      message
    }));
    return this.sendBulkSMS(recipients);
  }

  /**
   * Check SMS account balance
   * @returns {Promise<Object>} Balance information
   */
  async getBalance() {
    try {
      const response = await fetch(`${SMS_API_BASE}/getbalance/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check balance');
      }

      return {
        success: true,
        data,
        message: 'Balance retrieved successfully'
      };
    } catch (error) {
      console.error('Balance Check Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to check balance'
      };
    }
  }

  /**
   * Get delivery report for a specific message
   * @param {string} messageID - Message ID from SMS response
   * @returns {Promise<Object>} Delivery status
   */
  async getDeliveryReport(messageID) {
    try {
      const response = await fetch(`${SMS_API_BASE}/getdlr/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID,
          messageID: messageID
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get delivery report');
      }

      return {
        success: true,
        data,
        message: 'Delivery report retrieved successfully'
      };
    } catch (error) {
      console.error('Delivery Report Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get delivery report'
      };
    }
  }

  /**
   * Validate phone number format
   * @param {string} mobile - Phone number to validate
   * @returns {boolean} Valid or not
   */
  validatePhoneNumber(mobile) {
    // Accept formats: 2547xxxxxxxx, 07xxxxxxxx, +2547xxxxxxxx
    // Kenyan numbers: 12 digits (254 + 9 digits) or 10 digits (07 + 8 digits)
    const cleanMobile = mobile.replace(/[\s\-\(\)]/g, '');
    const kenyanPhoneRegex = /^(\+254|254)?[7]\d{8}$/;
    return kenyanPhoneRegex.test(cleanMobile);
  }

  /**
   * Normalize phone number to 254 format
   * @param {string} mobile - Phone number to normalize
   * @returns {string} Normalized phone number
   */
  normalizePhoneNumber(mobile) {
    let normalized = mobile.replace(/[\s\-\(\)]/g, '');
    
    // Convert 07xxxxxxxx to 2547xxxxxxxx
    if (normalized.startsWith('07')) {
      normalized = '254' + normalized.substring(1);
    }
    // Convert +2547xxxxxxxx to 2547xxxxxxxx
    else if (normalized.startsWith('+254')) {
      normalized = normalized.substring(1);
    }
    
    return normalized;
  }

  /**
   * Replace variables in template with actual data
   * @param {string} template - Template with {{variable}} placeholders
   * @param {Object} data - Data object with variable values
   * @returns {string} Template with variables replaced
   */
  replaceVariables(template, data) {
    let result = template;
    
    // Replace all {{variable}} placeholders with actual values
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, data[key] || '');
    });
    
    return result;
  }

  /**
   * Prepare personalized message for each recipient
   * @param {string} template - Template with {{variable}} placeholders
   * @param {Array} recipients - Array of recipient objects with data
   * @param {Object} globalData - Global data (month, year, etc.)
   * @returns {Array} Array of personalized messages
   */
  preparePersonalizedMessages(template, recipients, globalData = {}) {
    return recipients.map(recipient => {
      const recipientData = {
        ...globalData,
        name: recipient.fullName || recipient.name || '',
        zakaNumber: recipient.zakaNumber || '',
        group: recipient.group || '',
        mobileNumber: recipient.mobile || recipient.mobileNumber || '',
        amount: recipient.amount || '',
        paymentDate: recipient.paymentDate ? new Date(recipient.paymentDate).toLocaleDateString() : ''
      };
      
      const personalizedMessage = this.replaceVariables(template, recipientData);
      
      return {
        mobile: recipient.mobile || recipient.mobileNumber,
        message: personalizedMessage,
        originalData: recipient
      };
    });
  }
}

// Export singleton instance
const smsService = new SMSService();

export default smsService;
