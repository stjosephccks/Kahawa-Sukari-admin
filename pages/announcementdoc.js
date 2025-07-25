'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Calendar, Users, Bell, FileText, ChevronDown, ChevronUp, X, Trash2, Edit } from 'lucide-react';
import Layout from '@/components/Layout';
import axios from 'axios';

export default function AnnouncementDoc() {
  const [documents, setDocuments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [activeSection, setActiveSection] = useState('mass');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    masses: false,
    announcements: false,
    documents: false
  });
  const [publish, setPublish] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/announcemet-docs');
      setDocuments(response.data);
      if (response.data.length > 0) {
        setActiveTab('view');
        setSelectedDocument(response.data[0]);
      }
    } catch (err) {
      setError('Failed to fetch documents');
      console.error(err);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 1) {
      setError('Please upload only one document at a time');
      event.target.value = null;
      return;
    }

    // Check if there's already a file being processed
    if (uploadedFiles.length > 0) {
      setError('Please wait for the current document to finish processing');
      event.target.value = null;
      return;
    }

    setLoading(true);
    setError(null);

    const file = files[0];
    try {
      // Add file to uploadedFiles first
      setUploadedFiles([{ name: file.name, status: 'uploading' }]);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalFileName', file.name);
      formData.append('published', publish); // Add publish status to form data

      await axios.post('/api/announcemet-docs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update file status to success
      setUploadedFiles([{ name: file.name, status: 'completed' }]);
      await fetchDocuments();
      setActiveTab('view');
    } catch (err) {
      // Update file status to error
      setUploadedFiles([{ name: file.name, status: 'error' }]);
      setError(err.response?.data?.error || `Failed to upload ${file.name}: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
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

  const handleUpdateDocument = async (docId, file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalFileName', file.name);
      formData.append('_id', docId);

      await axios.put('/api/announcemet-docs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await fetchDocuments();
    } catch (err) {
      setError(`Failed to update document: ${err.message}`);
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
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      await fetchDocuments(); // Refresh the documents list
    } catch (err) {
      setError('Failed to update document status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const currentDoc = selectedDocument || documents[0];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Church Document Management</h1>
            <p className="text-gray-600">Upload, parse, and manage church announcements and schedules</p>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'upload', label: 'Upload Documents', icon: Upload },
                  { id: 'view', label: 'View Parsed Data', icon: FileText },
                  { id: 'schedule', label: 'Mass Schedule', icon: Calendar },
                  { id: 'announcements', label: 'Announcements', icon: Bell }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="float-right text-red-700 hover:text-red-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {loading && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
                  Processing... Please wait
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${loading || uploadedFiles.length > 0 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className={`w-10 h-10 mb-3 ${loading || uploadedFiles.length > 0 ? 'text-gray-300' : 'text-gray-400'}`} />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Word document (.docx)</p>
                        {loading && (
                          <div className="mt-4 text-blue-600">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm">Processing document...</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        accept=".docx"
                        onChange={handleFileUpload}
                        disabled={loading || uploadedFiles.length > 0}
                      />
                    </label>
                  </div>

                  {/* Upload Status */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className={`p-4 rounded-lg ${file.status === 'error' ? 'bg-red-50' : file.status === 'completed' ? 'bg-green-50' : 'bg-blue-50'}`}>
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-gray-500" />
                            <span className="flex-1 text-sm text-gray-900">{file.name}</span>
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${file.status === 'error' ? 'bg-red-100 text-red-800' : file.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {file.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h3>
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc._id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.originalFileName}</p>
                              <p className="text-sm text-gray-500">
                                Uploaded {new Date(doc.uploadeddate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doc.published 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.published ? 'Published' : 'Draft'}
                            </span>
                            <button
                              onClick={() => togglePublishStatus(doc._id, doc.published)}
                              className={`px-3 py-1 rounded text-sm ${
                                doc.published
                                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                              disabled={loading}
                            >
                              {doc.published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => deleteDocument(doc._id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'view' && documents.length > 0 && (
                <div className="space-y-6">
                  {/* Document selector if multiple docs */}
                  {documents.length > 1 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Document:</label>
                      <select
                        className="border rounded p-2"
                        value={selectedDocument?._id || documents[0]._id}
                        onChange={e => {
                          const doc = documents.find(d => d._id === e.target.value);
                          setSelectedDocument(doc);
                        }}
                      >
                        {documents.map(doc => (
                          <option key={doc._id} value={doc._id}>
                            {doc.liturgicalSeason} - {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString() : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Document header */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h2 className="text-lg font-medium text-blue-900">
                      {currentDoc?.liturgicalSeason}
                    </h2>
                    <p className="text-sm text-blue-600">
                      {currentDoc?.documentDate && new Date(currentDoc.documentDate).toLocaleDateString()}
                    </p>
                    <div className="mt-2 space-y-1">
                      <div><span className="font-semibold">Occasion:</span> {currentDoc?.occasion || '—'}</div>
                      <div><span className="font-semibold">Mass Animation:</span> {currentDoc?.massAnimation || '—'}</div>
                      <div><span className="font-semibold">Next Week Occasion:</span> {currentDoc?.nextWeekOccasion || '—'}</div>
                    </div>
                  </div>

                  {/* Document Content */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button
                          onClick={() => setActiveSection('mass')}
                          className={`${activeSection === 'mass'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                          Mass Schedule
                        </button>
                        <button
                          onClick={() => setActiveSection('announcements')}
                          className={`${activeSection === 'announcements'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                          Announcements
                        </button>
                        <button
                          onClick={() => setActiveSection('matrimony')}
                          className={`${activeSection === 'matrimony'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                          Matrimony Notices
                        </button>
                      </nav>
                    </div>

                    <div className="p-6">
                      {activeSection === 'mass' && currentDoc && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Current Week */}
                            <div className="bg-white border rounded-lg p-6">
                              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                                This Week - {currentDoc.liturgicalSeason}
                              </h3>
                              <div className="space-y-3">
                                {currentDoc?.currentWeekMass ? currentDoc.currentWeekMass.map((mass, index) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <span className="font-medium text-blue-900">{mass.time}</span>
                                    <span className="text-blue-700">{mass.group}</span>
                                  </div>
                                )) : <p className="text-gray-500">No masses scheduled</p>}
                              </div>
                            </div>

                            {/* Next Week */}
                            <div className="bg-white border rounded-lg p-6">
                              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-green-600" />
                                Next Week - {currentDoc?.nextWeekOccasion || 'Not set'}
                              </h3>
                              <div className="space-y-3">
                                {currentDoc?.nextWeekMasses ? currentDoc.nextWeekMasses.map((mass, index) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <span className="font-medium text-green-900">{mass.time}</span>
                                    <span className="text-green-700">{mass.group}</span>
                                  </div>
                                )) : <p className="text-gray-500">No masses scheduled</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection === 'announcements' && (
                        <div className="space-y-4">
                          {(currentDoc?.announcements || []).map((announcement, index) => (
                            <div key={announcement.id || index} className="bg-white border rounded-lg p-6">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                                {announcement.priority && (
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(announcement.priority)}`}>
                                    {announcement.priority} priority
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 leading-relaxed">{announcement.content}</p>
                            </div>
                          ))}
                          {(!currentDoc?.announcements || currentDoc.announcements.length === 0) && (
                            <p className="text-gray-500 text-center py-8">No announcements available</p>
                          )}
                        </div>
                      )}

                      {activeSection === 'matrimony' && (
                        <div className="space-y-4">
                          {(currentDoc?.matrimonyNotices || []).length > 0 ? (
                            currentDoc.matrimonyNotices.map((notice, index) => (
                              <div key={notice._id || index} className="bg-white border rounded-lg p-6">
                                <div className="mb-2 text-center">
                                  <h4 className="font-bold text-lg text-pink-900">{notice.groomName}</h4>
                                  <p className="text-pink-700 text-sm">Son of {notice.groomParents}</p>
                                  <div className="text-pink-800 font-medium my-2">❤️ & ❤️</div>
                                  <h4 className="font-bold text-lg text-pink-900">{notice.brideName}</h4>
                                  <p className="text-pink-700 text-sm">Daughter of {notice.brideParents}</p>
                                </div>
                                <div className="border-t border-pink-200 pt-3 text-center">
                                  <p className="text-pink-800 font-medium">Wedding Date: {notice.weddingDate ? new Date(notice.weddingDate).toLocaleDateString() : '—'}</p>
                                  <p className="text-pink-700 text-sm">{notice.venue}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">No matrimony notices available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}