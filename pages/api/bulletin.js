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
        const {title,content,images,description}= req.body
       const BulletinDocument= await Bulletin.create({
            title,content,description,images
            
        })
        res.json(BulletinDocument)


    }
    if (method ==='PUT'){
        const {title,content,description, images, _id}= req.body
        await Bulletin.updateOne({_id},{ title,content,description,images})
        res.json(true)


    }
  
    if(method==='DELETE'){
        if(req.query?.id){
            await Bulletin.deleteOne({_id: req.query?.id})
            res.json(true)
        }
    }


}