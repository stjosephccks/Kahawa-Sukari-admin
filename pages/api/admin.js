import { AdminEmail } from "@/models/Admin"
import { mongooseConnect } from "../../lib/mongoose"

export default async function handle(req,res){
    const{method}=req
    await mongooseConnect()
    if(method==='GET'){
        if(req.query?.id){
            res.json(await AdminEmail.findOne({_id:req.query.id}))

        }else{
        res.json(await AdminEmail.find())   
       }
    }


    if(method==='POST'){
        const {name,email}= req.body
        const AdminDocument = await AdminEmail.create({
            name,email
        })
        res.json(AdminDocument)

    }  
    if(method==='PUT'){
        const {name,email,_id}= req.body
     await AdminEmail.updateOne ({_id},{name,email})
        res.json(true)
    
    
    }

        if(method==='DELETE'){
            if(req.query?.id){
            await AdminEmail.deleteOne({_id:req.query?.id})
            res.json('OK')
        }}
    
}