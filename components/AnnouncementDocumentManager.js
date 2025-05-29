'use client'
import React, { useState, useRef } from 'react';
import { Upload, Calendar, Users, Bell, FileText, ChevronDown, ChevronUp, X } from 'lucide-react';

// Mock data based on your document
const mockParsedData = {
  date: "2025-05-25",
  liturgicalSeason: "Sixth Sunday of Easter",
  massSchedule: {
    "7:30 AM": "ST ANNE",
    "9:00 AM": "CMA",
    "10:30 AM": "ST MARY",
    "12:00 NOON": "ST PETER",
    "WENDANI 9:30 AM": "ST CATHERINE"
  },
  nextWeekSchedule: {
    date: "2025-06-01",
    occasion: "THE ASCENSION OF THE LORD",
    masses: {
      "7:30 AM": "ST AMBROSE",
      "9:00 AM": "ST BENEDICT",
      "10:30 AM": "PMC",
      "12:00 NOON": "ST PAUL",
      "WENDANI 9:30 AM": "ST DOMINIC"
    }
  },
  announcements: [
    {
      id: 1,
      title: "Second Marriage Preparation Course",
      content: "Will start on 8th of June in the former social office of the parish. All interested couples are invited to register by Sunday 8th of June with the catechist or the parish secretary.",
      priority: "high"
    },
    {
      id: 2,
      title: "Cardinal Otunga Beautification Process",
      content: "His Grace Archbishop Philip Anyolo invites representatives to dinner on Friday 30th May at Consolata Shrine. Contribution of minimum Kshs 3,000 requested from each Jumuiya.",
      priority: "medium"
    },
    {
      id: 3,
      title: "Subukia Pilgrimage",
      content: "Jumuiya officials requested to make payments for registered pilgrims for logistic purposes.",
      priority: "medium"
    },
    {
      id: 4,
      title: "Adult Catechumen Registration",
      content: "Registrations and catechesis is ongoing with the catechists.",
      priority: "low"
    }
  ],
  matrimonyNotices: [
    {
      groomName: "WILSON KIMANI KAMAU",
      groomParents: "DAVID KARIUKI RITWA & FRIDA WAITHIRA KAMAU",
      brideName: "ELIZABETH WAMBUI NDUNGU",
      brideParents: "NDUNG'U MUBIA MAHIUHA & VERONICA WANGUI NDUNG'U",
      weddingDate: "2025-07-10",
      venue: "ST FRANCIS OF ASSISI MWIHOKO PARISH"
    }
  ]
};

const AnnouncementDocument = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [parsedDocuments, setParsedDocuments] = useState([mockParsedData]);
  const [selectedDocument, setSelectedDocument] = useState(mockParsedData);
  const [activeTab, setActiveTab] = useState('upload');
  const [expandedSections, setExpandedSections] = useState({
    masses: true,
    announcements: true,
    matrimony: true
  });
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => [...prev, ...files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      status: 'uploaded'
    }))]);
  };

  const parseDocument = (fileId) => {
    // In real implementation, this would parse the actual document
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, status: 'parsed' } : file
    ));
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

  return (
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
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === id
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
            {activeTab === 'upload' && (
              <div className="space-y-6">
                {/* File Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Church Documents</h3>
                  <p className="text-gray-600 mb-4">Drag and drop your .docx files here, or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".docx,.doc"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Choose Files
                  </button>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h3>
                    <div className="space-y-3">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB • Uploaded {new Date(file.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              file.status === 'parsed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {file.status === 'parsed' ? 'Parsed' : 'Ready to Parse'}
                            </span>
                            {file.status !== 'parsed' && (
                              <button
                                onClick={() => parseDocument(file.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                              >
                                Parse Document
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'view' && (
              <div className="space-y-6">
                {/* Document Selector */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">
                    {selectedDocument.liturgicalSeason} - {new Date(selectedDocument.date).toLocaleDateString()}
                  </h3>
                  <p className="text-blue-700 text-sm">Complete parsed document data</p>
                </div>

                {/* Collapsible Sections */}
                <div className="space-y-4">
                  {/* Mass Schedule Section */}
                  <div className="bg-white border rounded-lg">
                    <button
                      onClick={() => toggleSection('masses')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <h3 className="font-medium text-gray-900">Mass Schedule</h3>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                          {Object.keys(selectedDocument.massSchedule).length} masses
                        </span>
                      </div>
                      {expandedSections.masses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {expandedSections.masses && (
                      <div className="border-t p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(selectedDocument.massSchedule).map(([time, group]) => (
                            <div key={time} className="bg-purple-50 rounded-lg p-3">
                              <p className="font-medium text-purple-900">{time}</p>
                              <p className="text-purple-700 text-sm">{group}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Announcements Section */}
                  <div className="bg-white border rounded-lg">
                    <button
                      onClick={() => toggleSection('announcements')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <Bell className="w-5 h-5 text-orange-600" />
                        <h3 className="font-medium text-gray-900">Announcements</h3>
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                          {selectedDocument.announcements.length} items
                        </span>
                      </div>
                      {expandedSections.announcements ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {expandedSections.announcements && (
                      <div className="border-t p-4">
                        <div className="space-y-4">
                          {selectedDocument.announcements.map((announcement) => (
                            <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                                  {announcement.priority}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm">{announcement.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Matrimony Section */}
                  <div className="bg-white border rounded-lg">
                    <button
                      onClick={() => toggleSection('matrimony')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-pink-600" />
                        <h3 className="font-medium text-gray-900">Matrimony Notices</h3>
                        <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs">
                          {selectedDocument.matrimonyNotices.length} notices
                        </span>
                      </div>
                      {expandedSections.matrimony ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {expandedSections.matrimony && (
                      <div className="border-t p-4">
                        <div className="space-y-4">
                          {selectedDocument.matrimonyNotices.map((notice, index) => (
                            <div key={index} className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                              <div className="text-center mb-4">
                                <h4 className="font-bold text-pink-900 text-lg">{notice.groomName}</h4>
                                <p className="text-pink-700 text-sm">Son of {notice.groomParents}</p>
                                <div className="text-pink-800 font-medium my-2">❤️ & ❤️</div>
                                <h4 className="font-bold text-pink-900 text-lg">{notice.brideName}</h4>
                                <p className="text-pink-700 text-sm">Daughter of {notice.brideParents}</p>
                              </div>
                              <div className="border-t border-pink-200 pt-3 text-center">
                                <p className="text-pink-800 font-medium">Wedding Date: {new Date(notice.weddingDate).toLocaleDateString()}</p>
                                <p className="text-pink-700 text-sm">{notice.venue}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Week */}
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      This Week - {selectedDocument.liturgicalSeason}
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(selectedDocument.massSchedule).map(([time, group]) => (
                        <div key={time} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium text-blue-900">{time}</span>
                          <span className="text-blue-700">{group}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Week */}
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-green-600" />
                      Next Week - {selectedDocument.nextWeekSchedule.occasion}
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(selectedDocument.nextWeekSchedule.masses).map(([time, group]) => (
                        <div key={time} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-900">{time}</span>
                          <span className="text-green-700">{group}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'announcements' && (
              <div className="space-y-4">
                {selectedDocument.announcements.map((announcement) => (
                  <div key={announcement.id} className="bg-white border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority} priority
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{announcement.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDocument;