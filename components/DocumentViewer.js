import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

export default function DocumentViewer({ documents, selectedDocument, setSelectedDocument, handleEditDocument, canPublish, canDelete }) {
  const [activeSection, setActiveSection] = useState('mass');
  const currentDoc = selectedDocument || documents[0];

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {documents.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Document:</label>
          <select
            className="border rounded p-2 w-full"
            value={selectedDocument?._id || documents[0]._id}
            onChange={(e) => {
              const doc = documents.find((d) => d._id === e.target.value);
              setSelectedDocument(doc);
            }}
          >
            {documents.map((doc) => (
              <option key={doc._id} value={doc._id}>
                {doc.liturgicalSeason} - {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString() : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-blue-900">{currentDoc?.liturgicalSeason}</h2>
        <p className="text-sm text-blue-600">
          {currentDoc?.documentDate && new Date(currentDoc.documentDate).toLocaleDateString()}
        </p>
        <div className="mt-2 space-y-1">
          <div>
            <span className="font-semibold">Occasion:</span> {currentDoc?.occasion || '—'}
          </div>
          <div>
            <span className="font-semibold">Mass Animation:</span> {currentDoc?.massAnimation || '—'}
          </div>
          <div>
            <span className="font-semibold">Next Week Occasion:</span> {currentDoc?.nextWeekOccasion || '—'}
          </div>
          {canPublish || canDelete ? (
            <button
              onClick={() => handleEditDocument(currentDoc)}
              className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              Edit Document
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {['mass', 'announcements', 'matrimony'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`${
                  activeSection === section
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'mass' && currentDoc && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    This Week - {currentDoc.liturgicalSeason}
                  </h3>
                  <div className="space-y-3">
                    {currentDoc?.currentWeekMass?.length ? (
                      currentDoc.currentWeekMass.map((mass, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium text-blue-900">{mass.time}</span>
                          <span className="text-blue-700">{mass.group}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No masses scheduled</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-green-600" />
                    Next Week - {currentDoc?.nextWeekOccasion || 'Not set'}
                  </h3>
                  <div className="space-y-3">
                    {currentDoc?.nextWeekMasses?.length ? (
                      currentDoc.nextWeekMasses.map((mass, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-900">{mass.time}</span>
                          <span className="text-green-700">{mass.group}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No masses scheduled</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'announcements' && (
            <div className="space-y-4">
              {currentDoc?.announcements?.length ? (
                currentDoc.announcements.map((announcement, index) => (
                  <div key={announcement._id || index} className="bg-white border rounded-lg p-6">
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
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No announcements available</p>
              )}
            </div>
          )}

          {activeSection === 'matrimony' && (
            <div className="space-y-4">
              {currentDoc?.matrimonyNotices?.length ? (
                currentDoc.matrimonyNotices.map((notice, index) => {
                  const getBannTypeInfo = (bannType) => {
                    switch (bannType) {
                      case 'I':
                        return { text: '1st Banns', color: 'bg-blue-100 text-blue-800 border-blue-200' };
                      case 'II':
                        return { text: '2nd Banns', color: 'bg-purple-100 text-purple-800 border-purple-200' };
                      case 'III':
                        return { text: '3rd Banns', color: 'bg-pink-100 text-pink-800 border-pink-200' };
                      default:
                        return { text: 'Banns', color: 'bg-gray-100 text-gray-800 border-gray-200' };
                    }
                  };

                  const bannInfo = getBannTypeInfo(notice.bannType || 'I');
                  const isGroupWedding = notice.couples && notice.couples.length > 0;

                  return (
                    <div key={notice._id || index} className="bg-white border rounded-lg p-6 relative">
                      <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-medium border ${bannInfo.color}`}>
                        {bannInfo.text}
                      </div>
                      {isGroupWedding ? (
                        <div>
                          <h3 className="text-lg font-bold text-center text-green-700 mb-4">Group Wedding</h3>
                          <div className="space-y-6">
                            {notice.couples.map((couple, idx) => (
                              <div key={couple._id || idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                <div className="text-center mb-2">
                                  <h4 className="font-bold text-pink-900">{couple.groomName}</h4>
                                  <div className="text-pink-800 font-medium my-1">❤️ & ❤️</div>
                                  <h4 className="font-bold text-pink-900">{couple.brideName}</h4>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <h4 className="font-bold text-lg text-pink-900">{notice.groomName}</h4>
                          {notice.groomParents && (
                            <p className="text-pink-700 text-sm">Son of {notice.groomParents}</p>
                          )}
                          <div className="text-pink-800 font-medium my-2">❤️ & ❤️</div>
                          <h4 className="font-bold text-lg text-pink-900">{notice.brideName}</h4>
                          {notice.brideParents && (
                            <p className="text-pink-700 text-sm">Daughter of {notice.brideParents}</p>
                          )}
                        </div>
                      )}
                      <div className="border-t border-pink-200 pt-3 text-center">
                        <p className="text-pink-800 font-medium">
                          Wedding Date: {notice.weddingDate ? new Date(notice.weddingDate).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-pink-700 text-sm">{notice.venue || 'Venue to be announced'}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-8">No matrimony notices available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}