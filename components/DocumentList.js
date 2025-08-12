import React, { useRef } from 'react';
import { FileText, Upload, Trash2, Edit } from 'lucide-react';

export default function DocumentList({
  documents,
  uploadedFiles,
  handleFileUpload,
  deleteDocument,
  togglePublishStatus,
  handleEditDocument,
  canPublish,
  canDelete,
  loading,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            loading || uploadedFiles.length > 0 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
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
            onChange={(e) => {
              if (e.target.files[0]) {
                handleFileUpload(e.target.files[0], false);
                e.target.value = null;
              }
            }}
            disabled={loading || uploadedFiles.length > 0}
          />
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                file.status === 'error' ? 'bg-red-50' : file.status === 'completed' ? 'bg-green-50' : 'bg-blue-50'
              }`}
            >
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-500" />
                <span className="flex-1 text-sm text-gray-900">{file.name}</span>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    file.status === 'error'
                      ? 'bg-red-100 text-red-800'
                      : file.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {file.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    doc.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {doc.published ? 'Published' : 'Draft'}
                </span>
                {canPublish && (
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
                )}
                <button
                  onClick={() => handleEditDocument(doc)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  disabled={loading}
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                {canDelete && (
                  <button
                    onClick={() => deleteDocument(doc._id)}
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