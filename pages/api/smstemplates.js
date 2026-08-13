// pages/api/smstemplates.js
import { getServerSession } from "next-auth";
import { SMSTemplate } from "@/models/SMSTemplate";
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
        const template = await SMSTemplate.findById(req.query.id);
        return res.json(template || { error: "Template not found" });
      } else {
        // Support pagination and filtering
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const category = req.query.category || '';
        
        let query = {};
        if (category) {
          query.category = category;
        }
        
        const total = await SMSTemplate.countDocuments(query);
        const templates = await SMSTemplate.find(query)
          .sort({ isDefault: -1, createdAt: -1 })
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
      const { name, content, category, description, isDefault } = req.body;
      
      // Validate required fields
      if (!name || !content) {
        return res.status(400).json({ 
          error: "Required fields: name, content" 
        });
      }

      // Extract variables from content ({{variable}})
      const variableRegex = /\{\{([^}]+)\}\}/g;
      const variables = [];
      let match;
      while ((match = variableRegex.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }

      // If setting as default, remove default from other templates in same category
      if (isDefault && category) {
        await SMSTemplate.updateMany(
          { category, isDefault: true },
          { isDefault: false }
        );
      }

      const templateDoc = await SMSTemplate.create({
        name: name.trim(),
        content: content.trim(),
        category: category || 'general',
        variables,
        description: description ? description.trim() : '',
        isDefault: isDefault || false,
        createdBy: req.session?.user?.name || 'Admin'
      });
      
      return res.json(templateDoc);
    }

    if (method === "PUT") {
      const { _id, name, content, category, description, isDefault } = req.body;
      
      if (!_id) {
        return res.status(400).json({ error: "ID is required for update" });
      }

      // Check if template exists
      const existingTemplate = await SMSTemplate.findById(_id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Extract variables from content if content is provided
      let variables = existingTemplate.variables;
      if (content) {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        variables = [];
        let match;
        while ((match = variableRegex.exec(content)) !== null) {
          if (!variables.includes(match[1])) {
            variables.push(match[1]);
          }
        }
      }

      // If setting as default, remove default from other templates in same category
      if (isDefault && category) {
        await SMSTemplate.updateMany(
          { category, isDefault: true, _id: { $ne: _id } },
          { isDefault: false }
        );
      }

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (content) updateData.content = content.trim();
      if (category) updateData.category = category;
      if (description !== undefined) updateData.description = description ? description.trim() : '';
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      updateData.variables = variables;

      const templateDoc = await SMSTemplate.findByIdAndUpdate(
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

      const templateDoc = await SMSTemplate.findByIdAndDelete(id);
      
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
