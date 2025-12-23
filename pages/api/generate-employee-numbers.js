import { getServerSession } from "next-auth";
import { AdminEmail, ROLES } from "@/models/Admin";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";

export default async function handle(req, res) {
  const { method } = req;
  
  try {
    await mongooseConnect();

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const admin = await AdminEmail.findOne({ email: session.user.email });
    if (!admin || admin.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden - Super Admin only" });
    }

    if (method === "POST") {
      const usersWithoutNumbers = await AdminEmail.find({ 
        $or: [
          { employeeNumber: { $exists: false } },
          { employeeNumber: null },
          { employeeNumber: '' }
        ]
      });

      let counter = await AdminEmail.countDocuments({ 
        employeeNumber: { $exists: true, $ne: null, $ne: '' } 
      });

      const updates = [];
      for (const user of usersWithoutNumbers) {
        counter++;
        const paddedNumber = String(counter).padStart(4, '0');
        const employeeNumber = `SJCCKS-${paddedNumber}`;
        
        await AdminEmail.findByIdAndUpdate(user._id, { employeeNumber });
        updates.push({ id: user._id, name: user.name, employeeNumber });
      }

      return res.json({ 
        message: `Generated employee numbers for ${updates.length} users`,
        updates 
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Generate Employee Numbers Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
