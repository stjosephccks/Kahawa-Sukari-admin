import { Event } from "@/models/Event";
import { mongooseConnect } from "../../lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";

export default async function handle(req, res){

    const {method}=req;
    await mongooseConnect();
    await isAdminRequest(req,res)
    if(method==='GET'){
        if(req.query?.id){
            res.json(await Event.findOne({_id:req.query.id}))
        }
        else{
     res.json(await Event.find())
        }   
    }


    if(method==='POST'){
        const {title,description,date,images}= req.body
       const EventDocument= await Event.create({
            title,description,date,images
            
        })
        res.json(EventDocument)


    }
    if(method==='PUT'){
        const {title, description,date,images,_id}=req.body
       await  Event.updateOne({_id},{title,description,date,images})
        res.json(true);
    }
    if(method==='DELETE'){
        if(req.query?.id){
            await Event.deleteOne({_id:req.query?.id})
            res.json(true)
        }

    }
}