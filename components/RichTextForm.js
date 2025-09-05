import { useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor.js";
import axios from "axios";
import { convertToRaw } from "draft-js";
import { useRouter } from "next/router.js";
import Spinner from "./Spinner.js";
import Image from "next/image.js";
import { useAuth } from "@/hooks/useAuth";

const BULLETIN_SECTIONS = ["YCA", "YSC", "CJPD", "MATRIMONY", "CHATECHISIS"];

export default function RichText({
    _id,
    title: existingTitle,
    images: existingImages,
    description: existingDescription,
    content: existingContent,
    sections: existingSections,
    published: existingPublished,
    excerpt: existingExcerpt,
    featuredImage: existingFeaturedImage,
    tags: existingTags,
    featured: existingFeatured,
    formType // Added to determine if sections should be shown

}) {
    const [content, setContent] = useState(existingContent || '')
    const [title, setTitle] = useState(existingTitle || '')
    const [goToBulletins, setgoToBulletins] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [images, setImages] = useState(existingImages || [])
    const [description, setDescription] = useState(existingDescription || '')
    const [excerpt, setExcerpt] = useState(existingExcerpt || '')
    const [featuredImage, setFeaturedImage] = useState(existingFeaturedImage || '')
    const [tags, setTags] = useState(existingTags || [])
    const [tagInput, setTagInput] = useState('')
    const [featured, setFeatured] = useState(Boolean(existingFeatured))
    const [loadedImages, setLoadedImages] = useState(Array(images.length).fill(false));
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sections, setSections] = useState(existingSections || []);
    const [published, setPublished] = useState(Boolean(existingPublished));
    const { canPublish } = useAuth();

    // Function to add tags
    const addTag = () => {
        const normalized = tagInput.trim().toLowerCase();
        if (normalized && !tags.map(t => t.toLowerCase()).includes(normalized)) {
            setTags([...tags, normalized]);
            setTagInput('');
        }
    };

    // Function to remove tags
    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // Handle featured image upload
    async function uploadFeaturedImage(ev) {
        const files = ev.target?.files;
        if (files?.length > 0) {
            setIsUploading(true);
            const data = new FormData();
            for (const file of files) {
                data.append('file', file);
            }
            const res = await axios.post('/api/upload', data);
            setFeaturedImage(res.data.links[0]);
            setIsUploading(false);
        }
    }

    async function saveBulletin(ev) {
        ev.preventDefault();
        setError('');

        const trimmedTitle = (title || '').trim();
        const trimmedContent = (content || '').trim();

        if (!trimmedTitle) {
            setError('Title is required.');
            return;
        }
        if (!trimmedContent) {
            setError('Content is required.');
            return;
        }

        // Normalize and de-duplicate tags
        const normalizedTags = Array.from(new Set((tags || [])
            .map(t => (t || '').trim().toLowerCase())
            .filter(Boolean)));

        const data = { 
            title: trimmedTitle, 
            content: trimmedContent, 
            description,
            excerpt,
            featuredImage,
            tags: normalizedTags,
            featured,
            images,
            published: Boolean(published),  // Directly use the published state
            sections: formType === 'bulletin' ? sections : undefined 
        };
        
        console.log('Saving bulletin with data:', data);
        
        try {
            setSubmitting(true);
            if (_id) {
                const response = await axios.put('/api/bulletin', { ...data, _id });
                console.log('Update response:', response.data);
            } else {
                const response = await axios.post('/api/bulletin', data);
                console.log('Create response:', response.data);
            }
            setgoToBulletins(true);
        } catch (error) {
            console.error('Error saving bulletin:', error);
            setError(error?.response?.data?.error || 'Failed to save bulletin.');
        } finally {
            setSubmitting(false);
        }
    }
    const router = useRouter()

    useEffect(() => {
        if (goToBulletins) {
            router.push('/bulletin')
        }
    }, [goToBulletins, router])
    const handleEditorStateChange = (htmlContent) => {
        // The enhanced RichTextEditor now passes HTML content directly
        setContent(htmlContent);
    };

    async function uploadImages(ev) {
        const files = ev.target?.files;
        if (files?.length > 0) {
            setIsUploading(true);
            const data = new FormData();
            for (const file of files) {
                data.append('file', file);

            }
            const res = await axios.post('/api/upload', data)
            const newImages = res.data.links
            setImages(oldImages =>
                [...oldImages, ...newImages]
            );
            setLoadedImages(oldLoadedImages => [...oldLoadedImages, ...Array(newImages.length).fill(false)]);
            setIsUploading(false)

            //console.log(res.data)
        }
    }


    return (
        <form onSubmit={saveBulletin} >
            {error && (
                <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
                    {error}
                </div>
            )}
            <label>Title</label>
            <input value={title} onChange={ev => setTitle(ev.target.value)} type="text" placeholder="title" />
            <label>Description</label>
            <textarea placeholder="Description" value={description} onChange={ev => setDescription(ev.target.value)} rows={5}></textarea>

            {/* Blog-like features */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt (Short Summary)</label>
                <textarea 
                    placeholder="Brief summary of the bulletin for preview..." 
                    value={excerpt} 
                    onChange={ev => setExcerpt(ev.target.value)} 
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
            </div>

            {/* Featured Image */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={uploadFeaturedImage}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {isUploading && <Spinner />}
                </div>
                {featuredImage && (
                    <div className="mt-2 relative inline-block">
                        <Image
                            width={200}
                            height={120}
                            src={featuredImage}
                            alt="Featured image"
                            className="rounded-lg object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => setFeaturedImage('')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>

            {/* Tags */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add a tag..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Featured Toggle */}
            <div className="mb-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => setFeatured(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as Featured Bulletin</span>
                </label>
            </div>

            {formType === "bulletin" && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sections</label>
                    <div className="space-y-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {BULLETIN_SECTIONS.map((section) => (
                            <label key={section} className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    checked={sections.includes(section)}
                                    onChange={() => {
                                        setSections(prevSections =>
                                            prevSections.includes(section)
                                                ? prevSections.filter(s => s !== section)
                                                : [...prevSections, section]
                                        );
                                    }}
                                />
                                <span className="ml-2 text-sm text-gray-700">{section}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <label>Cover Photo</label>


            <div className="mb-2 flex flex-wrap gap-1">


                {!!images?.length && images.map(link => (
                    <div key={link} className='h-24  bg-white p-4  shadow-sm rounded-sm border border-gray-200  '>

                        <Image
                            width={100}
                            height={150}
                            src={link}
                            alt=''
                            className="rounded-lg"
                            onError={(e) => {
                                e.target.src = link
                            }} />
                    </div>
                ))}

                {isUploading && (
                    <div className="h-24">
                        <Spinner />
                    </div>
                )}

                <label className='cursor-pointer w-24 h-24 text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                    </svg>

                    Upload
                    <input type="file" className="hidden" onChange={uploadImages} />
                </label>



            </div>
            <label>Content</label>

            <RichTextEditor onEditorStateChange={handleEditorStateChange} initialContent={existingContent} />

            {canPublish && (
            <div className="my-4 p-4 border rounded-md bg-gray-50">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        checked={published}
                        onChange={ev => setPublished(ev.target.checked)}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                        Published
                    </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                    {published 
                        ? "This bulletin will be visible to all users" 
                        : "This bulletin is saved as draft and not visible to users"
                    }
                </p>
            </div>
            )}
            <div className="flex gap-2">
                <button 
                    className="btn-primary py-2 disabled:opacity-50" 
                    type="submit"
                    disabled={isUploading || submitting}
                >
                    {_id ? 'Update' : 'Create'} Bulletin
                </button>
                
               {canPublish && (
                <button 
                    className="btn-secondary py-2 disabled:opacity-50" 
                    type="button"
                    onClick={(ev) => {
                        setPublished(false);
                        saveBulletin(ev);
                    }}
                    disabled={isUploading || submitting}
                >
                    Save as Draft
                </button>
            )}
            </div>
        </form>

    )
}