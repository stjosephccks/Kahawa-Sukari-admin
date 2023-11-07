import { mongooseConnect } from "../../lib/mongoose";
import { Sunday } from "@/models/Sunday";
import { isAdminRequest } from "./auth/[...nextauth]";

export default async function handle(req, res){
    const {method}=req;
    await mongooseConnect();
    await isAdminRequest(req,res)
if(method==='GET'){
    res.json(await Sunday.find())   
   }


if(method==='POST'){
    const {sunday}= req.body
   const SundayDocument= await Sunday.create({
        sunday
        
    })
    res.json(SundayDocument)


}
if(method==='PUT'){
    const {sunday,_id}= req.body
   const SundayDocument= await Sunday.updateOne ({_id},{
        sunday
        
    })
    res.json(SundayDocument)


}
if(method==='DELETE'){
    const {_id}=req.query
    await Sunday.deleteOne({_id})
    res.json('OK')
}
} 