const { mongooseConnect } = require('@/lib/mongoose');
const { SmsLog } = require('@/models/SmsLog');
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
      const status = req.query.status || '';
      const templateType = req.query.templateType || '';
      const zakaNumber = req.query.zakaNumber || '';

      let query = {};
      if (status) {
        query.status = status;
      }
      if (templateType) {
        query.templateType = templateType;
      }
      if (zakaNumber) {
        query.zakaNumber = zakaNumber;
      }

      const total = await SmsLog.countDocuments(query);
      const logs = await SmsLog.find(query)
        .populate('paymentId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return res.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (method === "DELETE") {
      const isAuthorized = await hasPermission(req, res);
      if (!isAuthorized) return;

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const log = await SmsLog.findByIdAndDelete(id);

      if (!log) {
        return res.status(404).json({ error: "SMS log not found" });
      }

      return res.json({ message: "SMS log deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("SMS Logs API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
