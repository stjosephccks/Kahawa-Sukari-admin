'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Check, X, Plus, Calendar, Edit } from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import EditLiturgicalDocumentModal from '@/components/EditLiturgicalDocumentModal';

export default function LiturgyPage() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = React.useRef(null);
  const { canPublish, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState('documents');
  const [editingProgram, setEditingProgram] = useState(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/liturgy');
      const data = await response.json();
      setPrograms(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedProgram) {
        setSelectedProgram(data[0]);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString, includeYear = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = {
      month: 'short',
      day: 'numeric',
    };
    
    if (includeYear) {
      options.year = 'numeric';
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  const handleProgramSelect = (program) => {
    setSelectedProgram(program);
  };

  const handlePublish = async (id, currentStatus) => {
    if (!id) {
      console.error('No document ID provided');
      return;
    }
    
    // Save the current state for potential rollback
    const previousPrograms = [...programs];
    const previousSelectedProgram = selectedProgram;
    
    // Immediately update both the programs list and selectedProgram
    const newStatus = !currentStatus;
    const updatedPrograms = programs.map(program => 
      program._id === id ? { ...program, published: newStatus } : program
    );
    
    setPrograms(updatedPrograms);
    
    // Also update the selectedProgram if it's the one being modified
    if (selectedProgram && selectedProgram._id === id) {
      setSelectedProgram(prev => ({
        ...prev,
        published: newStatus
      }));
    }
  
    try {
      const formData = new FormData();
      formData.append('_id', id);
      formData.append('published', newStatus.toString());
  
      const response = await fetch('/api/liturgy', {
        method: 'PUT',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Failed to update publish status');
      }
      
      // Refresh the data to ensure consistency
      await fetchPrograms();
      
    } catch (error) {
      console.error('Error updating publish status:', error.message);
      // Revert to previous state on error
      setPrograms(previousPrograms);
      if (previousSelectedProgram) {
        setSelectedProgram(previousSelectedProgram);
      }
      // Optionally show an error message to the user
      alert('Failed to update publish status. Please try again.');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !weekStartDate) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('weekStartDate', weekStartDate);
      formData.append('published', publishImmediately);
      formData.append('originalFileName', selectedFile.name);

      const response = await fetch('/api/liturgy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadedFiles([{ name: selectedFile.name, status: 'completed' }]);
      await fetchPrograms();
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles([{ name: selectedFile.name, status: 'error', error: error.message }]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (programId) => {
    if (!confirm('Are you sure you want to delete this liturgical program?') || !canDelete) return;

    try {
      await fetch(`/api/liturgy?id=${programId}`, {
        method: 'DELETE'
      });
      await fetchPrograms();
      if (selectedProgram?._id === programId) {
        setSelectedProgram(programs[0]?._id === programId ? programs[1] : programs[0]);
      }
    } catch (error) {
      console.error('Error deleting program:', error);
    }
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
  };

  const handleSaveProgram = async (programId, updatedData, file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('_id', programId);

      const dataToSend = { ...updatedData };
      if (dataToSend.dailySchedules) {
        dataToSend.days = dataToSend.dailySchedules.map(day => {
          const { events, ...restOfDay } = day;
          return { ...restOfDay, schedule: events };
        });
        delete dataToSend.dailySchedules;
      }

      Object.keys(dataToSend).forEach(key => {
        if (key === 'days') {
          formData.append(key, JSON.stringify(dataToSend[key]));
        } else {
          formData.append(key, dataToSend[key]);
        }
      });

      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/liturgy', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save program');
      }

      const result = await response.json();

      if (result.success && result.program) {
        setPrograms(prevPrograms => 
          prevPrograms.map(p => p._id === programId ? result.program : p)
        );

        if (selectedProgram?._id === programId) {
          setSelectedProgram(result.program);
        }
      } else {
        await fetchPrograms();
      }

      setEditingProgram(null);
    } catch (error) {
      console.error('Error saving program:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Liturgical Programs</h2>
            <div className="mt-4">
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload New Program
              </button>
            </div>
          </div>

          {showUploadForm && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week Start Date
                  </label>
                  <input
                    type="date"
                    value={weekStartDate || ''}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="publishCheckbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="publishCheckbox" className="ml-2 block text-sm text-gray-700">
                    Publish immediately
                  </label>
                </div>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">.docx files only</p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".docx"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {selectedFile && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-md border border-blue-100">
                    <span className="font-medium">Selected:</span> {selectedFile.name}
                  </div>
                )}
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !weekStartDate}
                  className={`w-full px-4 py-2 rounded-md text-white font-medium transition-colors duration-200 ${
                    !selectedFile || !weekStartDate
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Upload Program'}
                </button>
              </div>
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
                Available Programs
              </h3>
              {programs.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {programs.length} {programs.length === 1 ? 'program' : 'programs'}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : programs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No programs found</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a program to get started</p>
                </div>
              ) : (
                programs.map((program) => (
                  <div
                    key={program._id}
                    onClick={() => handleProgramSelect(program)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors duration-150 ${
                      selectedProgram?._id === program._id
                        ? 'bg-indigo-50 border-l-4 border-indigo-500'
                        : 'bg-white hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900 truncate max-w-[180px]">
                        {program.originalFileName.replace(/\.docx$/, '')}
                      </p>
                      {program.published ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(program.weekStartDate)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {selectedProgram ? (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedProgram.weekTitle || 'Liturgical Program'}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedProgram.period}
                      </span>
                      <span className="text-sm text-gray-500">
                        Week {selectedProgram.weekNumber}
                      </span>
                      <span className="text-sm text-gray-500">
                        • {formatDate(selectedProgram.weekStartDate, true)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex space-x-2">
                    {canPublish && (
                      <button
                        onClick={() => handlePublish(selectedProgram._id, selectedProgram.published)}
                        className={`text-xs px-2 py-1 rounded ${
                          selectedProgram.published
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {selectedProgram.published ? 'Unpublish' : 'Publish Now'}
                      </button>
                    )}
                    {canPublish && (
                      <button
                        onClick={() => handleEditProgram(selectedProgram)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(selectedProgram._id)}
                        className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Schedule */}
              <div className="divide-y divide-gray-100">
                {selectedProgram.days?.map((day, dayIndex) => (
                  <div key={dayIndex} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                        <span className="text-indigo-800 font-medium">
                          {day.day.substring(0, 1)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {day.day}
                            {day.date && <span className="ml-2 text-gray-500 font-normal">{day.date}</span>}
                          </h3>
                        </div>
                        
                        {(day.saint || day.specialCelebration) && (
                          <div className="mt-1 space-y-1">
                            {day.saint && (
                              <p className="text-sm text-indigo-700">
                                <span className="font-medium">{day.saint}</span>
                                {day.saintType && ` • ${day.saintType}`}
                              </p>
                            )}
                            {day.specialCelebration && (
                              <p className="text-sm font-medium text-amber-700">
                                {day.specialCelebration}
                                {day.liturgicalRank && ` • ${day.liturgicalRank}`}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-4 space-y-4">
                          {day.schedule?.map((item, itemIndex) => (
                            <div key={itemIndex} className="pl-4 border-l-2 border-indigo-100 hover:border-indigo-200 transition-colors duration-150">
                              <div className="flex items-start">
                                <span className="inline-block w-20 text-sm font-medium text-indigo-600">
                                  {item.time}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{item.service}</p>
                                  {item.readings && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium text-gray-700">Readings:</span> {item.readings}
                                    </p>
                                  )}
                                  {item.intention && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium text-gray-700">Intention:</span> {item.intention}
                                    </p>
                                  )}
                                  {item.celebrant && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium text-gray-700">Celebrant:</span> {item.celebrant}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
              <div className="bg-indigo-50 p-6 rounded-full mb-4">
                <Calendar className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No program selected</h3>
              <p className="text-gray-500 max-w-md mb-4">
                Select a program from the sidebar to view its details or upload a new liturgical program.
              </p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Program
              </button>
            </div>
          )}
        </div>
        {activeTab === 'upload' && (
          <div className="mb-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week Start Date
                  </label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    id="publish"
                    name="publish"
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="publish" className="ml-2 block text-sm text-gray-700">
                    Publish immediately
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Liturgical Program Document (.docx)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".docx"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={loading}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">DOCX up to 10MB</p>
                    </div>
                  </div>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="mt-2 flex items-center text-sm text-gray-600">
                      {file.status === 'uploading' && (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      )}
                      {file.status === 'completed' && (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      )}
                      {file.status === 'error' && (
                        <X className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Tab */}
        {activeTab === 'view' && (
          <div className="space-y-8">
            {/* Program List */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Available Programs</h2>
              {loading ? (
                <p>Loading programs...</p>
              ) : programs.length === 0 ? (
                <p>No liturgical programs found.</p>
              ) : (
                <div className="space-y-4">
                  {programs.map((program) => (
                    <div 
                      key={program._id} 
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedProgram?._id === program._id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => handleProgramSelect(program)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{program.weekTitle}</h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(program.weekStartDate)} • {program.liturgicalSeason} • {program.liturgicalYear}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {program.published && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              Published
                            </span>
                          )}
                          <span className="text-gray-400">
                            {new Date(program.uploadedDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Program Details */}
            {selectedProgram && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                {/* Header with Actions */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedProgram.weekTitle}</h2>
                    <div className="mt-1 text-gray-600 space-y-1">
                      <p>Liturgical Season: {selectedProgram.liturgicalSeason}</p>
                      <p>Week: {selectedProgram.weekNumber}</p>
                      <p>Year: {selectedProgram.liturgicalYear}</p>
                      <p>Period: {selectedProgram.period}</p>
                      <p>Start Date: {formatDate(selectedProgram.weekStartDate)}</p>
                      <p>Status: {selectedProgram.processingStatus}</p>
                      {selectedProgram.published && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Published
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {canPublish && (
                      <button
                        onClick={() => handlePublish(selectedProgram._id, selectedProgram.published)}
                        className={`text-xs px-2 py-1 rounded ${
                          selectedProgram.published
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {selectedProgram.published ? 'Unpublish' : 'Publish Now'}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(selectedProgram._id)}
                        className="px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {selectedProgram.stats && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Document Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded shadow">
                        <p className="text-sm text-gray-500">Total Days</p>
                        <p className="text-lg font-semibold">{selectedProgram.stats.totalDays}</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow">
                        <p className="text-sm text-gray-500">Total Services</p>
                        <p className="text-lg font-semibold">{selectedProgram.stats.totalServices}</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow">
                        <p className="text-sm text-gray-500">Special Celebrations</p>
                        <p className="text-lg font-semibold">{selectedProgram.stats.specialCelebrations}</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow">
                        <p className="text-sm text-gray-500">Saints</p>
                        <p className="text-lg font-semibold">{selectedProgram.stats.saints}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Days Tabs */}
                <div className="border-b">
                  <div className="flex space-x-4 overflow-x-auto">
                    {selectedProgram.days.map((day, index) => (
                      <button
                        key={index}
                        className={`py-2 px-4 font-medium whitespace-nowrap ${
                          activeTab === `day-${index}`
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab(`day-${index}`)}
                      >
                        {day.day}
                        {day.saint !== 'Ordinary Weekday' && `: ${day.saint}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Schedule */}
                {selectedProgram.days.map((day, index) => (
                  <div key={index} className={`${activeTab === `day-${index}` ? 'block' : 'hidden'} space-y-4`}>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-xl font-semibold">{day.day}</h3>
                      {day.saint !== 'Ordinary Weekday' && (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium">{day.saint}</p>
                          {day.liturgicalRank && (
                            <p className="text-sm text-gray-600">Rank: {day.liturgicalRank}</p>
                          )}
                          {day.specialCelebration && (
                            <p className="text-sm text-blue-600">Special: {day.specialCelebration}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Schedule:</h4>
                      {day.schedule.map((event, eventIndex) => (
                        <div 
                          key={eventIndex} 
                          className={`p-4 border rounded-lg ${
                            event.highlight ? 'bg-blue-50 border-blue-200' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start">
                            <span className="inline-block w-20 text-sm font-medium text-indigo-600">
                              {event.time}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{event.service}</p>
                              {event.originalText && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Original: {event.originalText}
                                </p>
                              )}
                            </div>
                            {event.language && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {event.language}
                              </span>
                            )}
                          </div>
                          {event.location && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Location:</span> {event.location}
                            </p>
                          )}
                          {event.serviceType && (
                            <p className="text-xs text-gray-500 mt-1">
                              Type: {event.serviceType}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Additional Metadata */}
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-medium mb-3">Document Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="font-medium">Original File:</span> {selectedProgram.originalFileName}</p>
                      <p><span className="font-medium">Uploaded:</span> {new Date(selectedProgram.uploadedDate).toLocaleString()}</p>
                      <p><span className="font-medium">Parsed At:</span> {new Date(selectedProgram.parsedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">AWS S3 Key:</span> <span className="text-xs break-all">{selectedProgram.awsS3Key}</span></p>
                      <p><span className="font-medium">File URL:</span> <a href={selectedProgram.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View File</a></p>
                      <p><span className="font-medium">Document ID:</span> <span className="text-xs">{selectedProgram._id}</span></p>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {selectedProgram.warnings && selectedProgram.warnings.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                    <h4 className="font-medium text-yellow-800">Warnings</h4>
                    <ul className="mt-2 text-yellow-700 text-sm space-y-1">
                      {selectedProgram.warnings.map((warning, i) => (
                        <li key={i}>⚠️ {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Raw JSON Toggle */}
                <details className="mt-6">
                  <summary className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800">
                    View Raw JSON Data
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-xs">
                    {JSON.stringify(selectedProgram, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
        {editingProgram && (
          <EditLiturgicalDocumentModal
            program={editingProgram}
            onSave={handleSaveProgram}
            onClose={() => setEditingProgram(null)}
            loading={uploading}
          />
        )}
      </div>
    </Layout>
  );
}
