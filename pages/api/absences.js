import { getServerSession } from "next-auth";
import { Absence } from "@/models/Absence";
import { AdminEmail } from "@/models/Admin";
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
        const absence = await Absence.findOne({ _id: req.query.id }).populate('user');
        return res.json(absence || { error: "Absence not found" });
      } else {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const absenceType = req.query.absenceType || '';
        const month = req.query.month;
        const year = req.query.year;
        const userId = req.query.userId;
        
        let query = {};
        
        if (search) {
          query.$or = [
            { userName: { $regex: search, $options: 'i' } },
            { userEmail: { $regex: search, $options: 'i' } }
          ];
        }
        
        if (status) {
          query.status = status;
        }
        
        if (absenceType) {
          query.absenceType = absenceType;
        }
        
        if (userId) {
          query.user = userId;
        }
        
        if (month && year) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59);
          query.$or = [
            { startDate: { $gte: startDate, $lte: endDate } },
            { endDate: { $gte: startDate, $lte: endDate } },
            { 
              startDate: { $lte: startDate }, 
              endDate: { $gte: endDate } 
            }
          ];
        }
        
        const total = await Absence.countDocuments(query);
        const absences = await Absence.find(query)
          .populate('user')
          .sort({ startDate: -1 })
          .skip((page - 1) * limit)
          .limit(limit);
          
        return res.json({
          absences,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      }
    }

    const isAuthorized = await hasPermission(req, res);
    if (!isAuthorized) return;

    if (method === "POST") {
      const { user, absenceType, customTypeName, startDate, endDate, isPartialDay, startTime, endTime, reason, requestedBy, notes } = req.body;
      
      if (!user || !absenceType || !startDate || !endDate) {
        return res.status(400).json({ 
          error: "Required fields: user, absenceType, startDate, endDate" 
        });
      }

      const userDoc = await AdminEmail.findById(user);
      if (!userDoc) {
        return res.status(404).json({ error: "User not found" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      let totalHours = 0;
      if (isPartialDay && startTime && endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        totalHours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
        
        if (totalHours <= 0) {
          return res.status(400).json({ error: "End time must be after start time" });
        }
      }

      const session = await getServerSession(req, res, authOptions);
      const requestingUser = await AdminEmail.findOne({ email: session.user.email });
      const isAdminRequest = requestingUser?.role === 'super_admin';

      const absenceDoc = await Absence.create({
        user,
        userName: userDoc.name,
        userEmail: userDoc.email,
        employeeNumber: userDoc.employeeNumber || 'N/A',
        absenceType,
        customTypeName: customTypeName?.trim(),
        startDate: start,
        endDate: end,
        isPartialDay: isPartialDay || false,
        startTime: isPartialDay ? startTime : undefined,
        endTime: isPartialDay ? endTime : undefined,
        totalHours: isPartialDay ? totalHours : 0,
        reason: reason?.trim(),
        requestedBy: requestingUser._id,
        requestedByRole: isAdminRequest ? 'admin' : 'employee',
        status: 'pending',
        notes: notes?.trim()
      });
      
      return res.json(absenceDoc);
    }

    if (method === "PUT") {
      const { _id, absenceType, customTypeName, startDate, endDate, reason, status, approvedBy, rejectionReason, notes } = req.body;
      
      if (!_id) {
        return res.status(400).json({ error: "ID is required for update" });
      }

      const existingAbsence = await Absence.findById(_id);
      if (!existingAbsence) {
        return res.status(404).json({ error: "Absence not found" });
      }

      const updateData = {};
      let oldTotalDays = existingAbsence.totalDays;
      
      if (absenceType) updateData.absenceType = absenceType;
      if (customTypeName !== undefined) updateData.customTypeName = customTypeName?.trim();
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (reason !== undefined) updateData.reason = reason?.trim();
      if (status) {
        updateData.status = status;
        if (status === 'approved') {
          updateData.approvedBy = approvedBy;
          updateData.approvedAt = new Date();
        } else if (status === 'rejected') {
          updateData.rejectionReason = rejectionReason?.trim();
        }
      }
      if (notes !== undefined) updateData.notes = notes?.trim();

      const absenceDoc = await Absence.findByIdAndUpdate(
        _id, 
        updateData, 
        { new: true, runValidators: true }
      );

      if (status === 'approved' && existingAbsence.status !== 'approved') {
        await AdminEmail.findByIdAndUpdate(existingAbsence.user, {
          $inc: { totalAbsenceDays: absenceDoc.totalDays }
        });
      } else if (status === 'rejected' && existingAbsence.status === 'approved') {
        await AdminEmail.findByIdAndUpdate(existingAbsence.user, {
          $inc: { totalAbsenceDays: -oldTotalDays }
        });
      } else if (existingAbsence.status === 'approved' && (startDate || endDate)) {
        const daysDiff = absenceDoc.totalDays - oldTotalDays;
        if (daysDiff !== 0) {
          await AdminEmail.findByIdAndUpdate(existingAbsence.user, {
            $inc: { totalAbsenceDays: daysDiff }
          });
        }
      }
      
      return res.json(absenceDoc);
    }

    if (method === "DELETE") {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const session = await getServerSession(req, res, authOptions);
      const requestingUser = await AdminEmail.findOne({ email: session.user.email });
      
      if (requestingUser?.role !== 'super_admin') {
        return res.status(403).json({ error: "Only super admin can delete leave requests" });
      }

      const absenceDoc = await Absence.findById(id);
      if (!absenceDoc) {
        return res.status(404).json({ error: "Absence not found" });
      }

      if (absenceDoc.status === 'approved') {
        await AdminEmail.findByIdAndUpdate(absenceDoc.user, {
          $inc: { totalAbsenceDays: -absenceDoc.totalDays }
        });
      }

      await Absence.findByIdAndDelete(id);
      
      return res.json({ message: "Absence deleted successfully", deleted: absenceDoc });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Absence API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
