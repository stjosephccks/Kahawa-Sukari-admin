// pages/api/admin.js
import { getServerSession } from "next-auth";
import { AdminEmail, ROLES } from "@/models/Admin";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";
import bcrypt from 'bcrypt'
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
        const admins = await AdminEmail.find({});
        return res.json(admins);
      }
    }

    // Check permissions for write operations
    const isAuthorized = await hasPermission(req, res);
    if (!isAuthorized) return; // Response already sent in hasPermission

    if (method === "POST") {
      const { name, email, password, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await AdminEmail.create({
        name,
        email,
        password: hashedPassword,
        role,
      });
      return res.status(201).json(admin);
    }

    if (method === "PUT") {
      const { _id, ...data } = req.body;
      if (!_id) {
        return res.status(400).json({ error: "Missing admin ID" });
      }
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }
      const admin = await AdminEmail.findByIdAndUpdate(_id, data, { new: true });
      return res.json(admin || { error: "Admin not found" });
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