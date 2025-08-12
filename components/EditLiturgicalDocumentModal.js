import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function EditLiturgicalDocumentModal({ program, onSave, onClose, loading }) {
  const [formData, setFormData] = useState({
    liturgicalSeason: program.liturgicalSeason || '',
    liturgicalYear: program.liturgicalYear || '',
    weekTitle: program.weekTitle || '',
    solemnity: program.solemnity || '',
    feastName: program.feastName || '',
    weekStartDate: program.weekStartDate ? new Date(program.weekStartDate).toLocaleDateString('en-CA') : '',
    weekEndDate: program.weekEndDate ? new Date(program.weekEndDate).toLocaleDateString('en-CA') : '',
    published: program.published || false,
    dailySchedules: program.days ? program.days.map(day => ({ ...day, events: day.schedule })) : [],
  });
  const [file, setFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDayInfoChange = (dayIndex, field, value) => {
    setFormData(prev => {
        const newSchedules = [...prev.dailySchedules];
        newSchedules[dayIndex] = { ...newSchedules[dayIndex], [field]: value };
        return { ...prev, dailySchedules: newSchedules };
    });
  };

  const handleScheduleChange = (dayIndex, eventIndex, field, value) => {
    setFormData((prev) => {
        const newSchedules = [...prev.dailySchedules];
        newSchedules[dayIndex].events[eventIndex] = { ...newSchedules[dayIndex].events[eventIndex], [field]: value };
        return { ...prev, dailySchedules: newSchedules };
    });
  };

  const addEvent = (dayIndex) => {
    setFormData(prev => {
      const newSchedules = [...prev.dailySchedules];
      newSchedules[dayIndex].events.push({ time: '', service: '', language: '', location: '', serviceType: '' });
      return { ...prev, dailySchedules: newSchedules };
    });
  };

  const removeEvent = (dayIndex, eventIndex) => {
    setFormData(prev => {
      const newSchedules = [...prev.dailySchedules];
      newSchedules[dayIndex].events.splice(eventIndex, 1);
      return { ...prev, dailySchedules: newSchedules };
    });
  };

  const addDay = () => {
    setFormData(prev => ({
      ...prev,
      dailySchedules: [...prev.dailySchedules, { date: '', saint: '', events: [] }]
    }));
  };

  const removeDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      dailySchedules: prev.dailySchedules.filter((_, i) => i !== dayIndex)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(program._id, formData, file);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Liturgical Program</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Liturgical Season</label>
                <input type="text" name="liturgicalSeason" value={formData.liturgicalSeason} onChange={handleInputChange} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Solemnity</label>
                <input type="text" name="solemnity" value={formData.solemnity} onChange={handleInputChange} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Feast Name</label>
                <input type="text" name="feastName" value={formData.feastName} onChange={handleInputChange} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Liturgical Year</label>
                <input type="text" name="liturgicalYear" value={formData.liturgicalYear} onChange={handleInputChange} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Week Title</label>
                <input type="text" name="weekTitle" value={formData.weekTitle} onChange={handleInputChange} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Week Start Date</label>
                <input type="date" name="weekStartDate" value={formData.weekStartDate} onChange={handleInputChange} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Published</label>
                <input type="checkbox" name="published" checked={formData.published} onChange={handleInputChange} className="mt-1 h-4 w-4" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Upload New File (Optional)</label>
                <input type="file" accept=".docx" onChange={(e) => setFile(e.target.files[0])} className="mt-1 block w-full border rounded p-2" />
            </div>
          </div>

          {/* Daily Schedules */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-900">Daily Schedules</h3>
              <button type="button" onClick={addDay} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                Add Day
              </button>
            </div>
            <div className="space-y-4">
              {formData.dailySchedules.map((day, dayIndex) => (
                <div key={dayIndex} className="border p-4 rounded mb-2 space-y-3 bg-gray-50 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="text" value={day.day || ''} onChange={(e) => handleDayInfoChange(dayIndex, 'day', e.target.value)} placeholder="Day (e.g., MONDAY)" className="border rounded p-2 w-full" />
                    <input type="text" value={day.date || ''} onChange={(e) => handleDayInfoChange(dayIndex, 'date', e.target.value)} placeholder="Date (e.g., 11)" className="border rounded p-2 w-full" />
                    <input type="text" value={day.saint || ''} onChange={(e) => handleDayInfoChange(dayIndex, 'saint', e.target.value)} placeholder="Saint of the day" className="border rounded p-2 w-full" />
                  </div>
                  <h4 className="text-md font-medium text-gray-800">Events</h4>
                  <div className="space-y-2">
                    {day.events.map((event, eventIndex) => (
                      <div key={eventIndex} className="border p-3 rounded bg-white space-y-2 relative">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input type="text" value={event.time || ''} onChange={(e) => handleScheduleChange(dayIndex, eventIndex, 'time', e.target.value)} placeholder="Time (e.g., 6:30 AM)" className="border rounded p-2" />
                          <input type="text" value={event.service || ''} onChange={(e) => handleScheduleChange(dayIndex, eventIndex, 'service', e.target.value)} placeholder="Service (e.g., Mass)" className="border rounded p-2" />
                          <input type="text" value={event.language || ''} onChange={(e) => handleScheduleChange(dayIndex, eventIndex, 'language', e.target.value)} placeholder="Language (e.g., English)" className="border rounded p-2" />
                          <input type="text" value={event.location || ''} onChange={(e) => handleScheduleChange(dayIndex, eventIndex, 'location', e.target.value)} placeholder="Location" className="border rounded p-2" />
                          <input type="text" value={event.serviceType || ''} onChange={(e) => handleScheduleChange(dayIndex, eventIndex, 'serviceType', e.target.value)} placeholder="Service Type" className="border rounded p-2" />
                        </div>
                        <textarea
                          value={event.originalText || ''}
                          onChange={(e) => handleScheduleChange(dayIndex, eventIndex, 'originalText', e.target.value)}
                          placeholder="Original Text"
                          className="border rounded p-2 w-full mt-2"
                          rows="2"
                        ></textarea>
                        <button type="button" onClick={() => removeEvent(dayIndex, eventIndex)} className="absolute top-1 right-1 text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addEvent(dayIndex)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm mt-2">
                    Add Event
                  </button>
                  <button type="button" onClick={() => removeDay(dayIndex)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
