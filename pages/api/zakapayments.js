// pages/api/zakapayments.js
import { getServerSession } from "next-auth";
import { ZakaPayment } from "@/models/ZakaPayment";
import { Zaka } from "@/models/Zaka";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";
import { ROLES } from "@/models/Admin";

async function hasPermission(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  
  // Check if user has admin role (super_admin or editor)
  const userRole = session.user.role;
  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.EDITOR) {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return false;
  }
  
  return true;
}

export default async function handle(req, res) {
  const { method } = req;
  
  try {
    await mongooseConnect();

    if (method === "GET") {
      if (req.query?.id) {
        const payment = await ZakaPayment.findById(req.query.id).populate('zakaMember');
        return res.json(payment || { error: "Payment record not found" });
      } else {
        // Support pagination, search, and filtering
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search || '';
        const month = req.query.month || '';
        const year = req.query.year || '';
        const zakaNumber = req.query.zakaNumber || '';
        
        let query = {};
        
        // Search by zaka number, member name, or phone number (via populate)
        if (search) {
          const zakas = await Zaka.find({
            $or: [
              { fullName: { $regex: search, $options: 'i' } },
              { zakaNumber: { $regex: search, $options: 'i' } },
              { mobileNumber: { $regex: search, $options: 'i' } },
              { mobileNumber2: { $regex: search, $options: 'i' } }
            ]
          }).select('_id');
          
          const zakaIds = zakas.map(z => z._id);
          query.zakaMember = { $in: zakaIds };
        }
        
        // Filter by month
        if (month) {
          query.month = month;
        }
        
        // Filter by year
        if (year) {
          query.year = parseInt(year);
        }
        
        // Filter by zaka number
        if (zakaNumber) {
          query.zakaNumber = zakaNumber;
        }
        
        const total = await ZakaPayment.countDocuments(query);
        const payments = await ZakaPayment.find(query)
          .populate('zakaMember')
          .sort({ paymentDate: -1 })
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
    }

    // Check permissions for write operations
    const isAuthorized = await hasPermission(req, res);
    if (!isAuthorized) return;

    if (method === "POST") {
      const { zakaNumber, month, year, notes } = req.body;

      // Validate required fields
      if (!zakaNumber || !month || !year) {
        return res.status(400).json({
          error: "Required fields: zakaNumber, month, year"
        });
      }

      // Find the zaka member
      const zakaMember = await Zaka.findOne({ zakaNumber });
      if (!zakaMember) {
        return res.status(404).json({
          error: "Zaka member not found with this zakaNumber"
        });
      }

      const paymentDoc = await ZakaPayment.create({
        zakaNumber: zakaNumber.trim(),
        zakaMember: zakaMember._id,
        month,
        year: parseInt(year),
        notes: notes ? notes.trim() : '',
        recordedBy: req.session?.user?.name || 'Admin'
      });

      // Populate the zakaMember before returning
      await paymentDoc.populate('zakaMember');

      return res.json(paymentDoc);
    }

    if (method === "PUT") {
      const { _id, zakaNumber, month, year, notes } = req.body;

      if (!_id) {
        return res.status(400).json({ error: "ID is required for update" });
      }

      // Check if payment exists
      const existingPayment = await ZakaPayment.findById(_id);
      if (!existingPayment) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      // If zakaNumber changed, update zakaMember reference
      if (zakaNumber && zakaNumber !== existingPayment.zakaNumber) {
        const zakaMember = await Zaka.findOne({ zakaNumber });
        if (!zakaMember) {
          return res.status(404).json({
            error: "Zaka member not found with this zakaNumber"
          });
        }
        existingPayment.zakaMember = zakaMember._id;
      }

      const updateData = {};
      if (zakaNumber) updateData.zakaNumber = zakaNumber.trim();
      if (month) updateData.month = month;
      if (year) updateData.year = parseInt(year);
      if (notes !== undefined) updateData.notes = notes ? notes.trim() : '';

      const paymentDoc = await ZakaPayment.findByIdAndUpdate(
        _id,
        updateData,
        { new: true, runValidators: true }
      );

      await paymentDoc.populate('zakaMember');

      return res.json(paymentDoc);
    }

    if (method === "DELETE") {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const paymentDoc = await ZakaPayment.findByIdAndDelete(id);
      
      if (!paymentDoc) {
        return res.status(404).json({ error: "Payment record not found" });
      }
      
      return res.json({ message: "Payment record deleted successfully", deleted: paymentDoc });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("ZakaPayment API Error:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: "Payment already recorded for this member, month, and year" 
      });
    }
    
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
