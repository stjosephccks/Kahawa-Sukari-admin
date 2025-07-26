import { mongooseConnect } from "@/lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";
import { LiturgicalProgram } from "@/models/Liturgical";
import { uploadToS3 } from '@/lib/aws-config';
import { EnhancedLiturgicalParser } from '@/lib/utils/liturgicalParser';
import formidable from 'formidable';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handle(req, res) {
    const { method } = req;
    await mongooseConnect();
    await isAdminRequest(req, res);

    if (method === 'GET') {
        if (req.query?.id) {
            res.json(await LiturgicalProgram.findOne({ _id: req.query.id }));
        } else {
            const programs = await LiturgicalProgram.find().sort({ weekStartDate: -1 });
            res.json(programs);
        }
    }

    if (method === 'POST') {
        try {
            // Check if there's already a document being processed
            const existingDoc = await LiturgicalProgram.findOne({
                processingStatus: { $in: ['uploaded', 'processing'] }
            });

            if (existingDoc) {
                return res.status(400).json({
                    error: 'Another document is currently being processed. Please wait for it to complete.'
                });
            }

            const form = formidable({
                keepExtensions: true,
            });

            const [fields, files] = await form.parse(req);
            const file = files.file?.[0];
            const originalFileName = fields.originalFileName?.[0];
            const weekStartDate = fields.weekStartDate?.[0];
            const published = fields.published?.[0] === 'true';

            if (!originalFileName || !file || !weekStartDate) {
                return res.status(400).json({ 
                    error: 'File, originalFileName, and weekStartDate are required' 
                });
            }

            // Create initial document with processing status
            const documentDoc = await LiturgicalProgram.create({
                originalFileName,
                fileName: originalFileName,
                weekStartDate: new Date(weekStartDate),
                processingStatus: 'processing',
                isActive: false,
                published: published || false
            });

            try {
                // Upload to S3
                const s3Upload = await uploadToS3(file, `liturgical/${Date.now()}-${originalFileName}`);
                
                // Parse the document using the temporary file path
                const parser = new EnhancedLiturgicalParser();
                const parsedData = await parser.parseDocxFromS3(file.filepath);

                // Prepare data to save
                const dataToSave = {
                    ...parsedData,
                    processingStatus: 'parsed',
                    awsS3Key: s3Upload.key,
                    fileUrl: s3Upload.url,
                    isActive: false, // Default to inactive until manually activated
                    published: published || false
                };

                // Update the document with parsed data
                await LiturgicalProgram.updateOne(
                    { _id: documentDoc._id },
                    dataToSave
                );

                const updatedDoc = await LiturgicalProgram.findById(documentDoc._id);
                res.json(updatedDoc);
                
            } catch (error) {
                // Update document with error status if parsing fails
                await LiturgicalProgram.updateOne(
                    { _id: documentDoc._id },
                    { 
                        processingStatus: 'error',
                        error: error.message 
                    }
                );
                throw error;
            }

        } catch (error) {
            console.error('Error processing liturgical document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    if (method === 'PUT') {
        try {
            let body = '';
            
            // Handle both JSON and form-data
            if (req.headers['content-type']?.includes('application/json')) {
                for await (const chunk of req) {
                    body += chunk;
                }
                const { _id, published } = JSON.parse(body);
                
                if (!_id) {
                    return res.status(400).json({ error: 'Document ID is required' });
                }

                await LiturgicalProgram.updateOne(
                    { _id },
                    { $set: { published: !!published } }
                );
                
                res.json({ success: true });
            } else {
                // Fallback to form-data for backward compatibility
                const form = formidable({});
                const [fields] = await form.parse(req);
                
                const _id = fields._id?.[0];
                const published = fields.published?.[0] === 'true';
    
                if (!_id) {
                    return res.status(400).json({ error: 'Document ID is required' });
                }
    
                await LiturgicalProgram.updateOne(
                    { _id },
                    { $set: { published } }
                );
    
                res.json({ success: true });
            }
        } catch (error) {
            console.error('Error updating document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    if (method === 'DELETE') {
        const { id } = req.query;
        if (id) {
            // Optional: Delete from S3 before removing from database
            const doc = await LiturgicalProgram.findById(id);
            if (doc && doc.awsS3Key) {
                // Add S3 delete logic here if needed
            }
            await LiturgicalProgram.deleteOne({ _id: id });
            res.json(true);
        }
    }
}