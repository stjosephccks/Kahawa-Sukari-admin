import { mongooseConnect } from "../lib/mongoose";
import { Sunday } from "@/models/Sunday";

export default async function handle(req, res){
    const {method}=req;
    await mongooseConnect();
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
}