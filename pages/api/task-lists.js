import { mongooseConnect } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { AdminEmail } from "@/models/Admin";
import { TaskList } from "@/models/TaskList";

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
                const taskLists = await TaskList.find({ employee: employeeId }).sort({ highlightDate: -1 });
                return res.json({ taskLists });
            }
            const taskLists = await TaskList.find().sort({ highlightDate: -1 });
            return res.json({ taskLists });
        } else {
            const taskLists = await TaskList.find({ employee: currentUser._id }).sort({ highlightDate: -1 });
            return res.json({ taskLists });
        }
    }

    if (method === 'POST') {
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admin can create task lists' });
        }

        const { employee, highlightDate, importantDates, tasks } = req.body;

        if (!employee || !highlightDate) {
            return res.status(400).json({ error: 'Employee and highlight date are required' });
        }

        const employeeDoc = await AdminEmail.findById(employee);
        if (!employeeDoc) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const existingTaskList = await TaskList.findOne({
            employee,
            highlightDate: new Date(highlightDate)
        });

        if (existingTaskList) {
            return res.status(400).json({ error: 'Task list already exists for this employee and date' });
        }

        const taskList = await TaskList.create({
            employee,
            employeeName: employeeDoc.name,
            employeeEmail: employeeDoc.email,
            highlightDate,
            importantDates: importantDates || [],
            tasks: tasks || [],
            createdBy: currentUser._id,
            createdByName: currentUser.name
        });

        return res.json(taskList);
    }

    if (method === 'PUT') {
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admin can update task lists' });
        }

        const { _id, highlightDate, importantDates, tasks } = req.body;

        if (!_id) {
            return res.status(400).json({ error: 'Task list ID is required' });
        }

        const taskList = await TaskList.findByIdAndUpdate(
            _id,
            {
                highlightDate,
                importantDates,
                tasks
            },
            { new: true }
        );

        if (!taskList) {
            return res.status(404).json({ error: 'Task list not found' });
        }

        return res.json(taskList);
    }

    if (method === 'DELETE') {
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super admin can delete task lists' });
        }

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Task list ID is required' });
        }

        const taskList = await TaskList.findByIdAndDelete(id);

        if (!taskList) {
            return res.status(404).json({ error: 'Task list not found' });
        }

        return res.json({ message: 'Task list deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
