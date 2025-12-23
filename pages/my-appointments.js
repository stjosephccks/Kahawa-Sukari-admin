import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';

export default function MyAppointmentsPage() {
    const [appointments, setAppointments] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [loading, setLoading] = useState(false);
    const { role } = useAuth();
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user?.email) {
            if (role === 'super_admin') {
                loadEmployees();
            } else {
                loadMyAppointments();
            }
        }
    }, [session, role]);

    useEffect(() => {
        if (role === 'super_admin' && selectedEmployee) {
            loadAppointmentsForEmployee(selectedEmployee);
        }
    }, [selectedEmployee]);

    async function loadEmployees() {
        try {
            const response = await axios.get('/api/admin', { params: { limit: 100 } });
            setEmployees(response.data.employees);
            
            const currentUser = response.data.employees.find(emp => emp.email === session?.user?.email);
            
            if (currentUser) {
                const appointmentResponse = await axios.get('/api/appointments', {
                    params: { employeeId: currentUser._id }
                });
                
                if (appointmentResponse.data.appointments.length > 0) {
                    setSelectedEmployee(currentUser._id);
                } else if (response.data.employees.length > 0) {
                    setSelectedEmployee(response.data.employees[0]._id);
                }
            } else if (response.data.employees.length > 0) {
                setSelectedEmployee(response.data.employees[0]._id);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    async function loadMyAppointments() {
        try {
            setLoading(true);
            const response = await axios.get('/api/appointments');
            setAppointments(response.data.appointments);
            if (response.data.appointments.length > 0) {
                setSelectedAppointment(response.data.appointments[0]);
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadAppointmentsForEmployee(employeeId) {
        try {
            setLoading(true);
            const response = await axios.get('/api/appointments', {
                params: { employeeId }
            });
            setAppointments(response.data.appointments);
            if (response.data.appointments.length > 0) {
                setSelectedAppointment(response.data.appointments[0]);
            } else {
                setSelectedAppointment(null);
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {role === 'super_admin' ? 'Employee Appointments' : 'My Appointments'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {role === 'super_admin' ? 'View employee daily appointment calendars' : 'View your daily appointment calendar'}
                    </p>
                </div>

                {role === 'super_admin' && employees.length > 0 && (
                    <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Employee
                        </label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.name} ({emp.email})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading appointments...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No appointment calendars assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">Your admin will create an appointment calendar for you.</p>
                    </div>
                ) : (
                    <>
                        {appointments.length > 1 && (
                            <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Date
                                </label>
                                <select
                                    value={selectedAppointment?._id || ''}
                                    onChange={(e) => {
                                        const selected = appointments.find(app => app._id === e.target.value);
                                        setSelectedAppointment(selected);
                                    }}
                                    className="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {appointments.map(app => (
                                        <option key={app._id} value={app._id}>
                                            {new Date(app.date).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedAppointment && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">DAILY APPOINTMENT CALENDAR</h2>
                                            <p className="text-white mt-1">{new Date(selectedAppointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <div className="text-4xl font-bold text-white">
                                            {new Date(selectedAppointment.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border border-gray-300">
                                            <thead className="bg-gray-800 text-white">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Time</th>
                                                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Appointment</th>
                                                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Phone Number</th>
                                                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedAppointment.timeSlots.map((slot, index) => (
                                                    <tr key={index} className={slot.appointment ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap bg-gray-50">
                                                            {slot.time}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {slot.appointment || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {slot.phoneNumber || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {slot.notes || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
