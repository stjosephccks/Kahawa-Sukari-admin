import { Bulletin } from "@/models/Bulletin";
import { mongooseConnect } from "../../lib/mongoose";
import { requireAdmin } from "../../lib/auth";

export default async function handle(req, res) {
    const { method } = req;
    
    try {
        await mongooseConnect();
        
        // Use the new robust authentication helper
        const user = await requireAdmin(req, res);
        if (!user) return; // Response already sent by requireAdmin

        console.log(`[API Bulletin] ${method} request from ${user.email} (Role: ${user.role})`);

        if (method === 'GET') {
            if (req.query?.id) {
                const bulletin = await Bulletin.findOne({ _id: req.query.id });
                return res.json(bulletin);
            } else {
                // Return most recent first
                const bulletins = await Bulletin.find().sort({ createdAt: -1 });
                return res.json(bulletins);
            }
        }

        if (method === 'POST') {
            console.log(`[API Bulletin] Attempting to CREATE bulletin. Payload:`, JSON.stringify(req.body, null, 2));
            
            // Capture all supported fields from the model and form
            const { 
                title, 
                content, 
                description, 
                excerpt,
                featuredImage,
                images,
                tags,
                featured,
                sections,
                published,
                author
            } = req.body;

            if (!title || !content) {
                return res.status(400).json({ error: 'Title and content are required.' });
            }

            // Create bulletin with current user as default author if not provided
            const BulletinDocument = await Bulletin.create({
                title,
                content,
                description,
                excerpt,
                featuredImage,
                images: Array.isArray(images) ? images : [],
                tags: Array.isArray(tags) ? tags : [],
                featured: Boolean(featured),
                sections: Array.isArray(sections) ? sections : [],
                published: Boolean(published),
                author: author && typeof author === 'object' ? author : {
                    name: user.name || 'Admin',
                    email: user.email
                }
            });

            console.log(`[API Bulletin] Successfully created bulletin: ${BulletinDocument._id}`);
            return res.json(BulletinDocument);
        }

        if (method === 'PUT') {
            const { 
                title, 
                content, 
                description, 
                excerpt,
                featuredImage,
                images, 
                tags,
                featured,
                sections, 
                published, 
                author,
                _id 
            } = req.body;

            if (!_id) {
                return res.status(400).json({ error: 'Bulletin _id is required for updates.' });
            }

            console.log(`[API Bulletin] Attempting to UPDATE bulletin ${_id}`);

            const updateData = {};
            if (title !== undefined) updateData.title = title;
            if (content !== undefined) updateData.content = content;
            if (description !== undefined) updateData.description = description;
            if (excerpt !== undefined) updateData.excerpt = excerpt;
            if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
            if (images !== undefined) updateData.images = Array.isArray(images) ? images : [];
            if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
            if (featured !== undefined) updateData.featured = Boolean(featured);
            if (sections !== undefined) updateData.sections = Array.isArray(sections) ? sections : [];
            if (published !== undefined) updateData.published = Boolean(published);
            if (author !== undefined) updateData.author = author && typeof author === 'object' ? author : undefined;

            const result = await Bulletin.findOneAndUpdate(
                { _id },
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!result) {
                return res.status(404).json({ error: 'Bulletin not found' });
            }

            console.log(`[API Bulletin] Successfully updated bulletin ${_id}`);
            return res.json(result);
        }

        if (method === 'DELETE') {
            if (req.query?.id) {
                await Bulletin.deleteOne({ _id: req.query?.id });
                console.log(`[API Bulletin] Successfully deleted bulletin ${req.query.id}`);
                return res.json(true);
            } else {
                return res.status(400).json({ error: 'ID is required for deletion' });
            }
        }

        // If no method matches
        return res.status(405).json({ error: `Method ${method} not allowed` });

    } catch (error) {
        console.error('Bulletin API Error:', error);
        
        // Handle MongoDB validation errors specifically
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: Object.values(error.errors).map(e => e.message) 
            });
        }

        // Handle duplicate key errors (slub or title)
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'A bulletin with this title already exists.' 
            });
        }

        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}