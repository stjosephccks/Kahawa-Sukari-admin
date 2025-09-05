const { Schema, models, model } = require("mongoose");

const BulletinSchema = new Schema({
    title: { type: String, required: true },
    slug: { 
        type: String, 
        unique: true,
        sparse: true // Allow null values but ensure uniqueness when present
    },
    content: { type: String, required: true },
    description: { type: String },
    excerpt: { type: String }, // Short summary for blog-like display
    featuredImage: { type: String }, // Main image for the bulletin
    images: { type: [String], default: [] }, // Additional images
    inlineImages: [{
        url: { type: String },
        alt: { type: String },
        caption: { type: String },
        position: { type: Number } // For ordering inline images
    }],
    sections: {
        type: [String],
        enum: ["YCA", "YSC", "CJPD", "MATRIMONY", "CHATECHISIS"],
        default: []
    },
    author: {
        name: { type: String, default: 'Admin' },
        email: { type: String }
    },
    published: {
        type: Boolean,
        default: false,
        required: true
    },
    publishedAt: { type: Date },
    readingTime: { type: Number }, // Estimated reading time in minutes
    tags: { type: [String], default: [] }, // For categorization
    views: { type: Number, default: 0 },
    featured: { type: Boolean, default: false } // For highlighting important bulletins
}, {
    timestamps: true
});

// Generate slug from title before saving
BulletinSchema.pre('save', function(next) {
    if (this.isModified('title') && !this.slug && typeof this.title === 'string') {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    
    // Set publishedAt when published status changes to true
    if (this.isModified('published') && this.published && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    
    // Calculate reading time (average 200 words per minute)
    if (this.isModified('content') && typeof this.content === 'string') {
        const trimmed = this.content.trim();
        const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
        this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    }
    
    next();
});

// Add indexes for better query performance
BulletinSchema.index({ published: 1, publishedAt: -1 });
BulletinSchema.index({ slug: 1 });
BulletinSchema.index({ sections: 1 });
BulletinSchema.index({ tags: 1 });

export const Bulletin = models.Bulletin || model('Bulletin', BulletinSchema);