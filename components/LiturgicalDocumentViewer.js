import React from 'react';
import { Calendar, Sun, Star } from 'lucide-react';

export default function LiturgicalDocumentViewer({ programs, selectedProgram, setSelectedProgram, handleEditProgram }) {
  const currentProgram = selectedProgram || programs[0];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {programs.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Program:</label>
          <select
            className="border rounded p-2 w-full"
            value={currentProgram?._id}
            onChange={(e) => {
              const program = programs.find((p) => p._id === e.target.value);
              setSelectedProgram(program);
            }}
          >
            {programs.map((program) => (
              <option key={program._id} value={program._id}>
                {program.liturgicalSeason} - Week of {new Date(program.weekStartDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {currentProgram && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-medium text-blue-900">{currentProgram.liturgicalSeason}</h2>
          <p className="text-sm text-blue-600">
            Week of {formatDate(currentProgram.weekStartDate)}
          </p>
          <div className="mt-2 space-y-1">
            {currentProgram.solemnity && <div><span className="font-semibold">Solemnity:</span> {currentProgram.solemnity}</div>}
            {currentProgram.feastName && <div><span className="font-semibold">Feast:</span> {currentProgram.feastName}</div>}
          </div>
          <button 
            onClick={() => handleEditProgram(currentProgram)}
            className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          >
            Edit Program
          </button>
        </div>
      )}

      {currentProgram?.dailySchedules?.map((day, index) => (
        <div key={index} className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            {formatDate(day.date)}
          </h3>
          {day.saint && (
            <div className="mb-4 flex items-center text-md text-yellow-800">
              <Star className="w-5 h-5 mr-2 text-yellow-500"/> 
              <span>{day.saint}</span>
            </div>
          )}
          <div className="space-y-3">
            {day.events.map((event, eventIndex) => (
              <div key={eventIndex} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-blue-900">{event.time}</span>
                <span className="text-blue-700">{event.service}</span>
                {event.language && <span className="text-xs bg-gray-200 px-2 py-1 rounded">{event.language}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
