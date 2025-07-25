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
        const {title,content,images,description, sections,published}= req.body; 
        console.log('Creating bulletin with published:', published); 
        // const isPublished = !(published === false || published === 'false' || published === 0 || published === '0')
       const BulletinDocument= await Bulletin.create({
            title,content,description,images,sections,published:Boolean(published)
            
        })
        console.log('Created bulletin:', BulletinDocument);
        res.json(BulletinDocument)


    }
    if (method ==='PUT'){
        const {title, content, description, images, sections, published, _id} = req.body;
        
        const updateData = { 
            title,
            content,
            description,
            images,
            published: Boolean(published)
        };
        
        if (sections !== undefined) {
            updateData.sections = sections;
        }
        
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
  
    if(method==='DELETE'){
        if(req.query?.id){
            await Bulletin.deleteOne({_id: req.query?.id})
            res.json(true)
        }
    }


}