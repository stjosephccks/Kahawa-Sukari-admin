import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function ManageSchedulesPage() {
    const [schedules, setSchedules] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { role } = useAuth();
    const router = useRouter();

    const [formData, setFormData] = useState({
        employee: '',
        weekStartDate: '',
        startTime: '5:00 AM',
        timezone: 'EAT (Kenya)',
        timeSlots: [],
        importantTasks: ''
    });

    const timeOptions = [
        '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', 
        '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
        '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
        '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
        '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
    ];

    const timezones = ['EAT (Kenya)', 'UTC', 'GMT', 'EST', 'PST', 'CST', 'MST'];

    useEffect(() => {
        if (role !== 'super_admin') {
            router.push('/my-schedule');
            return;
        }
        loadSchedules();
        loadEmployees();
    }, [role]);

    async function loadSchedules() {
        try {
            setLoading(true);
            const response = await axios.get('/api/schedules');
            setSchedules(response.data.schedules);
        } catch (error) {
            console.error('Error loading schedules:', error);
            alert('Failed to load schedules. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }

    async function loadEmployees() {
        try {
            const response = await axios.get('/api/admin', { params: { limit: 100 } });
            setEmployees(response.data.employees);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    function generateTimeSlots() {
        const slots = [];
        // Generate slots from 5:00 AM to 8:00 PM (30 slots = 15 hours)
        for (let i = 0; i < 30; i++) {
            const hour = Math.floor(i / 2) + 5;
            const minute = i % 2 === 0 ? '00' : '30';
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 12 ? 12 : hour;
            const time = `${displayHour}:${minute} ${period}`;
            
            slots.push({
                time,
                monday: '',
                tuesday: '',
                wednesday: '',
                thursday: '',
                friday: '',
                saturday: '',
                sunday: ''
            });
        }
        return slots;
    }

    function handleNewSchedule() {
        setEditingSchedule(null);
        setFormData({
            employee: '',
            weekStartDate: '',
            startTime: '5:00 AM',
            timezone: 'EAT (Kenya)',
            timeSlots: generateTimeSlots(),
            importantTasks: ''
        });
        setShowForm(true);
    }

    async function handleEdit(schedule) {
        setEditingSchedule(schedule);
        setFormData({
            employee: schedule.employee,
            weekStartDate: new Date(schedule.weekStartDate).toISOString().split('T')[0],
            startTime: schedule.startTime,
            timezone: schedule.timezone,
            timeSlots: schedule.timeSlots.length > 0 ? schedule.timeSlots : generateTimeSlots(),
            importantTasks: schedule.importantTasks || ''
        });
        setShowForm(true);
    }

    function updateTimeSlot(index, day, value) {
        const newSlots = [...formData.timeSlots];
        newSlots[index][day] = value;
        setFormData({ ...formData, timeSlots: newSlots });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!formData.employee || !formData.weekStartDate) {
            alert('Please select an employee and week start date.');
            return;
        }
        
        try {
            setSaving(true);
            if (editingSchedule) {
                await axios.put('/api/schedules', {
                    _id: editingSchedule._id,
                    startTime: formData.startTime,
                    timezone: formData.timezone,
                    timeSlots: formData.timeSlots,
                    importantTasks: formData.importantTasks
                });
                alert('✅ Schedule updated successfully!');
            } else {
                await axios.post('/api/schedules', formData);
                alert('✅ Schedule created successfully!');
            }
            setShowForm(false);
            await loadSchedules();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('❌ ' + (error.response?.data?.error || 'Failed to save schedule. Please try again.'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(scheduleId) {
        if (confirm('⚠️ Are you sure you want to delete this schedule? This action cannot be undone.')) {
            try {
                setLoading(true);
                await axios.delete(`/api/schedules?id=${scheduleId}`);
                alert('✅ Schedule deleted successfully!');
                await loadSchedules();
            } catch (error) {
                console.error('Error deleting schedule:', error);
                alert('❌ Failed to delete schedule. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    }

    if (role !== 'super_admin') {
        return null;
    }

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Manage Schedules</h1>
                            <p className="text-gray-600 mt-1">Create and manage employee weekly schedules</p>
                        </div>
                        <button
                            onClick={handleNewSchedule}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Create Schedule
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">Loading schedules...</p>
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a schedule for an employee.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Week Starting
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Start Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Timezone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {schedules.map((schedule) => (
                                        <tr key={schedule._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{schedule.employeeName}</div>
                                                <div className="text-sm text-gray-500">{schedule.employeeEmail}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(schedule.weekStartDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {schedule.startTime}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {schedule.timezone}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {schedule.createdByName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(schedule)}
                                                        disabled={loading}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                        </svg>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(schedule._id)}
                                                        disabled={loading}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
                            <h2 className="text-xl font-bold">
                                {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Employee *
                                    </label>
                                    <select
                                        required
                                        disabled={!!editingSchedule}
                                        value={formData.employee}
                                        onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>
                                                {emp.name} ({emp.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Week Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        disabled={!!editingSchedule}
                                        value={formData.weekStartDate}
                                        onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Time
                                    </label>
                                    <select
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {timeOptions.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Timezone
                                    </label>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Weekly Schedule
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    💡 Tip: Tasks can span multiple time slots. Just enter the same task across multiple rows for longer activities.
                                </p>
                                <div className="overflow-x-auto border rounded-lg max-h-[500px] overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mon</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tue</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wed</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thu</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fri</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sat</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sun</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {formData.timeSlots.map((slot, index) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                                                        {slot.time}
                                                    </td>
                                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                                        <td key={day} className="px-3 py-2">
                                                            <textarea
                                                                value={slot[day]}
                                                                onChange={(e) => updateTimeSlot(index, day, e.target.value)}
                                                                className="w-full min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none hover:border-gray-400 transition-colors"
                                                                placeholder="Enter task..."
                                                                rows={2}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Important Tasks
                                </label>
                                <textarea
                                    value={formData.importantTasks}
                                    onChange={(e) => setFormData({ ...formData, importantTasks: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="List any important tasks for the week..."
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            <span>{editingSchedule ? 'Update Schedule' : 'Create Schedule'}</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    disabled={saving}
                                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
