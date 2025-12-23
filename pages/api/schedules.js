import { getServerSession } from "next-auth";
import { AdminEmail } from "@/models/Admin";
import { Schedule } from "@/models/Schedule";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";

async function hasPermission(req, res) {
  await mongooseConnect();
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  
  return true;
}

export default async function handle(req, res) {
  const { method } = req;
  
  try {
    const isAuthorized = await hasPermission(req, res);
    if (!isAuthorized) return;

    const session = await getServerSession(req, res, authOptions);
    const currentUser = await AdminEmail.findOne({ email: session.user.email });

    if (method === "GET") {
      const { employeeId, weekStartDate, scheduleId } = req.query;

      if (scheduleId) {
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
          return res.status(404).json({ error: "Schedule not found" });
        }

        if (currentUser.role !== 'super_admin' && schedule.employee.toString() !== currentUser._id.toString()) {
          return res.status(403).json({ error: "Access denied" });
        }

        return res.json(schedule);
      }

      let query = {};

      if (currentUser.role === 'super_admin') {
        if (employeeId) {
          query.employee = employeeId;
        }
      } else {
        query.employee = currentUser._id;
      }

      if (weekStartDate) {
        query.weekStartDate = new Date(weekStartDate);
      }

      const schedules = await Schedule.find(query)
        .sort({ weekStartDate: -1 })
        .limit(50);

      return res.json({ schedules });
    }

    if (method === "POST") {
      if (currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Only super admin can create schedules" });
      }

      const { employee, weekStartDate, startTime, timezone, timeSlots, importantTasks } = req.body;

      if (!employee || !weekStartDate) {
        return res.status(400).json({ error: "Employee and week start date are required" });
      }

      const employeeDoc = await AdminEmail.findById(employee);
      if (!employeeDoc) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const existingSchedule = await Schedule.findOne({
        employee,
        weekStartDate: new Date(weekStartDate)
      });

      if (existingSchedule) {
        return res.status(400).json({ error: "Schedule already exists for this employee and week" });
      }

      const schedule = await Schedule.create({
        employee,
        employeeName: employeeDoc.name,
        employeeEmail: employeeDoc.email,
        weekStartDate: new Date(weekStartDate),
        startTime: startTime || '5:00 AM',
        timezone: timezone || 'EAT',
        timeSlots: timeSlots || [],
        importantTasks: importantTasks?.trim(),
        createdBy: currentUser._id,
        createdByName: currentUser.name
      });

      return res.json(schedule);
    }

    if (method === "PUT") {
      if (currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Only super admin can update schedules" });
      }

      const { _id, startTime, timezone, timeSlots, importantTasks } = req.body;

      if (!_id) {
        return res.status(400).json({ error: "Schedule ID is required" });
      }

      const updateData = {};
      if (startTime) updateData.startTime = startTime;
      if (timezone) updateData.timezone = timezone;
      if (timeSlots) updateData.timeSlots = timeSlots;
      if (importantTasks !== undefined) updateData.importantTasks = importantTasks?.trim();

      const schedule = await Schedule.findByIdAndUpdate(_id, updateData, { 
        new: true, 
        runValidators: true 
      });

      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      return res.json(schedule);
    }

    if (method === "DELETE") {
      if (currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Only super admin can delete schedules" });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Schedule ID is required" });
      }

      const schedule = await Schedule.findByIdAndDelete(id);

      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      return res.json({ message: "Schedule deleted successfully", deleted: schedule });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("Schedules API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
}
