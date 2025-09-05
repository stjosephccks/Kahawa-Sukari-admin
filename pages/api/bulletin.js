import { Bulletin } from "@/models/Bulletin";
import { mongooseConnect } from "../../lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";
import { requirePermissions } from "@/lib/apiPermissions";

export default async function handle(req, res) {
    const { method } = req;
    await mongooseConnect();
    await isAdminRequest(req, res)
    if (method === 'GET') {
        if (req.query?.id) {
            res.json(await Bulletin.findOne({ _id: req.query.id }))
        }
        else {
            // Return most recent first
            res.json(await Bulletin.find().sort({ createdAt: -1 }))
        }
    }

    if (method === 'POST') {
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
            author: author && typeof author === 'object' ? author : undefined
        });

        res.json(BulletinDocument)


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

        res.json(result);
        return;
    }

    if (method === 'DELETE') {
       
        if (req.query?.id) {
            await Bulletin.deleteOne({ _id: req.query?.id })
            res.json(true)
        }
    }


}