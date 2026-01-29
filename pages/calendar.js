import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay } from 'date-fns';
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

    const groups = ['All','St. JohnPaul II Outstation', 'PMC', 'YCA','CJPD', 'MYM', 'Mantle', 'Charistmatic','Liturgical Group', 'CL', 'Carovana', 'Emanuela Mazzola', 'St.Joseph Hospital', 'Choir', 'CWA', 'CMA', 'Parish Council', 'Other'];

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

    const handleExportToCSV = async (exportAll = false) => {
        let exportData = events;
        
        if (exportAll) {
            try {
                const response = await axios.get('/api/calendar-events');
                exportData = response.data;
            } catch (error) {
                console.error('Error fetching all events for export:', error);
                alert('Failed to fetch all events');
                return;
            }
        }

        if (exportData.length === 0) {
            alert('No events to export');
            return;
        }

        const headers = ['Title', 'Date', 'Time', 'Activity Type', 'Venue', 'Group', 'Description'];
        const rows = exportData.map(event => {
            const eventDate = new Date(event.date);
            return [
                `"${(event.title || '').replace(/"/g, '""')}"`,
                `"${format(eventDate, 'yyyy-MM-dd')}"`,
                `"${format(eventDate, 'HH:mm')}"`,
                `"${event.activityType || ''}"`,
                `"${(event.venue || '').replace(/"/g, '""')}"`,
                `"${event.group || ''}"`,
                `"${(event.description || '').replace(/"/g, '""')}"`
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = exportAll ? 'parish_calendar_all.csv' : `parish_calendar_${format(currentDate, 'MMM_yyyy')}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEventSaved = () => {
        setShowForm(false);
        setSelectedEvent(null);
        loadEvents();
    };

    const handleEdit = (e, event) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setShowForm(true);
    };

    const handleDelete = async (eventId) => {
        if (confirm('Are you sure you want to delete this event?')) {
            await axios.delete(`/api/calendar-events?id=${eventId}`);
            loadEvents();
        }
    };

    const handleDateClick = (date) => {
        // Create a new event with the clicked date pre-filled
        const newEvent = {
            date: date.toISOString()
        };
        setSelectedEvent(newEvent);
        setShowForm(true);
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-800">Parish Calendar</h1>
                        <div className="flex items-end gap-3 flex-wrap">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="group" className="text-sm font-semibold text-gray-700">Group</label>
                                <select
                                    id="group"
                                    value={selectedGroup}
                                    onChange={(e) => setSelectedGroup(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {groups.map(group => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="activityType" className="text-sm font-semibold text-gray-700">Activity Type</label>
                                <select
                                    id="activityType"
                                    value={selectedEventType}
                                    onChange={(e) => setSelectedEventType(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {eventTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExportToCSV(false)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md transition-colors font-medium flex items-center gap-2 text-sm"
                                    title="Export current month to CSV"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Export Month
                                </button>
                                <button
                                    onClick={() => handleExportToCSV(true)}
                                    className="bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 shadow-md transition-colors font-medium flex items-center gap-2 text-sm"
                                    title="Export all historical events to CSV"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Export All
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedEvent(null);
                                    setShowForm(true);
                                }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors font-medium ml-auto"
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

                        {/* Add empty cells before the first day of the month */}
                        {[...Array(getDay(startOfMonth(currentDate)))].map((_, i) => (
                            <div key={`empty-${i}`} className="bg-gray-50 border border-gray-100 min-h-32"></div>
                        ))}

                        {daysInMonth.map(day => {
                            const dayEvents = events.filter(event =>
                                isSameDay(new Date(event.date), day)
                            );

                            return (
                                <div
                                    key={day.toString()}
                                    className={`bg-white min-h-32 p-2 border border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${!isSameMonth(day, currentDate) ? 'text-gray-400 bg-gray-50' : ''
                                        }`}
                                    onClick={() => handleDateClick(day)}
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
                                                    onClick={(e) => handleEdit(e, event)}
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
        'St. JohnPaul II Outstation': '#06b6d4', // cyan-500
        'Other': '#6b7280'         // gray-500
    };
    return colors[group] || '#6b7280';
}