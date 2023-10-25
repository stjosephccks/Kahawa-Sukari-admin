import { Announcement } from "../../models/Announcements";
import { mongooseConnect } from "../lib/mongoose";

export default async function handle(req, res){
    const {method}=req;
    await mongooseConnect();

    if(method==='GET'){
        if(req.query?.id){
            res.json(await Announcement.findOne({_id:req.query.id}))
        }
        else{
     res.json(await Announcement.find())
        }   
    }

    if(method==='POST'){
        const {title,description, sunday}= req.body
       const AnnouncementDocument= await Announcement.create({
            title,description,sunday
            
        })
        res.json(AnnouncementDocument)


    }
    if(method==='PUT'){
        const {title, description,sunday,_id}=req.body
       await  Announcement.updateOne({_id},{title,description,sunday})
        res.json(true);
    }
    if(method==='DELETE'){
        if(req.query?.id){
            await Announcement.deleteOne({_id:req.query?.id})
            res.json(true)
        }

    }

    
}