import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import { useSession } from "next-auth/react";

export default function MyLeavePage() {
    const { data: session } = useSession();
    const [myAbsences, setMyAbsences] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const absenceTypes = [
        { value: 'vacation', label: 'Vacation', color: '#059669' },
        { value: 'personal', label: 'Personal', color: '#7c3aed' },
        { value: 'sick', label: 'Sick', color: '#2563eb' },
        { value: 'custom1', label: 'Custom 1', color: '#d97706' },
        { value: 'custom2', label: 'Custom 2', color: '#dc2626' }
    ];

    const [formData, setFormData] = useState({
        absenceType: 'vacation',
        customTypeName: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        if (session?.user?.email) {
            loadMyAbsences();
        }
    }, [session]);

    async function loadMyAbsences() {
        try {
            const userResponse = await axios.get('/api/admin', {
                params: { search: session.user.email, limit: 1 }
            });
            
            if (userResponse.data.employees && userResponse.data.employees.length > 0) {
                const user = userResponse.data.employees[0];
                setCurrentUser(user);
                
                const absencesResponse = await axios.get('/api/absences', {
                    params: { userId: user._id, limit: 100 }
                });
                setMyAbsences(absencesResponse.data.absences);
            }
        } catch (error) {
            console.error('Error loading absences:', error);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        
        try {
            const userResponse = await axios.get('/api/admin', {
                params: { search: session.user.email, limit: 1 }
            });
            
            if (userResponse.data.employees && userResponse.data.employees.length > 0) {
                const userId = userResponse.data.employees[0]._id;
                
                await axios.post('/api/absences', {
                    user: userId,
                    absenceType: formData.absenceType,
                    customTypeName: formData.customTypeName,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    reason: formData.reason
                });
                
                setShowForm(false);
                setFormData({
                    absenceType: 'vacation',
                    customTypeName: '',
                    startDate: '',
                    endDate: '',
                    reason: ''
                });
                loadMyAbsences();
                alert('Leave request submitted successfully!');
            }
        } catch (error) {
            console.error('Error submitting leave request:', error);
            alert(error.response?.data?.error || 'Failed to submit leave request');
        } finally {
            setLoading(false);
        }
    }

    async function handleCancel(absenceId) {
        if (confirm('Are you sure you want to cancel this leave request?')) {
            try {
                await axios.delete(`/api/absences?id=${absenceId}`);
                loadMyAbsences();
                alert('Leave request cancelled successfully');
            } catch (error) {
                console.error('Error cancelling request:', error);
                alert('Failed to cancel leave request');
            }
        }
    }

    function getStatusBadge(status) {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return styles[status] || styles.pending;
    }

    function getTypeColor(type) {
        const typeObj = absenceTypes.find(t => t.value === type);
        return typeObj?.color || '#6b7280';
    }

    function calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">My Leave Requests</h1>
                            <p className="text-gray-600 mt-1">Request and manage your leave days</p>
                            {currentUser && currentUser.employeeNumber && (
                                <p className="text-sm text-blue-600 font-mono mt-1">
                                    Employee #: {currentUser.employeeNumber}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors font-medium"
                        >
                            + Request Leave
                        </button>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 shadow-sm mb-4">
                        <div className="flex items-center gap-6 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700">Leave Types:</span>
                            {absenceTypes.map(type => (
                                <div key={type.value} className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: type.color}}></span>
                                    <span className="text-sm text-gray-600">{type.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {myAbsences.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by requesting your first leave.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Start Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            End Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Days
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {myAbsences.map((absence) => (
                                        <tr key={absence._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span 
                                                    className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                                                    style={{backgroundColor: getTypeColor(absence.absenceType)}}
                                                >
                                                    {absence.customTypeName || absenceTypes.find(t => t.value === absence.absenceType)?.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(absence.startDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(absence.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {absence.totalDays}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {absence.reason || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(absence.status)}`}>
                                                    {absence.status}
                                                </span>
                                                {absence.status === 'rejected' && absence.rejectionReason && (
                                                    <p className="text-xs text-red-600 mt-1">{absence.rejectionReason}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {absence.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancel(absence._id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
                            <h2 className="text-xl font-bold">Request Leave</h2>
                            <p className="text-sm opacity-90 mt-1">Submit your leave request for approval</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Leave Type *
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

                                {formData.startDate && formData.endDate && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-800">
                                            <span className="font-semibold">Total Days:</span> {calculateDays(formData.startDate, formData.endDate)}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason *
                                    </label>
                                    <textarea
                                        required
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        rows="3"
                                        placeholder="Please provide a reason for your leave request..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-md transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Submit Request'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    disabled={loading}
                                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50"
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
