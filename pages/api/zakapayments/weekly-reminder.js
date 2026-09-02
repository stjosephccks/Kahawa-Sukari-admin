const { mongooseConnect } = require('@/lib/mongoose');
const { ZakaPayment } = require('@/models/ZakaPayment');
const { Zaka } = require('@/models/Zaka');
const { SmsLog } = require('@/models/SmsLog');
const { SmsTemplate } = require('@/models/SmsTemplate');
const { getServerSession } = require('next-auth');
const { authOptions } = require('../auth/[...nextauth]');

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

    if (method === "POST") {
      const isAuthorized = await hasPermission(req, res);
      if (!isAuthorized) return;

      const { startDate, endDate, testOnly = false } = req.body;

      // Calculate week range if not provided
      const now = new Date();
      const startOfWeek = startDate ? new Date(startDate) : new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = endDate ? new Date(endDate) : new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6); // End of week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999);

      // Find all cash payments made in the week
      const payments = await ZakaPayment.find({
        paymentDate: {
          $gte: startOfWeek,
          $lte: endOfWeek
        },
        paymentMethod: 'cash'
      }).populate('zakaMember');

      if (payments.length === 0) {
        return res.json({
          message: "No cash payments found for this week",
          payments: [],
          sent: 0,
          failed: 0
        });
      }

      // Remove duplicates - group by zakaNumber (one SMS per member per week)
      const uniquePayments = [];
      const seenZakaNumbers = new Set();

      for (const payment of payments) {
        if (!payment.zakaMember) continue;
        if (!seenZakaNumbers.has(payment.zakaNumber)) {
          seenZakaNumbers.add(payment.zakaNumber);
          uniquePayments.push(payment);
        }
      }

      if (uniquePayments.length === 0) {
        return res.json({
          message: "No unique cash payments found for this week",
          payments: [],
          sent: 0,
          failed: 0
        });
      }

      // Get weekly reminder template
      const template = await SmsTemplate.findOne({
        type: 'weekly_reminder',
        isActive: true
      });

      if (!template) {
        return res.status(400).json({
          error: "No active weekly reminder template found. Please create one first."
        });
      }

      const SMSService = require('@/lib/smsService');
      const smsService = new SMSService();

      let sentCount = 0;
      let failedCount = 0;
      const results = [];

      for (const payment of uniquePayments) {
        if (!payment.zakaMember) continue;

        const zakaMember = payment.zakaMember;
        const variables = {
          fullName: zakaMember.fullName,
          zakaNumber: zakaMember.zakaNumber,
          month: payment.month,
          year: payment.year,
          amount: payment.amount
        };

        // Replace variables in template
        let message = template.template;
        for (const [key, value] of Object.entries(variables)) {
          message = message.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        // Log SMS attempt
        const smsLog = await SmsLog.create({
          recipient: zakaMember.mobileNumber,
          recipientName: zakaMember.fullName,
          zakaNumber: zakaMember.zakaNumber,
          message: message,
          templateType: 'weekly_reminder',
          status: 'pending',
          paymentId: payment._id
        });

        if (testOnly) {
          // Test mode - don't actually send SMS
          results.push({
            zakaNumber: zakaMember.zakaNumber,
            fullName: zakaMember.fullName,
            mobileNumber: zakaMember.mobileNumber,
            message: message,
            status: 'test'
          });
          smsLog.status = 'test';
          smsLog.error = 'Test mode - SMS not sent';
          await smsLog.save();
          continue;
        }

        // Send SMS
        try {
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

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }

          results.push({
            zakaNumber: zakaMember.zakaNumber,
            fullName: zakaMember.fullName,
            mobileNumber: zakaMember.mobileNumber,
            status: result.success ? 'sent' : 'failed',
            error: result.error
          });
        } catch (error) {
          failedCount++;
          smsLog.status = 'failed';
          smsLog.error = error.message;
          await smsLog.save();

          results.push({
            zakaNumber: zakaMember.zakaNumber,
            fullName: zakaMember.fullName,
            mobileNumber: zakaMember.mobileNumber,
            status: 'failed',
            error: error.message
          });
        }
      }

      return res.json({
        message: testOnly ? "Test mode - SMS not sent" : "Weekly reminder process completed",
        weekRange: {
          start: startOfWeek,
          end: endOfWeek
        },
        payments: payments.length,
        sent: sentCount,
        failed: failedCount,
        results
      });
    }

    if (method === "GET") {
      const isAuthorized = await hasPermission(req, res);
      if (!isAuthorized) return;

      // Get weekly payment summary
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const payments = await ZakaPayment.find({
        paymentDate: {
          $gte: startOfWeek,
          $lte: endOfWeek
        },
        paymentMethod: 'cash'
      }).populate('zakaMember');

      // Remove duplicates for summary
      const uniquePayments = [];
      const seenZakaNumbers = new Set();
      for (const payment of payments) {
        if (!payment.zakaMember) continue;
        if (!seenZakaNumbers.has(payment.zakaNumber)) {
          seenZakaNumbers.add(payment.zakaNumber);
          uniquePayments.push(payment);
        }
      }

      const smsSent = await ZakaPayment.countDocuments({
        paymentDate: {
          $gte: startOfWeek,
          $lte: endOfWeek
        },
        paymentMethod: 'cash',
        smsSent: true
      });

      const smsFailed = await ZakaPayment.countDocuments({
        paymentDate: {
          $gte: startOfWeek,
          $lte: endOfWeek
        },
        paymentMethod: 'cash',
        smsStatus: 'failed'
      });

      return res.json({
        weekRange: {
          start: startOfWeek,
          end: endOfWeek
        },
        totalPayments: payments.length,
        uniquePayments: uniquePayments.length,
        smsSent,
        smsFailed,
        smsPending: uniquePayments.length - smsSent - smsFailed
      });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("Weekly Reminder API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
