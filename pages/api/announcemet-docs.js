import { mongooseConnect } from "@/lib/mongoose";
import { isAdminRequest } from "./auth/[...nextauth]";
import { AnnouncementDocument } from "@/models/AnnouncementDocument";
import ChurchDocumentParser from "@/lib/utils/documentParser";
import formidable from 'formidable';
import { uploadToS3, getFileFromS3 } from '@/lib/aws-config';
import { requirePermissions } from "@/lib/auth";

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
            res.json(await AnnouncementDocument.findOne({ _id: req.query.id }));
        } else {
            res.json(await AnnouncementDocument.find());
        }
    }

    if (method === 'POST') {
        try {
          
            const existingDoc = await AnnouncementDocument.findOne({
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
            const published = fields.published?.[0] === 'true';

            if (!originalFileName || !file) {
                return res.status(400).json({ error: 'Both file and originalFileName are required' });
            }

            // Update status to processing
            const documentDoc = await AnnouncementDocument.create({
                originalFileName,
                processingStatus: 'processing',
            });

            // Upload to S3 first
            const s3Upload = await uploadToS3(file, originalFileName);

            // Parse the document using the temporary file path
            console.log('\n[API] Starting document parsing...');
            const parsedData = await ChurchDocumentParser.parseDocx(file.filepath);
            console.log('\n[API] Parsed data:', JSON.stringify(parsedData, null, 2));

            // Ensure field names match the schema
            const dataToSave = {
                ...parsedData,
                processingStatus: 'parsed',
                awsS3Key: s3Upload.key,
                fileUrl: s3Upload.url,
                // Ensure these fields are properly named and include all required fields
                announcement: parsedData.announcements || [],
                matrimonyNotice: parsedData.matrimonyNotices || [],
                documentDate: new Date(), // Current date
                liturgicalSeason: parsedData.liturgicalSeason || '',
                massAnimation: parsedData.massAnimation || '',
                nextWeekDate: parsedData.nextWeekDate || null,
                nextWeekOccasion: parsedData.nextWeekOccasion || '',
                published: published || false  // Ensure false if published is undefined
            };

            console.log('\n[API] Data being saved to database:', JSON.stringify(dataToSave, null, 2));

            // Update the document with parsed data
            await AnnouncementDocument.updateOne(
                { _id: documentDoc._id },
                dataToSave
            );

            const updatedDoc = await AnnouncementDocument.findById(documentDoc._id);
            console.log('\n[API] Final saved document:', JSON.stringify(updatedDoc, null, 2));
            res.json(updatedDoc);
        } catch (error) {
            console.error('Error processing document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    if (method === 'PUT') {
        try {
            const form = formidable({});
            const [fields, files] = await form.parse(req);

            const _id = fields._id?.[0];
            if (!_id) {
                return res.status(400).json({ error: 'Document ID is required' });
            }

            const updateData = {
                published: fields.published?.[0] === 'true',
                liturgicalSeason: fields.liturgicalSeason?.[0] || undefined,
                massAnimation: fields.massAnimation?.[0] || undefined,
                occasion: fields.occasion?.[0] || undefined,
                nextWeekOccasion: fields.nextWeekOccasion?.[0] || undefined,
                nextWeekDate: fields.nextWeekDate?.[0] ? new Date(fields.nextWeekDate[0]) : undefined,
                documentDate: fields.documentDate?.[0] ? new Date(fields.documentDate[0]) : undefined,
                currentWeekMass: fields.currentWeekMass ? JSON.parse(fields.currentWeekMass[0]) : undefined,
                nextWeekMasses: fields.nextWeekMasses ? JSON.parse(fields.nextWeekMasses[0]) : undefined,
                announcements: fields.announcements ? JSON.parse(fields.announcements[0]) : undefined,
                matrimonyNotices: fields.matrimonyNotices ? JSON.parse(fields.matrimonyNotices[0]) : undefined,
            };

            // Remove undefined fields to prevent overwriting with undefined
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            // If a file is provided, upload to S3 and update file-related fields
            const file = files.file?.[0];
            if (file) {
                const originalFileName = fields.originalFileName?.[0] || file.originalFilename;
                const s3Upload = await uploadToS3(file, originalFileName);
                updateData.awsS3Key = s3Upload.key;
                updateData.fileUrl = s3Upload.url;
                updateData.originalFileName = originalFileName;

                // Re-parse the document if a new file is uploaded
                console.log('\n[API] Starting document parsing for update...');
                const parsedData = await ChurchDocumentParser.parseDocx(file.filepath);
                console.log('\n[API] Parsed data:', JSON.stringify(parsedData, null, 2));

                updateData.processingStatus = 'parsed';
                updateData.announcements = parsedData.announcements || updateData.announcements || [];
                updateData.matrimonyNotices = parsedData.matrimonyNotices || updateData.matrimonyNotices || [];
                updateData.liturgicalSeason = parsedData.liturgicalSeason || updateData.liturgicalSeason;
                updateData.massAnimation = parsedData.massAnimation || updateData.massAnimation;
                updateData.nextWeekDate = parsedData.nextWeekDate || updateData.nextWeekDate;
                updateData.nextWeekOccasion = parsedData.nextWeekOccasion || updateData.nextWeekOccasion;
                updateData.documentDate = parsedData.documentDate || updateData.documentDate || new Date();
            }

            await AnnouncementDocument.updateOne(
                { _id },
                { $set: updateData }
            );

            const updatedDoc = await AnnouncementDocument.findById(_id);
            res.json(updatedDoc);
        } catch (error) {
            console.error('Error updating document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    if (method === 'DELETE') {
        
        try {
            if (req.query?.id) {
                const doc = await AnnouncementDocument.findById(req.query.id);
                if (!doc) {
                    return res.status(404).json({ error: 'Document not found' });
                }

                // Here you might want to delete the file from AWS S3 if it exists
                if (doc.awsS3Key) {
                    // Add AWS S3 deletion logic here
                }

                await AnnouncementDocument.deleteOne({ _id: req.query.id });
                res.json({ success: true });
            } else {
                res.status(400).json({ error: 'No document ID provided' });
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({ error: error.message });
        }
    }
}