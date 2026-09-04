import { mongooseConnect } from '@/lib/mongoose';
import { UnmatchedMpesaPayment } from '@/models/UnmatchedMpesaPayment';
import { Zaka } from '@/models/Zaka';
import { ZakaPayment } from '@/models/ZakaPayment';
import { requireAdmin } from '@/lib/auth';

export default async function handle(req, res) {
  const { method } = req;

  try {
    await mongooseConnect();

    // All methods require authentication
    const user = await requireAdmin(req, res);
    if (!user) return; // requireAdmin already sent the 401/403 response

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
        // Use relative path — @/ alias does not work with CommonJS require()
        const mpesaService = require('../../lib/mpesaService');
        // Pass msisdn as the mpesaPhone so it uses the number that actually transacted
        await mpesaService.sendPaymentConfirmation(
          zakaMember,
          payment,
          assignedMonth,
          parseInt(assignedYear),
          unmatchedPayment.msisdn  // the M-Pesa sender's phone
        );
        console.log(`[SMS] Sent confirmation for manually processed payment: zakaNumber=${zakaMember.zakaNumber}`);
      } catch (smsError) {
        console.error('Error sending SMS for manually processed payment:', smsError);
      }

      return res.json({
        message: "Payment processed successfully",
        payment,
        unmatchedPayment
      });
    }

    if (method === "PUT") {
      // Resend SMS for an already-processed unmatched payment
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }

      const unmatchedPayment = await UnmatchedMpesaPayment.findById(id);
      if (!unmatchedPayment) {
        return res.status(404).json({ error: "Unmatched payment not found" });
      }
      if (!unmatchedPayment.manuallyProcessed || !unmatchedPayment.assignedZakaNumber) {
        return res.status(400).json({ error: "Payment has not been processed yet — assign it first" });
      }

      const zakaMember = await Zaka.findOne({ zakaNumber: unmatchedPayment.assignedZakaNumber });
      if (!zakaMember) {
        return res.status(404).json({ error: "Zaka member not found" });
      }

      // Look up the ZakaPayment that was created during manual processing
      const zakaPayment = await ZakaPayment.findOne({
        mpesaReceipt: unmatchedPayment.transID
      });
      if (!zakaPayment) {
        return res.status(404).json({ error: "ZakaPayment record not found for this transaction" });
      }

      try {
        const mpesaService = require('../../lib/mpesaService');
        await mpesaService.sendPaymentConfirmation(
          zakaMember,
          zakaPayment,
          unmatchedPayment.assignedMonth,
          unmatchedPayment.assignedYear,
          unmatchedPayment.msisdn
        );
        return res.json({ message: "SMS sent successfully" });
      } catch (smsError) {
        console.error('Error resending SMS:', smsError);
        return res.status(500).json({ error: "Failed to send SMS", details: smsError.message });
      }
    }
    if (method === "DELETE") {
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
