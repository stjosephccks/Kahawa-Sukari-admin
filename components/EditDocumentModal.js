import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function EditDocumentModal({ document, onSave, onClose, loading }) {
  const [formData, setFormData] = useState({
    liturgicalSeason: document.liturgicalSeason || '',
    massAnimation: document.massAnimation || '',
    occasion: document.occasion || '',
    nextWeekOccasion: document.nextWeekOccasion || '',
    nextWeekDate: document.nextWeekDate ? new Date(document.nextWeekDate).toISOString().split('T')[0] : '',
    documentDate: document.documentDate ? new Date(document.documentDate).toISOString().split('T')[0] : '',
    published: document.published || false,
    currentWeekMass: document.currentWeekMass || [],
    nextWeekMasses: document.nextWeekMasses || [],
    announcements: document.announcements || [],
    matrimonyNotices: document.matrimonyNotices || [],
  });
  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData((prev) => {
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const addArrayItem = (arrayName, defaultItem) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: [...prev[arrayName], defaultItem],
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(document._id, formData, file);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-7xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Document</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'current', label: 'Current Masses' },
              { id: 'next', label: 'Next Masses' },
              { id: 'announcements', label: 'Announcements' },
              { id: 'matrimony', label: 'Matrimony' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Liturgical Season</label>
                <input
                  type="text"
                  name="liturgicalSeason"
                  value={formData.liturgicalSeason}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mass Animation</label>
                <input
                  type="text"
                  name="massAnimation"
                  value={formData.massAnimation}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Occasion</label>
                <input
                  type="text"
                  name="occasion"
                  value={formData.occasion}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Next Week Occasion</label>
                <input
                  type="text"
                  name="nextWeekOccasion"
                  value={formData.nextWeekOccasion}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Next Week Date</label>
                <input
                  type="date"
                  name="nextWeekDate"
                  value={formData.nextWeekDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Date</label>
                <input
                  type="date"
                  name="documentDate"
                  value={formData.documentDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Published</label>
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload New File (Optional)</label>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
            </>
          )}

          {/* Current Week Masses Tab */}
          {activeTab === 'current' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Week Masses</h3>
              {formData.currentWeekMass.map((mass, index) => (
                <div key={index} className="border p-4 rounded mb-2 flex items-center space-x-2">
                  <input
                    type="text"
                    value={mass.time}
                    onChange={(e) => handleArrayChange('currentWeekMass', index, 'time', e.target.value)}
                    placeholder="Time"
                    className="border rounded p-2 flex-1"
                  />
                  <input
                    type="text"
                    value={mass.group}
                    onChange={(e) => handleArrayChange('currentWeekMass', index, 'group', e.target.value)}
                    placeholder="Group"
                    className="border rounded p-2 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('currentWeekMass', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('currentWeekMass', { time: '', group: '' })}
                className="text-blue-600 hover:text-blue-800"
              >
                + Add Mass
              </button>
            </div>
          )}

          {/* Next Week Masses Tab */}
          {activeTab === 'next' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Next Week Masses</h3>
              {formData.nextWeekMasses.map((mass, index) => (
                <div key={index} className="border p-4 rounded mb-2 flex items-center space-x-2">
                  <input
                    type="text"
                    value={mass.time}
                    onChange={(e) => handleArrayChange('nextWeekMasses', index, 'time', e.target.value)}
                    placeholder="Time"
                    className="border rounded p-2 flex-1"
                  />
                  <input
                    type="text"
                    value={mass.group}
                    onChange={(e) => handleArrayChange('nextWeekMasses', index, 'group', e.target.value)}
                    placeholder="Group"
                    className="border rounded p-2 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('nextWeekMasses', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('nextWeekMasses', { time: '', group: '' })}
                className="text-blue-600 hover:text-blue-800"
              >
                + Add Mass
              </button>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Announcements</h3>
              {formData.announcements.map((ann, index) => (
                <div key={index} className="border p-4 rounded mb-2 space-y-2">
                  <input
                    type="text"
                    value={ann.title}
                    onChange={(e) => handleArrayChange('announcements', index, 'title', e.target.value)}
                    placeholder="Title"
                    className="border rounded p-2 w-full"
                  />
                  <textarea
                    value={ann.content}
                    onChange={(e) => handleArrayChange('announcements', index, 'content', e.target.value)}
                    placeholder="Content"
                    rows="3"
                    className="border rounded p-2 w-full resize-none overflow-hidden min-h-[80px]"
                    style={{ height: 'auto', minHeight: '80px' }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                  />
                  <select
                    value={ann.priority}
                    onChange={(e) => handleArrayChange('announcements', index, 'priority', e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('announcements', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('announcements', { title: '', content: '', priority: 'Medium' })}
                className="text-blue-600 hover:text-blue-800"
              >
                + Add Announcement
              </button>
            </div>
          )}

          {/* Matrimony Notices Tab */}
          {activeTab === 'matrimony' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Matrimony Notices</h3>
              {formData.matrimonyNotices.map((notice, index) => (
                <div key={index} className="border p-4 rounded mb-2 space-y-2">
                  <select
                    value={notice.bannType}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'bannType', e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    <option value="I">1st Banns</option>
                    <option value="II">2nd Banns</option>
                    <option value="III">3rd Banns</option>
                  </select>
                  <input
                    type="text"
                    value={notice.groomName}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'groomName', e.target.value)}
                    placeholder="Groom Name"
                    className="border rounded p-2 w-full"
                  />
                  <input
                    type="text"
                    value={notice.groomParents}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'groomParents', e.target.value)}
                    placeholder="Groom Parents"
                    className="border rounded p-2 w-full"
                  />
                  <input
                    type="text"
                    value={notice.brideName}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'brideName', e.target.value)}
                    placeholder="Bride Name"
                    className="border rounded p-2 w-full"
                  />
                  <input
                    type="text"
                    value={notice.brideParents}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'brideParents', e.target.value)}
                    placeholder="Bride Parents"
                    className="border rounded p-2 w-full"
                  />
                  <input
                    type="date"
                    value={notice.weddingDate ? new Date(notice.weddingDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'weddingDate', new Date(e.target.value))}
                    className="border rounded p-2 w-full"
                  />
                  <input
                    type="text"
                    value={notice.venue}
                    onChange={(e) => handleArrayChange('matrimonyNotices', index, 'venue', e.target.value)}
                    placeholder="Venue"
                    className="border rounded p-2 w-full"
                  />
                  {notice.couples.map((couple, cIndex) => (
                    <div key={cIndex} className="border-t pt-2 flex space-x-2">
                      <input
                        type="text"
                        value={couple.groomName}
                        onChange={(e) => {
                          const newCouples = [...notice.couples];
                          newCouples[cIndex].groomName = e.target.value;
                          handleArrayChange('matrimonyNotices', index, 'couples', newCouples);
                        }}
                        placeholder="Couple Groom Name"
                        className="border rounded p-2 flex-1"
                      />
                      <input
                        type="text"
                        value={couple.brideName}
                        onChange={(e) => {
                          const newCouples = [...notice.couples];
                          newCouples[cIndex].brideName = e.target.value;
                          handleArrayChange('matrimonyNotices', index, 'couples', newCouples);
                        }}
                        placeholder="Couple Bride Name"
                        className="border rounded p-2 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newCouples = notice.couples.filter((_, i) => i !== cIndex);
                          handleArrayChange('matrimonyNotices', index, 'couples', newCouples);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newCouples = [...(notice.couples || []), { groomName: '', brideName: '' }];
                      handleArrayChange('matrimonyNotices', index, 'couples', newCouples);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    + Add Couple
                  </button>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('matrimonyNotices', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  addArrayItem('matrimonyNotices', {
                    bannType: 'I',
                    groomName: '',
                    groomParents: '',
                    brideName: '',
                    brideParents: '',
                    weddingDate: null,
                    venue: '',
                    couples: [],
                  })
                }
                className="text-blue-600 hover:text-blue-800"
              >
                + Add Matrimony Notice
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}