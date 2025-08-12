import React, { useRef, useState } from 'react';
import { FileText, Upload, Trash2, Edit } from 'lucide-react';

export default function LiturgicalDocumentList({
  programs,
  handleFileUpload,
  deleteProgram,
  togglePublishStatus,
  handleEditProgram,
  canPublish,
  canDelete,
  loading,
}) {
  const fileInputRef = useRef(null);
  const [weekStartDate, setWeekStartDate] = useState('');

  const onFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && weekStartDate) {
      handleFileUpload(file, weekStartDate, false);
      e.target.value = null; // Reset file input
    } else if (!weekStartDate) {
        alert('Please select a week start date first.');
        e.target.value = null; // Reset file input
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            loading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-10 h-10 mb-3 ${loading ? 'text-gray-300' : 'text-gray-400'}`} />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">Word document (.docx)</p>
            <div className="mt-4">
                <label htmlFor="weekStartDate" className="sr-only">Week Start Date</label>
                <input 
                    type="date" 
                    id="weekStartDate"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent triggering the file input
                    className="p-2 border rounded"
                    required
                />
            </div>
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
            onChange={onFileSelect}
            disabled={loading}
          />
        </label>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Programs</h3>
        <div className="space-y-3">
          {programs.map((program) => (
            <div key={program._id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{program.originalFileName}</p>
                  <p className="text-sm text-gray-500">
                    Week of {new Date(program.weekStartDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    program.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {program.published ? 'Published' : 'Draft'}
                </span>
                {canPublish && (
                  <button
                    onClick={() => togglePublishStatus(program._id, program.published)}
                    className={`px-3 py-1 rounded text-sm ${
                      program.published
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    disabled={loading}
                  >
                    {program.published ? 'Unpublish' : 'Publish'}
                  </button>
                )}
                <button
                  onClick={() => handleEditProgram(program)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  disabled={loading}
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                {canDelete && (
                  <button
                    onClick={() => deleteProgram(program._id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
