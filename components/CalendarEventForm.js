// components/CalendarEventForm.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CalendarEventForm({ event, onClose, onSave }) {
    const [title, setTitle] = useState(event?.title || '');
    const [date, setDate] = useState(event?.date ? formatDateForInput(new Date(event.date)) : '');
    const [activityType, setActivityType] = useState(event?.activityType || '');
    const [venue, setVenue] = useState(event?.venue || '');
    const [group, setGroup] = useState(event?.group || '');
    const [description, setDescription] = useState(event?.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setDate(event.date ? formatDateForInput(new Date(event.date)) : '');
            setActivityType(event.activityType || '');
            setVenue(event.venue || '');
            setGroup(event.group || '');
            setDescription(event.description || '');
        } else {
            setTitle('');
            setDate('');
            setActivityType('');
            setVenue('');
            setGroup('');
            setDescription('');
        }
    }, [event]);

    const groups = ['All', 'St. JohnPaul II Outstation', 'PMC', 'YCA', 'MYM', 'Mantle', 'Charistmatic','Liturgical Group','CL', 'Carovana', 'Emanuela Mazzola', 'St.Joseph Hospital', 'Choir', 'CWA', 'CMA', 'Parish Council', 'Other'];
    const activityTypes = ['Parish', 'ADN', 'Deanery', 'Other']
    function formatDateForInput(date) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title || !date || !activityType || !venue || !group) {
            alert('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const eventData = { title, date, activityType, venue, group, description };

            if (event?._id) {
                await axios.put('/api/calendar-events', { _id: event._id, ...eventData });
            } else {
                await axios.post('/api/calendar-events', eventData);
            }

            onSave();
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Error saving event. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {event?._id ? 'Edit Event' : 'Add New Event'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date & Time *</label>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Activity Type *</label>
                            <select
                                value={activityType}
                                onChange={(e) => setActivityType(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Activity Type</option>
                                {activityTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Venue *</label>
                            <input
                                type="text"
                                value={venue}
                                onChange={(e) => setVenue(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Group *</label>
                            <select
                                value={group}
                                onChange={(e) => setGroup(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select a group</option>
                                {groups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            ></textarea>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Event'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}