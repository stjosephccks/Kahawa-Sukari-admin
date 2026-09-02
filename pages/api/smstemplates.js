// pages/api/smstemplates.js
import { getServerSession } from "next-auth";
import { SmsTemplate } from "@/models/SmsTemplate";
import { authOptions } from "./auth/[...nextauth]";
import { mongooseConnect } from "@/lib/mongoose";

async function hasPermission(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handle(req, res) {
  const { method } = req;

  try {
    await mongooseConnect();

    if (method === "GET") {
      if (req.query?.id) {
        const template = await SmsTemplate.findById(req.query.id);
        return res.json(template || { error: "Template not found" });
      } else {
        // Support pagination and filtering
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const type = req.query.type || '';

        let query = {};
        if (type) {
          query.type = type;
        }

        const total = await SmsTemplate.countDocuments(query);
        const templates = await SmsTemplate.find(query)
          .sort({ isActive: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

        return res.json({
          templates,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      }
    }

    // Check permissions for write operations
    const isAuthorized = await hasPermission(req, res);
    if (!isAuthorized) return;

    if (method === "POST") {
      const { name, template, type, variables } = req.body;

      // Validate required fields
      if (!name || !template || !type) {
        return res.status(400).json({
          error: "Required fields: name, template, type"
        });
      }

      // Validate type
      const validTypes = ['mpesa_confirmation', 'weekly_reminder', 'payment_reminder', 'custom'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Extract variables from template if not provided
      let templateVariables = variables;
      if (!templateVariables) {
        const variableRegex = /\{([^}]+)\}/g;
        templateVariables = [];
        let match;
        while ((match = variableRegex.exec(template)) !== null) {
          if (!templateVariables.includes(match[1])) {
            templateVariables.push(match[1]);
          }
        }
      }

      const templateDoc = await SmsTemplate.create({
        name: name.trim(),
        template: template.trim(),
        type,
        variables: templateVariables,
        isActive: true,
        createdBy: req.session?.user?.name || 'Admin'
      });

      return res.json(templateDoc);
    }

    if (method === "PUT") {
      const { _id, name, template, type, variables, isActive } = req.body;

      if (!_id) {
        return res.status(400).json({ error: "ID is required for update" });
      }

      // Check if template exists
      const existingTemplate = await SmsTemplate.findById(_id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Extract variables from template if template is provided and variables not provided
      let templateVariables = variables;
      if (template && !variables) {
        const variableRegex = /\{([^}]+)\}/g;
        templateVariables = [];
        let match;
        while ((match = variableRegex.exec(template)) !== null) {
          if (!templateVariables.includes(match[1])) {
            templateVariables.push(match[1]);
          }
        }
      }

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (template) updateData.template = template.trim();
      if (type) updateData.type = type;
      if (templateVariables) updateData.variables = templateVariables;
      if (isActive !== undefined) updateData.isActive = isActive;

      const templateDoc = await SmsTemplate.findByIdAndUpdate(
        _id,
        updateData,
        { new: true, runValidators: true }
      );

      return res.json(templateDoc);
    }

    if (method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID is required for deletion" });
      }

      const templateDoc = await SmsTemplate.findByIdAndDelete(id);

      if (!templateDoc) {
        return res.status(404).json({ error: "Template not found" });
      }

      return res.json({ message: "Template deleted successfully", deleted: templateDoc });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("SMSTemplate API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
