const { mongooseConnect } = require('@/lib/mongoose');
const { UnmatchedMpesaPayment } = require('@/models/UnmatchedMpesaPayment');
const { Zaka } = require('@/models/Zaka');
const { ZakaPayment } = require('@/models/ZakaPayment');
const { getServerSession } = require('next-auth');
const { authOptions } = require('./auth/[...nextauth]');

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

    if (method === "GET") {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const manuallyProcessed = req.query.manuallyProcessed || '';

      let query = {};
      if (manuallyProcessed !== '') {
        query.manuallyProcessed = manuallyProcessed === 'true';
      }

      const total = await UnmatchedMpesaPayment.countDocuments(query);
      const payments = await UnmatchedMpesaPayment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return res.json({
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (method === "POST") {
      const isAuthorized = await hasPermission(req, res);
      if (!isAuthorized) return;

      const { _id, assignedZakaNumber, assignedMonth, assignedYear } = req.body;

      if (!_id || !assignedZakaNumber || !assignedMonth || !assignedYear) {
        return res.status(400).json({
          error: "Required fields: _id, assignedZakaNumber, assignedMonth, assignedYear"
        });
      }

      // Find the unmatched payment
      const unmatchedPayment = await UnmatchedMpesaPayment.findById(_id);
      if (!unmatchedPayment) {
        return res.status(404).json({ error: "Unmatched payment not found" });
      }

      // Find the zaka member
      const zakaMember = await Zaka.findOne({ zakaNumber: assignedZakaNumber });
      if (!zakaMember) {
        return res.status(404).json({ error: "Zaka member not found" });
      }

      // Create the payment record
      const transactionDate = new Date();
      const payment = await ZakaPayment.create({
        zakaNumber: zakaMember.zakaNumber,
        zakaMember: zakaMember._id,
        month: assignedMonth,
        year: parseInt(assignedYear),
        amount: unmatchedPayment.transAmount,
        paymentMethod: 'mpesa',
        paymentDate: transactionDate,
        mpesaReceipt: unmatchedPayment.transID,
        mpesaPhoneNumber: unmatchedPayment.msisdn,
        mpesaTransactionDate: transactionDate,
        mpesaPaybillNumber: unmatchedPayment.businessShortCode,
        recordedBy: 'Manual Processing',
        notes: `Manually processed from unmatched M-Pesa payment. Original ref: ${unmatchedPayment.billRefNumber}`
      });

      // Mark as processed
      unmatchedPayment.manuallyProcessed = true;
      unmatchedPayment.processedBy = req.session?.user?.name || 'Admin';
      unmatchedPayment.processedAt = new Date();
      unmatchedPayment.assignedZakaNumber = assignedZakaNumber;
      unmatchedPayment.assignedMonth = assignedMonth;
      unmatchedPayment.assignedYear = parseInt(assignedYear);
      await unmatchedPayment.save();

      // Send SMS confirmation
      try {
        const mpesaService = require('@/lib/mpesaService');
        await mpesaService.sendPaymentConfirmation(zakaMember, payment, assignedMonth, parseInt(assignedYear));
      } catch (smsError) {
        console.error('Error sending SMS for manually processed payment:', smsError);
      }

      return res.json({
        message: "Payment processed successfully",
        payment,
        unmatchedPayment
      });
    }

    if (method === "DELETE") {
      const isAuthorized = await hasPermission(req, res);
      if (!isAuthorized) return;

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const payment = await UnmatchedMpesaPayment.findByIdAndDelete(id);

      if (!payment) {
        return res.status(404).json({ error: "Unmatched payment not found" });
      }

      return res.json({ message: "Unmatched payment deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("Unmatched M-Pesa API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
