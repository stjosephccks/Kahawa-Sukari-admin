// pages/api/calendar-events.js
import { CalendarEvent } from "@/models/CalendarEvent";
import { mongooseConnect } from "@/lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";

export default async function handler(req, res) {

    const { method } = req;
    await mongooseConnect();
    await isAdminRequest(req, res);
    try {
        if (method === 'GET') {
            const { month, year, group, activityType } = req.query;
            let query = {};
            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);
                query.date = { $gte: startDate, $lte: endDate };
            }
            if (group && group !== 'All') {
                query.group = group;
            }
            if (activityType && activityType !== 'All') {
                query.activityType = activityType;
            }
            const events = await CalendarEvent.find(query).sort({ date: 1 });
            return res.status(200).json(events);
        }

        if (method === 'POST') {
            const { title, date, activityType, venue, group, description } = req.body;
            const eventDoc = await CalendarEvent.create({
                title,
                date,
                activityType,
                venue,
                group,
                description
            });
            res.json(eventDoc);
        }

        if (method === 'PUT') {
            const { _id, ...updateData } = req.body;
            await CalendarEvent.updateOne({ _id }, updateData);
            res.json(true);
        }

        if (method === 'DELETE') {
            const { id } = req.query;
            if (id) {
                await CalendarEvent.deleteOne({ _id: id });
                res.json(true);
            }
        }
    }
    catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });

    }
}