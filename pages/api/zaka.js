// pages/api/zaka.js
import { getServerSession } from "next-auth";
import { Zaka } from "@/models/Zaka";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";

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
      if (req.query?.id) {
        const zaka = await Zaka.findOne({ _id: req.query.id });
        return res.json(zaka || { error: "Zaka record not found" });
      } else {
        // Support pagination and search
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        let query = {};
        if (search) {
          query = {
            $or: [
              { fullName: { $regex: search, $options: 'i' } },
              { zakaNumber: { $regex: search, $options: 'i' } },
              { mobileNumber: { $regex: search, $options: 'i' } },
              { mobileNumber2: { $regex: search, $options: 'i' } }
            ]
          };
        }
        
        const total = await Zaka.countDocuments(query);
        const zakas = await Zaka.find(query)
          .sort({ createdAt: 1, zakaNumber: 1 })
          .skip((page - 1) * limit)
          .limit(limit);
          
        return res.json({
          zakas,
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
      const { zakaNumber, fullName, mobileNumber, mobileNumber2, group } = req.body;
      
      // Validate required fields
      if (!zakaNumber || !fullName || !mobileNumber) {
        return res.status(400).json({ 
          error: "All fields are required: zakaNumber, fullName, mobileNumber" 
        });
      }

      // Check if zaka number already exists
      const existingZaka = await Zaka.findOne({ zakaNumber });
      if (existingZaka) {
        return res.status(400).json({ 
          error: "Zaka number already exists" 
        });
      }

      const zakaDoc = await Zaka.create({
        zakaNumber: zakaNumber.trim(),
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        mobileNumber2: mobileNumber2 ? mobileNumber2.trim() : undefined,
        group:group.trim()
      });
      
      return res.json(zakaDoc);
    }

    if (method === "PUT") {
      const { _id, zakaNumber, fullName, mobileNumber, mobileNumber2, group } = req.body;
      
      if (!_id) {
        return res.status(400).json({ error: "ID is required for update" });
      }

      // Check if zaka number already exists (excluding current record)
      if (zakaNumber) {
        const existingZaka = await Zaka.findOne({ 
          zakaNumber, 
          _id: { $ne: _id } 
        });
        if (existingZaka) {
          return res.status(400).json({ 
            error: "Zaka number already exists" 
          });
        }
      }

      const updateData = {};
      if (zakaNumber) updateData.zakaNumber = zakaNumber.trim();
      if (fullName) updateData.fullName = fullName.trim();
      if (mobileNumber) updateData.mobileNumber = mobileNumber.trim();
      if (mobileNumber2 !== undefined) updateData.mobileNumber2 = mobileNumber2 ? mobileNumber2.trim() : undefined;
      if(group) updateData.group = group.trim();

      const zakaDoc = await Zaka.findByIdAndUpdate(
        _id, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!zakaDoc) {
        return res.status(404).json({ error: "Zaka record not found" });
      }
      
      return res.json(zakaDoc);
    }

    if (method === "DELETE") {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const zakaDoc = await Zaka.findByIdAndDelete(id);
      
      if (!zakaDoc) {
        return res.status(404).json({ error: "Zaka record not found" });
      }
      
      return res.json({ message: "Zaka record deleted successfully", deleted: zakaDoc });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Zaka API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
