import { getServerSession } from "next-auth";
import { Employee } from "@/models/Employee";
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
        const employee = await Employee.findOne({ _id: req.query.id });
        return res.json(employee || { error: "Employee not found" });
      } else {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        let query = {};
        if (search) {
          query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } }
          ];
        }
        if (status) {
          query.status = status;
        }
        
        const total = await Employee.countDocuments(query);
        const employees = await Employee.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);
          
        return res.json({
          employees,
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
      const { employeeNumber, fullName, email, mobileNumber, department, position, dateOfJoining, status } = req.body;
      
      if (!employeeNumber || !fullName || !email || !mobileNumber || !dateOfJoining) {
        return res.status(400).json({ 
          error: "Required fields: employeeNumber, fullName, email, mobileNumber, dateOfJoining" 
        });
      }

      const existingEmployee = await Employee.findOne({ 
        $or: [{ employeeNumber }, { email }] 
      });
      if (existingEmployee) {
        return res.status(400).json({ 
          error: existingEmployee.employeeNumber === employeeNumber 
            ? "Employee number already exists" 
            : "Email already exists" 
        });
      }

      const employeeDoc = await Employee.create({
        employeeNumber: employeeNumber.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        department: department?.trim(),
        position: position?.trim(),
        dateOfJoining: new Date(dateOfJoining),
        status: status || 'active'
      });
      
      return res.json(employeeDoc);
    }

    if (method === "PUT") {
      const { _id, employeeNumber, fullName, email, mobileNumber, department, position, dateOfJoining, status } = req.body;
      
      if (!_id) {
        return res.status(400).json({ error: "ID is required for update" });
      }

      if (employeeNumber) {
        const existingEmployee = await Employee.findOne({ 
          employeeNumber, 
          _id: { $ne: _id } 
        });
        if (existingEmployee) {
          return res.status(400).json({ error: "Employee number already exists" });
        }
      }

      if (email) {
        const existingEmployee = await Employee.findOne({ 
          email, 
          _id: { $ne: _id } 
        });
        if (existingEmployee) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      const updateData = {};
      if (employeeNumber) updateData.employeeNumber = employeeNumber.trim();
      if (fullName) updateData.fullName = fullName.trim();
      if (email) updateData.email = email.trim();
      if (mobileNumber) updateData.mobileNumber = mobileNumber.trim();
      if (department !== undefined) updateData.department = department?.trim();
      if (position !== undefined) updateData.position = position?.trim();
      if (dateOfJoining) updateData.dateOfJoining = new Date(dateOfJoining);
      if (status) updateData.status = status;

      const employeeDoc = await Employee.findByIdAndUpdate(
        _id, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!employeeDoc) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      return res.json(employeeDoc);
    }

    if (method === "DELETE") {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const employeeDoc = await Employee.findByIdAndDelete(id);
      
      if (!employeeDoc) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      return res.json({ message: "Employee deleted successfully", deleted: employeeDoc });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Employee API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
