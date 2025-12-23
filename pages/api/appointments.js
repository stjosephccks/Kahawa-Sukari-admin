import { mongooseConnect } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { AdminEmail } from "@/models/Admin";
import { Appointment } from "@/models/Appointment";

export default async function handle(req, res) {
    await mongooseConnect();
    const { method } = req;

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentUser = await AdminEmail.findOne({ email: session.user.email });
    if (!currentUser) {
        return res.status(403).json({ error: 'User not found' });
    }

    if (method === 'GET') {
        const { employeeId } = req.query;

        if (currentUser.role === 'super_admin') {
            if (employeeId) {
                const appointments = await Appointment.find({ employee: employeeId }).sort({ date: -1 });
                return res.json({ appointments });
            }
            const appointments = await Appointment.find().sort({ date: -1 });
            return res.json({ appointments });
        } else {
            const appointments = await Appointment.find({ employee: currentUser._id }).sort({ date: -1 });
            return res.json({ appointments });
        }
    }

    if (method === 'POST') {
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admin can create appointments' });
        }

        const { employee, date, timeSlots } = req.body;

        if (!employee || !date) {
            return res.status(400).json({ error: 'Employee and date are required' });
        }

        const employeeDoc = await AdminEmail.findById(employee);
        if (!employeeDoc) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const existingAppointment = await Appointment.findOne({
            employee,
            date: new Date(date)
        });

        if (existingAppointment) {
            return res.status(400).json({ error: 'Appointment calendar already exists for this employee and date' });
        }

        const appointment = await Appointment.create({
            employee,
            employeeName: employeeDoc.name,
            employeeEmail: employeeDoc.email,
            date,
            timeSlots: timeSlots || [],
            createdBy: currentUser._id,
            createdByName: currentUser.name
        });

        return res.json(appointment);
    }

    if (method === 'PUT') {
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admin can update appointments' });
        }

        const { _id, date, timeSlots } = req.body;

        if (!_id) {
            return res.status(400).json({ error: 'Appointment ID is required' });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            _id,
            {
                date,
                timeSlots
            },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        return res.json(appointment);
    }

    if (method === 'DELETE') {
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admin can delete appointments' });
        }

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Appointment ID is required' });
        }

        const appointment = await Appointment.findByIdAndDelete(id);

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        return res.json({ message: 'Appointment deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
