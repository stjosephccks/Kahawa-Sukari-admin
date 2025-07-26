import { getServerSession } from "next-auth";
import { Announcement } from "../../models/Announcements";
import { mongooseConnect } from "../../lib/mongoose";
import { authOptions, isAdminRequest } from "./auth/[...nextauth]";
import { requirePermissions } from "@/lib/apiPermissions";

export default async function handle(req, res) {
  const { method } = req;
  await mongooseConnect();
  await isAdminRequest(req, res);

  if (method === "GET") {
    if (req.query?.id) {
      res.json(await Announcement.findOne({ _id: req.query.id }));
    } else {
      res.json(await Announcement.find());
    }
  }

  if (method === "POST") {
    
    console.log("Received POST data:", req.body); // Log the received payload
    const { title, description, sunday, massScheduleAssignments, published } = req.body;

    try {
      const AnnouncementDocument = await Announcement.create({
        title,
        description,
        sunday,
        massScheduleAssignments,
        published: Boolean(published)
      });
      res.json(AnnouncementDocument);
    } catch (error) {
      console.error("Error saving announcement:", error);
      res.status(500).json({ error: "Failed to save announcement." });
    }
  }

  if (method === "PUT") {
    
    const { title, description, sunday, massScheduleAssignments, published, _id } =
      req.body;
    await Announcement.updateOne(
      { _id },
      {
        title,
        description,
        sunday,
        massScheduleAssignments,
        published: Boolean(published)
      }
    );
    res.json(true)
  }

  if (method === "DELETE") {
    if (req.query?.id) {
      await Announcement.deleteOne({ _id: req.query?.id });
      res.json(true);
    }
  }
}
