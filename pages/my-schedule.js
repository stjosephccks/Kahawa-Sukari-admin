import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import { useSession } from 'next-auth/react';

export default function MySchedulePage() {
    const [schedules, setSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user?.email) {
            loadMySchedules();
        }
    }, [session]);

    async function loadMySchedules() {
        try {
            const response = await axios.get('/api/schedules');
            setSchedules(response.data.schedules);
            if (response.data.schedules.length > 0) {
                setSelectedSchedule(response.data.schedules[0]);
            }
        } catch (error) {
            console.error('Error loading schedules:', error);
        }
    }

    function getWeekDateRange(weekStartDate) {
        const start = new Date(weekStartDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">My Schedule</h1>
                    <p className="text-gray-600 mt-1">View your weekly work schedule</p>
                </div>

                {schedules.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">Your admin will create a schedule for you.</p>
                    </div>
                ) : (
                    <>
                        {schedules.length > 1 && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Week
                                </label>
                                <select
                                    value={selectedSchedule?._id || ''}
                                    onChange={(e) => {
                                        const schedule = schedules.find(s => s._id === e.target.value);
                                        setSelectedSchedule(schedule);
                                    }}
                                    className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {schedules.map(schedule => (
                                        <option key={schedule._id} value={schedule._id}>
                                            Week of {new Date(schedule.weekStartDate).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedSchedule && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-8">
                                    <h2 className="text-4xl font-bold mb-2" style={{ fontFamily: 'cursive' }}>
                                        daily schedule
                                    </h2>
                                    <div className="flex gap-8 text-sm">
                                        <div>
                                            <span className="font-semibold">WEEK:</span> {new Date(selectedSchedule.weekStartDate).toLocaleDateString()}
                                        </div>
                                        <div>
                                            <span className="font-semibold">START TIME:</span> {selectedSchedule.startTime}
                                        </div>
                                        <div>
                                            <span className="font-semibold">TIMEZONE:</span> {selectedSchedule.timezone}
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="bg-orange-200">
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    TIME
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    MON
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    TUE
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    WED
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    THU
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    FRI
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    SAT
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                                                    SUN
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900">
                                                    IMPORTANT TASKS
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSchedule.timeSlots.map((slot, index) => (
                                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 border-r border-gray-300 bg-orange-50">
                                                        {slot.time}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.monday || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.tuesday || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.wednesday || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.thursday || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.friday || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.saturday || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300">
                                                        <div className="whitespace-pre-wrap">{slot.sunday || '-'}</div>
                                                    </td>
                                                    {index === 0 && (
                                                        <td 
                                                            rowSpan={selectedSchedule.timeSlots.length} 
                                                            className="px-4 py-3 text-sm text-gray-700 align-top bg-orange-50"
                                                        >
                                                            <div className="whitespace-pre-wrap">
                                                                {selectedSchedule.importantTasks || 'No important tasks listed'}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-gray-50 px-6 py-4 text-sm text-gray-600">
                                    <p>
                                        <span className="font-semibold">Created by:</span> {selectedSchedule.createdByName} on{' '}
                                        {new Date(selectedSchedule.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
