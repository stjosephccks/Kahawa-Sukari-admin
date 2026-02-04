import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import multiparty from 'multiparty'
import fs from 'fs'
import mime from 'mime-types'
import { mongooseConnect } from '../../lib/mongoose';
import { requireAdmin } from '../../lib/auth';
const bucketName= 'kahawa-sukari'

export default async function handle(req, res ){
   const { method } = req;
   
   if (method !== 'POST') {
      return res.status(405).json({ error: `Method ${method} not allowed` });
   }

   try {
      await mongooseConnect();
      const user = await requireAdmin(req, res);
      if (!user) return;

      console.log(`[API Upload] POST request from ${user.email}`);

      const form = new multiparty.Form();
      const {fields,files} = await new Promise((resolve,reject)=>{
         form.parse(req, (err,fields,files)=>{
            if(err) reject(err);
            resolve({fields,files});  
         }); 
      });
            
      console.log('length: ', files.file?.length || 0);

      const client = new S3Client({
         region: 'us-east-1',
         credentials:{
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
         }
      });

      const links = [];
      if (files.file) {
         for(const file of files.file){
            const ext = file.originalFilename.split('.').pop();
            const newFilename = Date.now() + '.' + ext;
            const contentType = mime.lookup(file.path) || 'application/octet-stream';
            const acl = 'public-read';
            
            try {
               await client.send(new PutObjectCommand({
                  Bucket: bucketName,
                  Key: newFilename,
                  Body: fs.createReadStream(file.path),
                  ACL: acl,
                  ContentType: contentType
               }));
               const link = `https://${bucketName}.s3.amazonaws.com/${newFilename}`; 
               links.push(link);
            } catch (error) {
               console.error("Error uploading file to S3:", error);
            }
         }
      }
      
      return res.json({links});
   } catch (error) {
      console.error("Upload API Error:", error);
      return res.status(500).json({ error: "Internal server error", message: error.message });
   }
}

export const config={
    
    api:{bodyParser:false},};