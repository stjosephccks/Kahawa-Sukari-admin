// pages/api/admin.js
import { getServerSession } from "next-auth";
import { AdminEmail, ROLES } from "@/models/Admin";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";
import bcrypt from 'bcryptjs'
async function hasPermission(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  const admin = await AdminEmail.findOne({ email: session.user.email });
  if (!admin) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  if (admin.role !== ROLES.SUPER_ADMIN) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  
  return true;
}

export default async function handle(req, res) {
  const {method} = req;
  
  try {
    await mongooseConnect();

    if (method === "GET") {
      if(req.query?.id) {
        const admin = await AdminEmail.findOne({_id: req.query.id});
        return res.json(admin || { error: "Admin not found" });
      } else {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const role = req.query.role || '';
        
        let query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } }
          ];
        }
        if (status) {
          query.status = status;
        }
        if (role) {
          query.role = role;
        }
        
        const total = await AdminEmail.countDocuments(query);
        const admins = await AdminEmail.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);
          
        return res.json({
          employees: admins,
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
    if (!isAuthorized) return; // Response already sent in hasPermission

    if (method === "POST") {
      const { name, email, password, role, employeeNumber, mobileNumber, department, position, dateOfJoining, status } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Required fields: name, email, password" });
      }
      
      const existingUser = await AdminEmail.findOne({ 
        $or: [{ email }, { employeeNumber: employeeNumber || null }] 
      });
      if (existingUser) {
        return res.status(400).json({ 
          error: existingUser.email === email 
            ? "Email already exists" 
            : "Employee number already exists" 
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await AdminEmail.create({
        name,
        email,
        password: hashedPassword,
        role: role || ROLES.EDITOR,
        employeeNumber: employeeNumber?.trim(),
        mobileNumber: mobileNumber?.trim(),
        department: department?.trim(),
        position: position?.trim(),
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        status: status || 'active'
      });
      return res.status(201).json(admin);
    }

    if (method === "PUT") {
      const { _id, name, email, password, role, employeeNumber, mobileNumber, department, position, dateOfJoining, status } = req.body;
      if (!_id) {
        return res.status(400).json({ error: "Missing admin ID" });
      }
      
      if (email) {
        const existingUser = await AdminEmail.findOne({ 
          email, 
          _id: { $ne: _id } 
        });
        if (existingUser) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      
      if (employeeNumber) {
        const existingUser = await AdminEmail.findOne({ 
          employeeNumber, 
          _id: { $ne: _id } 
        });
        if (existingUser) {
          return res.status(400).json({ error: "Employee number already exists" });
        }
      }
      
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.trim();
      if (role) updateData.role = role;
      if (employeeNumber) updateData.employeeNumber = employeeNumber?.trim() || null;
      if (mobileNumber) updateData.mobileNumber = mobileNumber?.trim() || null;
      if (department ) updateData.department = department?.trim() || null;
      if (position ) updateData.position = position?.trim() || null;
      if (dateOfJoining) updateData.dateOfJoining = new Date(dateOfJoining);
      if (status) updateData.status = status;
      
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      console.log('Update Data:', JSON.stringify(updateData, null, 2));
      
      const admin = await AdminEmail.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true });
      
      console.log('Updated Admin:', JSON.stringify(admin, null, 2));
      
      const response = {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        employeeNumber: admin.employeeNumber,
        mobileNumber: admin.mobileNumber,
        department: admin.department,
        position: admin.position,
        dateOfJoining: admin.dateOfJoining,
        status: admin.status,
        totalAbsenceDays: admin.totalAbsenceDays,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      };
      
      return res.json(response);
    }

    if (method === "DELETE") {
      const { _id } = req.body;
      if (!_id) {
        return res.status(400).json({ error: "Missing admin ID" });
      }
      const result = await AdminEmail.findByIdAndDelete(_id);
      if (!result) {
        return res.status(404).json({ error: "Admin not found" });
      }
      return res.json({ success: true });
    }

    // Handle unsupported HTTP methods
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error("Admin API error:", error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}