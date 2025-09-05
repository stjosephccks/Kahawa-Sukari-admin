import React, { useState, useEffect, useRef } from 'react';
import { EditorState, convertToRaw, ContentState, AtomicBlockUtils } from 'draft-js';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { FaImage } from 'react-icons/fa';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

// Dynamically import the Editor to avoid SSR issues
const Editor = dynamic(
  () => import('react-draft-wysiwyg').then(mod => mod.Editor),
  { ssr: false }
);

export default function RichTextEditor({ onEditorStateChange, initialContent }) {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [isUploading, setIsUploading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [draftToHtml, setDraftToHtml] = useState(null);
  const [htmlToDraft, setHtmlToDraft] = useState(null);

  // Initialize conversion functions and handle initial content on client side
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      const initializeEditor = async () => {
        try {
          // Import conversion functions
          const draftToHtmlModule = await import('draftjs-to-html');
          const htmlToDraftModule = await import('html-to-draftjs');
          
          setDraftToHtml(() => draftToHtmlModule.default);
          setHtmlToDraft(() => htmlToDraftModule.default);
          
          // Handle initial content if provided
          if (initialContent && htmlToDraftModule.default) {
            const contentBlock = htmlToDraftModule.default(initialContent);
            if (contentBlock) {
              const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
              setEditorState(EditorState.createWithContent(contentState));
            }
          }
        } catch (error) {
          console.error('Error initializing editor:', error);
        }
      };

      initializeEditor();
    }
  }, [initialContent]);

  const handleEditorChange = (state) => {
    setEditorState(state);
    if (draftToHtml) {
      const htmlContent = draftToHtml(convertToRaw(state.getCurrentContent()));
      onEditorStateChange(htmlContent);
    } else {
      // Fallback to raw content if conversion function not loaded yet
      onEditorStateChange(JSON.stringify(convertToRaw(state.getCurrentContent())));
    }
  };  

 
    
  // Enhanced image insertion function with focus management
  const insertImage = (imageUrl) => {
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity(
      'IMAGE',
      'IMMUTABLE',
      { src: imageUrl }
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const newEditorState = EditorState.set(editorState, {
      currentContent: contentStateWithEntity,
    });
    
    // Insert the image with a space after it
    let editorStateWithImage = AtomicBlockUtils.insertAtomicBlock(
      newEditorState,
      entityKey,
      ' ' // Space after the image
    );
    
    // Move selection after the image and focus
    const selection = editorStateWithImage.getSelection();
    const newSelection = selection.merge({
      anchorOffset: 0,
      focusOffset: 0,
      hasFocus: true,
      isBackward: false,
    });
    
    // Force the editor to maintain focus
    editorStateWithImage = EditorState.forceSelection(
      editorStateWithImage,
      newSelection
    );
    
    setEditorState(editorStateWithImage);
    
    // Update parent component with HTML content
    if (draftToHtml) {
      const htmlContent = draftToHtml(convertToRaw(editorStateWithImage.getCurrentContent()));
      onEditorStateChange(htmlContent);
    }
    
    // Ensure focus is maintained after state update
    setTimeout(() => {
      const editor = document.querySelector('.DraftEditor-root');
      if (editor) {
        editor.focus();
      }
    }, 0);
  };

  // Custom image upload function with direct insertion and focus management
  const uploadImageCallBack = (file) => {
    console.log('🖼️ uploadImageCallBack triggered with file:', file);
    
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      
      setIsUploading(true);
      
      axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(response => {
        console.log('✅ Upload successful:', response.data);
        const imageUrl = response.data.links[0];
        
        // Insert the image and maintain focus
        insertImage(imageUrl);
        
        resolve({
          data: { link: imageUrl }
        });
      })
      .catch(error => {
        console.error('❌ Image upload failed:', error);
        reject(error);
      })
      .finally(() => {
        setIsUploading(false);
      });
    });
    };

    // Link callback with logging
    const linkCallback = (link) => {
      console.log('🔗 linkCallback triggered with:', link);
      return link;
    };

    // Unlink callback with logging
    const unlinkCallback = () => {
      console.log('🔓 unlinkCallback triggered');
    };

  // Enhanced image upload handler that directly inserts images
  const handleCustomImageUpload = async (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        const file = files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const imageUrl = response.data.links[0];
        
        // Directly insert the image into the editor
        insertImage(imageUrl);
        
        alert('✅ Image uploaded and inserted successfully!');
        
      } catch (error) {
        console.error('Image upload failed:', error);
        alert('Image upload failed. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset the file input
        event.target.value = '';
      }
    }
  };
  
   
    // Log toolbar configuration before rendering
    const toolbarConfig = {
        options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'link', 'image', 'history'],
        inline: {
          options: ['bold', 'italic', 'underline', 'strikethrough', 'monospace', 'superscript', 'subscript'],
        },
        blockType: {
          inDropdown: true,
          options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Blockquote', 'Code'],
        },
        fontSize: {
          icon: <span>Size</span>,
          inDropdown: true,
          options: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96],
        },
        list: {
          inDropdown: false,
          options: ['unordered', 'ordered', 'indent', 'outdent'],
        },
        textAlign: {
          inDropdown: false,
          options: ['left', 'center', 'right', 'justify'],
        },
        link: {
          inDropdown: false,
          showOpenOptionOnHover: true,
          defaultTargetOption: '_self',
          options: ['link', 'unlink'],
          linkCallback: linkCallback,
          unlinkCallback: unlinkCallback,
        },
        image: {
          uploadCallback: uploadImageCallBack,
          uploadEnabled: true,
          urlEnabled: true,
          previewImage: false,
          inputAccept: 'image/*',
          alt: { present: false, mandatory: false },
        },
        history: {
          inDropdown: false,
          options: ['undo', 'redo'],
        },
    };

    console.log('🛠️ Toolbar configuration:', toolbarConfig);
    console.log('🔗 Link callback function:', linkCallback);
    console.log('🖼️ Image upload callback function:', uploadImageCallBack);

    return ( 
        <div className="bg-gray-100 pb-16 relative">
            {/* Loading overlay for image uploads */}
            {isUploading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-xl">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-700 font-medium">Uploading image...</span>
                    </div>
                </div>
            )}
                        
            {/* Custom Image Upload Button - Workaround */}
            <div className="max-w-4xl mx-auto mb-4 p-4 bg-white rounded-lg shadow-sm border">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <FaImage className="w-4 h-4" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomImageUpload}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </label>
                    {isUploading && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Uploading...</span>
                        </div>
                    )}
                    <span className="text-sm text-gray-600">
                        Click to upload images directly into the editor with resizing and alignment capabilities.
                    </span>
                </div>
            </div>
            
            {/* Enhanced React Draft WYSIWYG Editor */}
            {isClient && Editor ? (
                <div className="relative">
                    {isUploading && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                            <div className="flex items-center gap-3 text-blue-600">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="text-sm font-medium">Uploading image...</span>
                            </div>
                        </div>
                    )}
                    <Editor
                        editorState={editorState}
                        onEditorStateChange={handleEditorChange}
                        toolbarClassName="text-md flex sticky top-0 z-50 !justify-center mx-auto bg-white border-b shadow-sm p-2"
                        editorClassName='mt-6 p-10 bg-white min-h-screen shadow-lg max-w-4xl mx-auto mb-12 border'
                        toolbar={toolbarConfig}
                        placeholder="Start writing your bulletin content here..."
                    />
                </div>
            ) : (
                <div className="mt-6 p-10 bg-white min-h-screen shadow-lg max-w-4xl mx-auto mb-12 border">
                    <div className="text-gray-500 text-center py-8">
                        Loading enhanced editor...
                    </div>
                </div>
            )}
        </div>
    )
}