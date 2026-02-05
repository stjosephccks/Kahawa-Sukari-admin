import { Event } from "@/models/Event";
import { mongooseConnect } from "../../lib/mongoose";
import { requireAdmin } from "../../lib/auth";

export default async function handle(req, res) {
    const { method } = req;
    
    try {
        await mongooseConnect();
        
        // Use the new robust authentication helper
        const user = await requireAdmin(req, res);
        if (!user) return; // Response already sent by requireAdmin

        console.log(`[API Events] ${method} request from ${user.email} (Role: ${user.role})`);

        if (method === 'GET') {
            if (req.query?.id) {
                const event = await Event.findOne({ _id: req.query.id });
                return res.json(event);
            } else {
                const events = await Event.find().sort({ createdAt: -1 });
                return res.json(events);
            }
        }

        if (method === 'POST') {
            console.log(`[API Events] Attempting to CREATE event. Payload:`, JSON.stringify(req.body, null, 2));
            const { title, description, date, venue, images, published, paymentInfo, moderator, keynoteSpeaker, slug } = req.body;
            
            if (!title) {
                return res.status(400).json({ error: 'Title is required.' });
            }

            const EventDocument = await Event.create({
                title, description, date, venue, images, published: Boolean(published), paymentInfo, moderator, keynoteSpeaker, slug
            });

            console.log(`[API Events] Successfully created event: ${EventDocument._id}`);
            return res.json(EventDocument);
        }

        if (method === 'PUT') {
            const { title, description, date, venue, images, published, _id, paymentInfo, moderator, keynoteSpeaker, slug } = req.body;
            
            if (!_id) {
                return res.status(400).json({ error: 'Event _id is required for updates.' });
            }

            console.log(`[API Events] Attempting to UPDATE event ${_id}`);
            
            await Event.updateOne({ _id }, { 
                title, description, date, venue, images, published: Boolean(published), paymentInfo, moderator, keynoteSpeaker, slug 
            });
            
            console.log(`[API Events] Successfully updated event ${_id}`);
            return res.json(true);
        }

        if (method === 'DELETE') {
            if (req.query?.id) {
                await Event.deleteOne({ _id: req.query?.id });
                console.log(`[API Events] Successfully deleted event ${req.query.id}`);
                return res.json(true);
            } else {
                return res.status(400).json({ error: 'ID is required for deletion' });
            }
        }

        // If no method matches
        return res.status(405).json({ error: `Method ${method} not allowed` });

    } catch (error) {
        console.error('Events API Error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: Object.values(error.errors).map(e => e.message) 
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'An event with this title or slug already exists.' 
            });
        }

        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}