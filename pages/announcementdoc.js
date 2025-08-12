'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import DocumentTabs from '@/components/DocumentTabs';
import DocumentList from '@/components/DocumentList';
import DocumentViewer from '@/components/DocumentViewer';
import EditDocumentModal from '@/components/EditDocumentModal';

export default function AnnouncementDoc() {
  const [documents, setDocuments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const { canPublish, canDelete } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/announcemet-docs');
      setDocuments(response.data);
      if (response.data.length > 0 && !selectedDocument) {
        setSelectedDocument(response.data[0]);
      }
    } catch (err) {
      setError('Failed to fetch documents');
      console.error(err);
    }
  };

  const handleFileUpload = async (file, publish) => {
    if (uploadedFiles.length > 0) {
      setError('Please wait for the current document to finish processing');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      setUploadedFiles([{ name: file.name, status: 'uploading' }]);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalFileName', file.name);
      formData.append('published', publish);

      await axios.post('/api/announcemet-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadedFiles([{ name: file.name, status: 'completed' }]);
      await fetchDocuments();
      setActiveTab('view');
      return true;
    } catch (err) {
      setUploadedFiles([{ name: file.name, status: 'error' }]);
      setError(err.response?.data?.error || `Failed to upload ${file.name}: ${err.message}`);
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setLoading(true);
      await axios.delete(`/api/announcemet-docs?id=${docId}`);
      await fetchDocuments();
      setUploadedFiles(prev => prev.filter(file => file.id !== docId));
      if (selectedDocument?._id === docId) {
        setSelectedDocument(null);
      }
    } catch (err) {
      setError(`Failed to delete document: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePublishStatus = async (docId, currentStatus) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('_id', docId);
      formData.append('published', (!currentStatus).toString());

      await axios.put('/api/announcemet-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchDocuments();
    } catch (err) {
      setError('Failed to update document status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = (doc) => {
    setEditingDocument(doc);
  };

  const handleSaveDocument = async (docId, updatedData, file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('_id', docId);
      Object.entries(updatedData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else {
          formData.append(key, value);
        }
      });
      if (file) {
        formData.append('file', file);
        formData.append('originalFileName', file.name);
      }

      const response = await axios.put('/api/announcemet-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedDoc = response.data;

      setDocuments(prevDocs => 
        prevDocs.map(doc => doc._id === updatedDoc._id ? updatedDoc : doc)
      );
      setSelectedDocument(updatedDoc);

      setEditingDocument(null);
      setSuccess('Document saved successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to update document: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Church Document Management</h1>
            <p className="text-gray-600">Upload, parse, and manage church announcements and schedules</p>
          </div>

          <DocumentTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {loading && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
                Processing... Please wait
              </div>
            )}

            {activeTab === 'upload' && (
              <DocumentList
                documents={documents}
                uploadedFiles={uploadedFiles}
                handleFileUpload={handleFileUpload}
                deleteDocument={deleteDocument}
                togglePublishStatus={togglePublishStatus}
                handleEditDocument={handleEditDocument}
                canPublish={canPublish}
                canDelete={canDelete}
                loading={loading}
              />
            )}

            {activeTab === 'view' && documents.length > 0 && (
              <DocumentViewer
                documents={documents}
                selectedDocument={selectedDocument}
                setSelectedDocument={setSelectedDocument}
                handleEditDocument={handleEditDocument}
                canPublish={canPublish}
                canDelete={canDelete}
              />
            )}
          </div>

          {editingDocument && (
            <EditDocumentModal
              document={editingDocument}
              onSave={handleSaveDocument}
              onClose={() => setEditingDocument(null)}
              loading={loading}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}