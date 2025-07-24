import { Bulletin } from "@/models/Bulletin";
import { mongooseConnect } from "../../lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";

export default async function handle(req, res){
    const {method}=req;
    await mongooseConnect();
    await isAdminRequest(req,res)
    if(method==='GET'){
        if(req.query?.id){
            res.json(await Bulletin.findOne({_id:req.query.id}))
        }
        else{
            res.json(await Bulletin.find())
        }
    }

    if(method==='POST'){
        const {title,content,images,description, sections,published}= req.body; // Added sections
       const BulletinDocument= await Bulletin.create({
            title,content,description,images,sections,published:published||false // Added sections
            
        })
        res.json(BulletinDocument)


    }
    if (method ==='PUT'){
        const {title,content,description, images, sections,published, _id}= req.body; // Added sections
        const updateData = { title,content,description,images,published:!!published };
        if (sections !== undefined) { // Only include sections in update if it's provided
            updateData.sections = sections;
        }
        await Bulletin.updateOne({_id}, updateData);
        res.json(true)


    }
  
    if(method==='DELETE'){
        if(req.query?.id){
            await Bulletin.deleteOne({_id: req.query?.id})
            res.json(true)
        }
    }


}