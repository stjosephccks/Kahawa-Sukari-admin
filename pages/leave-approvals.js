import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function LeaveApprovalsPage() {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingLeave, setEditingLeave] = useState(null);
    const { role } = useAuth();
    const router = useRouter();

    const [editFormData, setEditFormData] = useState({
        absenceType: 'vacation',
        customTypeName: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const absenceTypes = [
        { value: 'vacation', label: 'Vacation', color: '#059669' },
        { value: 'personal', label: 'Personal', color: '#7c3aed' },
        { value: 'sick', label: 'Sick', color: '#2563eb' },
        { value: 'custom1', label: 'Custom 1', color: '#d97706' },
        { value: 'custom2', label: 'Custom 2', color: '#dc2626' }
    ];

    useEffect(() => {
        if (role !== 'super_admin') {
            router.push('/');
            return;
        }
        loadRequests();
    }, [role, showAll]);

    async function loadRequests() {
        try {
            if (showAll) {
                const response = await axios.get('/api/absences', {
                    params: { limit: 100 }
                });
                setAllRequests(response.data.absences);
            } else {
                const response = await axios.get('/api/absences', {
                    params: { status: 'pending', limit: 100 }
                });
                setPendingRequests(response.data.absences);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    }

    async function handleApprove(absenceId) {
        if (confirm('Approve this leave request?')) {
            try {
                await axios.put('/api/absences', {
                    _id: absenceId,
                    status: 'approved',
                    approvedBy: 'Super Admin'
                });
                loadRequests();
                alert('Leave request approved successfully');
            } catch (error) {
                console.error('Error approving request:', error);
                alert('Failed to approve leave request');
            }
        }
    }

    async function handleReject(absenceId) {
        const reason = prompt('Enter rejection reason (optional):');
        try {
            await axios.put('/api/absences', {
                _id: absenceId,
                status: 'rejected',
                rejectionReason: reason || ''
            });
            loadRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert(error.response?.data?.error || 'Failed to reject request');
        }
    }

    function handleEdit(absence) {
        setEditingLeave(absence);
        setEditFormData({
            absenceType: absence.absenceType,
            customTypeName: absence.customTypeName || '',
            startDate: new Date(absence.startDate).toISOString().split('T')[0],
            endDate: new Date(absence.endDate).toISOString().split('T')[0],
            reason: absence.reason || ''
        });
        setShowEditForm(true);
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        try {
            await axios.put('/api/absences', {
                _id: editingLeave._id,
                absenceType: editFormData.absenceType,
                customTypeName: editFormData.customTypeName,
                startDate: editFormData.startDate,
                endDate: editFormData.endDate,
                reason: editFormData.reason
            });
            setShowEditForm(false);
            setEditingLeave(null);
            loadRequests();
        } catch (error) {
            console.error('Error updating leave:', error);
            alert(error.response?.data?.error || 'Failed to update leave');
        }
    }

    async function handleDelete(absenceId) {
        if (confirm('Are you sure you want to delete this leave request? This action cannot be undone.')) {
            try {
                await axios.delete(`/api/absences?id=${absenceId}`);
                loadRequests();
            } catch (error) {
                console.error('Error deleting leave:', error);
                alert(error.response?.data?.error || 'Failed to delete leave');
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

    const displayRequests = showAll ? allRequests : pendingRequests;

    if (role !== 'super_admin') {
        return null;
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Leave Approvals</h1>
                            <p className="text-gray-600 mt-1">Review and process employee leave requests</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAll(false)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    !showAll 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Pending ({pendingRequests.length})
                            </button>
                            <button
                                onClick={() => setShowAll(true)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    showAll 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                All Requests
                            </button>
                        </div>
                    </div>

                    {!showAll && pendingRequests.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium text-yellow-800">
                                    You have {pendingRequests.length} pending leave request{pendingRequests.length !== 1 ? 's' : ''} awaiting approval
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {displayRequests.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No {!showAll && 'pending '}requests</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {!showAll ? 'All leave requests have been processed.' : 'No leave requests found.'}
                            </p>
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
                                    {displayRequests.map((absence) => (
                                        <tr key={absence._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {absence.userName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {absence.userEmail}
                                                </div>
                                                {absence.employeeNumber && (
                                                    <div className="text-xs text-blue-600 font-mono mt-1">
                                                        {absence.employeeNumber}
                                                    </div>
                                                )}
                                            </td>
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
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                <div className="truncate" title={absence.reason}>
                                                    {absence.reason || '-'}
                                                </div>
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
                                                <div className="flex gap-2">
                                                    {absence.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(absence._id)}
                                                                className="text-green-600 hover:text-green-900 font-medium"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(absence._id)}
                                                                className="text-red-600 hover:text-red-900 font-medium"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleEdit(absence)}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(absence._id)}
                                                        className="text-red-600 hover:text-red-900 font-medium"
                                                    >
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

                {showEditForm && editingLeave && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h3 className="text-xl font-semibold mb-4">Edit Leave Request</h3>
                            <form onSubmit={handleEditSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Employee
                                        </label>
                                        <input
                                            type="text"
                                            value={editingLeave.userName}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Leave Type *
                                        </label>
                                        <select
                                            required
                                            value={editFormData.absenceType}
                                            onChange={(e) => setEditFormData({ ...editFormData, absenceType: e.target.value, customTypeName: '' })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {absenceTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {(editFormData.absenceType === 'custom1' || editFormData.absenceType === 'custom2') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Custom Leave Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={editFormData.customTypeName}
                                                onChange={(e) => setEditFormData({ ...editFormData, customTypeName: e.target.value })}
                                                placeholder="e.g., Maternity, Study, Training"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Start Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={editFormData.startDate}
                                            onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
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
                                            value={editFormData.endDate}
                                            onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Reason
                                        </label>
                                        <textarea
                                            value={editFormData.reason}
                                            onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        Update Leave
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditForm(false);
                                            setEditingLeave(null);
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
