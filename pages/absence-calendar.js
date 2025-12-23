import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function AbsenceCalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [absences, setAbsences] = useState([]);
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const { role } = useAuth();
    const router = useRouter();

    const absenceTypes = [
        { value: 'vacation', label: 'Vacation', color: '#059669', shortCode: 'V' },
        { value: 'personal', label: 'Personal', color: '#7c3aed', shortCode: 'P' },
        { value: 'sick', label: 'Sick', color: '#2563eb', shortCode: 'S' },
        { value: 'custom1', label: 'Custom 1', color: '#d97706', shortCode: 'C1' },
        { value: 'custom2', label: 'Custom 2', color: '#dc2626', shortCode: 'C2' }
    ];

    const [formData, setFormData] = useState({
        user: '',
        absenceType: 'vacation',
        customTypeName: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, [currentDate]);

    async function loadData() {
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            const [absencesRes, usersRes] = await Promise.all([
                axios.get('/api/absences', {
                    params: {
                        month,
                        year,
                        limit: 1000,
                        status: 'approved'
                    }
                }),
                axios.get('/api/admin', {
                    params: {
                        limit: 1000,
                        status: 'active'
                    }
                })
            ]);

            setAbsences(absencesRes.data.absences);
            setUsers(usersRes.data.employees);
        } catch (error) {
            console.error('Error loading data:', error);
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

    function isDateInAbsence(date, absence) {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const startDate = new Date(absence.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(absence.endDate);
        endDate.setHours(0, 0, 0, 0);
        return checkDate >= startDate && checkDate <= endDate;
    }

    function getUserAbsenceForDate(userId, date) {
        return absences.find(absence => {
            const absenceUserId = typeof absence.user === 'object' ? absence.user._id : absence.user;
            return absenceUserId === userId && isDateInAbsence(date, absence);
        });
    }

    function handleCellClick(user, date) {
        if (role !== 'super_admin') return;
        setSelectedUser(user);
        setSelectedDate(date);
        setFormData({
            user: user._id,
            absenceType: 'vacation',
            customTypeName: '',
            startDate: format(date, 'yyyy-MM-dd'),
            endDate: format(date, 'yyyy-MM-dd'),
            reason: ''
        });
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await axios.post('/api/absences', formData);
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error('Error saving absence:', error);
            alert(error.response?.data?.error || 'Failed to save absence');
        }
    }


    return (
        <Layout>
            <div className="max-w-[1600px] mx-auto px-2 sm:px-4 py-4 sm:py-6">
                <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Employee Absence Calendar</h1>
                        <div className="flex gap-2 items-center justify-between sm:justify-end">
                            <button
                                onClick={handlePreviousMonth}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                ← Prev
                            </button>
                            <div className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm sm:text-base whitespace-nowrap">
                                {format(currentDate, 'MMM yyyy')}
                            </div>
                            <button
                                onClick={handleNextMonth}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Next →
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 shadow-sm">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-gray-700 w-full sm:w-auto">Absence type key:</span>
                            {absenceTypes.map(type => (
                                <div key={type.value} className="flex items-center gap-1.5">
                                    <span 
                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-white text-xs font-bold" 
                                        style={{backgroundColor: type.color}}
                                    >
                                        {type.shortCode}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-600">{type.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="sticky left-0 z-20 bg-gray-100 border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[180px]">
                                        Employee name
                                    </th>
                                    {daysInMonth.map(day => {
                                        const dayOfWeek = getDay(day);
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                        return (
                                            <th 
                                                key={day.toString()} 
                                                className={`border border-gray-300 px-2 py-2 text-center text-xs font-medium min-w-[40px] ${
                                                    isWeekend ? 'bg-gray-200' : 'bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-gray-500 text-[10px]">
                                                        {format(day, 'EEE')}
                                                    </span>
                                                    <span className="text-gray-900 font-bold">
                                                        {format(day, 'd')}
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th className="sticky right-0 z-20 bg-gray-100 border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[100px]">
                                        Total days
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user, userIndex) => (
                                    <tr key={user._id} className={userIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="sticky left-0 z-10 border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 bg-inherit">
                                            <div className="flex flex-col">
                                                <span>{user.name}</span>
                                                <span className="text-xs text-gray-500">{user.email}</span>
                                            </div>
                                        </td>
                                        {daysInMonth.map(day => {
                                            const absence = getUserAbsenceForDate(user._id, day);
                                            const dayOfWeek = getDay(day);
                                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                            const typeInfo = absence ? absenceTypes.find(t => t.value === absence.absenceType) : null;
                                            
                                            return (
                                                <td 
                                                    key={day.toString()} 
                                                    className={`border border-gray-300 px-1 py-1 text-center cursor-pointer hover:bg-blue-100 transition-colors ${
                                                        isWeekend ? 'bg-gray-100' : ''
                                                    }`}
                                                    onClick={() => handleCellClick(user, day)}
                                                >
                                                    {absence && typeInfo && (
                                                        <div 
                                                            className="w-8 h-8 mx-auto rounded flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                                            style={{backgroundColor: typeInfo.color}}
                                                            title={`${typeInfo.label}: ${absence.reason || 'No reason provided'}`}
                                                        >
                                                            {typeInfo.shortCode}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="sticky right-0 z-10 border border-gray-300 px-4 py-3 text-center text-lg font-bold text-gray-900 bg-inherit">
                                            {user.totalAbsenceDays || 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-900">How to use:</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Click on any cell to record an absence for that employee on that date. 
                                Weekend days are highlighted in gray. Hover over absence markers to see details.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
                            <h2 className="text-xl font-bold">
                                Record Absence for {selectedUser?.name}
                            </h2>
                            <p className="text-sm opacity-90 mt-1">
                                {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Absence Type *
                                    </label>
                                    <select
                                        required
                                        value={formData.absenceType}
                                        onChange={(e) => setFormData({ ...formData, absenceType: e.target.value, customTypeName: '' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {absenceTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {(formData.absenceType === 'custom1' || formData.absenceType === 'custom2') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Custom Leave Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.customTypeName}
                                            onChange={(e) => setFormData({ ...formData, customTypeName: e.target.value })}
                                            placeholder="e.g., Maternity, Study, Training"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Start Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason
                                    </label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        rows="3"
                                        placeholder="Optional reason for absence..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-md transition-colors"
                                >
                                    Record Absence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
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
