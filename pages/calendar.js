import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import axios from 'axios';
import Layout from "@/components/Layout";
import CalendarEventForm from "@/components/CalendarEventForm";
import useAuth from '@/hooks/useAuth';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [selectedEventType, setSelectedEventType] = useState('All');
    const eventTypes = ['All', 'Parish', 'ADN', 'Deanery', 'Other'];
    const { role } = useAuth();

    const groups = ['All', 'PMC', 'YCA', 'MYM', 'Mantle', 'Charistmatic','Liturgical Group', 'CL', 'Carovana', 'Emanuela Mazzola', 'St.Joseph Hospital', 'Choir', 'CWA', 'CMA', 'Parish Council', 'Other'];

    useEffect(() => {
        loadEvents();
    }, [currentDate, selectedGroup, selectedEventType]);

    function getEventStyle(event) {
        // Color by activity type
        const activityColors = {
            'Parish': '#3b82f6',    // blue-500
            'ADN': '#8b5cf6',       // violet-500
            'Deanery': '#10b981',   // emerald-500
            'Other': '#6b7280'      // gray-500
        };
        return {
            backgroundColor: activityColors[event.activityType] || '#6b7280',
            color: 'white',
            cursor: 'pointer',
            '--tw-shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            '&:hover': {
                opacity: 0.9
            }
        };
    }
    async function loadEvents() {
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const group = selectedGroup === 'All' ? '' : selectedGroup;
            const activityType = selectedEventType === 'All' ? '' : selectedEventType;

            const response = await axios.get(
                `/api/calendar-events?month=${month}&year=${year}` +
                `${group ? `&group=${group}` : ''}` +
                `${activityType ? `&activityType=${activityType}` : ''}`
            );
            setEvents(response.data);
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleEventSaved = () => {
        setShowForm(false);
        setSelectedEvent(null);
        loadEvents();
    };

    const handleEdit = (event) => {
        setSelectedEvent(event);
        setShowForm(true);
    };

    const handleDelete = async (eventId) => {
        if (confirm('Are you sure you want to delete this event?')) {
            await axios.delete(`/api/calendar-events?id=${eventId}`);
            loadEvents();
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-800">Parish Calendar</h1>
                        <div className="flex gap-3">
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                {groups.map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                            <select
                                value={selectedEventType}
                                onChange={(e) => setSelectedEventType(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                {eventTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    setSelectedEvent(null);
                                    setShowForm(true);
                                }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors font-medium"
                            >
                                + Add Event
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-6 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700">Event Types:</span>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{backgroundColor: '#3b82f6'}}></span>
                                <span className="text-sm text-gray-600">Parish</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{backgroundColor: '#8b5cf6'}}></span>
                                <span className="text-sm text-gray-600">ADN</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{backgroundColor: '#10b981'}}></span>
                                <span className="text-sm text-gray-600">Deanery</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{backgroundColor: '#6b7280'}}></span>
                                <span className="text-sm text-gray-600">Other</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <button
                            onClick={handlePreviousMonth}
                            className="px-4 py-2 rounded-lg hover:bg-white/20 transition-colors font-medium"
                        >
                            ← Previous
                        </button>
                        <h2 className="text-2xl font-bold">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <button
                            onClick={handleNextMonth}
                            className="px-4 py-2 rounded-lg hover:bg-white/20 transition-colors font-medium"
                        >
                            Next →
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-gray-200">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-gray-50 py-3 text-center font-semibold text-gray-700 text-sm">
                                {day}
                            </div>
                        ))}

                        {daysInMonth.map(day => {
                            const dayEvents = events.filter(event =>
                                isSameDay(new Date(event.date), day)
                            );

                            return (
                                <div
                                    key={day.toString()}
                                    className={`bg-white min-h-32 p-2 border border-gray-100 hover:bg-gray-50 transition-colors ${!isSameMonth(day, currentDate) ? 'text-gray-400 bg-gray-50' : ''
                                        }`}
                                >
                                    <div className="font-semibold mb-2 text-sm">{format(day, 'd')}</div>
                                    <div className="space-y-1">
                                        {dayEvents.map(event => (
                                            <div
                                                key={event._id}
                                                className="group relative"
                                            >
                                                <div
                                                    className="text-xs p-1.5 rounded-md truncate mb-1 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                                    style={getEventStyle(event)}
                                                    onClick={() => handleEdit(event)}
                                                >
                                                    <div className="font-medium">{event.title}</div>
                                                    <div className="text-xs opacity-90 mt-0.5">{event.group}</div>
                                                </div>
                                                {role === 'super_admin' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(event._id);
                                                        }}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                                                        title="Delete event"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showForm && (
                <CalendarEventForm
                    event={selectedEvent}
                    onClose={() => {
                        setShowForm(false);
                        setSelectedEvent(null);
                    }}
                    onSave={handleEventSaved}
                />
            )}
        </Layout>
    );
}

function getGroupColor(group) {
    const colors = {
        // Parish Groups
        'PMC': '#3b82f6',          // blue-500
        'YCA': '#8b5cf6',          // violet-500
        'MYM': '#10b981',          // emerald-500
        'Mantle': '#ec4899',       // pink-500
        'Charistmatic': '#f59e0b', // amber-500
        'CL': '#ef4444',           // red-500
        'Carovana': '#6366f1',     // indigo-500
        'Emanuela Mazzola': '#14b8a6', // teal-500
        'St.Joseph Hospital': '#f97316', // orange-500
        'Choir': '#8b5cf6',        // violet-500
        'CWA': '#ec4899',          // pink-500
        'CMA': '#f59e0b',          // amber-500
        'Parish Council': '#ef4444', // red-500
        // Default
        'Other': '#6b7280'         // gray-500
    };
    return colors[group] || '#6b7280';
}