import { Event } from "@/models/Event";
import { mongooseConnect } from "../../lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";
import { requirePermissions } from "@/lib/apiPermissions";

export default async function handle(req, res) {

    const { method } = req;
    await mongooseConnect();
    await isAdminRequest(req, res)
    if (method === 'GET') {
        if (req.query?.id) {
            res.json(await Event.findOne({ _id: req.query.id }))
        }
        else {
            res.json(await Event.find())
        }
    }


    if (method === 'POST') {
        const { title, description, date, venue, images, published, paymentInfo, moderator, keynoteSpeaker, slug } = req.body
        const EventDocument = await Event.create({
            title, description, date, venue, images, published: Boolean(published), paymentInfo, moderator, keynoteSpeaker, slug

        })
        res.json(EventDocument)


    }
    if (method === 'PUT') {
        
        const { title, description, date, venue, images, published, _id, paymentInfo, moderator, keynoteSpeaker, slug } = req.body
        await Event.updateOne({ _id }, { title, description, date, venue, images, published: Boolean(published), paymentInfo, moderator, keynoteSpeaker, slug })
        res.json(true);
    }
    if (method === 'DELETE') {
        
        if (req.query?.id) {
            await Event.deleteOne({ _id: req.query?.id })
            res.json(true)
        }

    }
}