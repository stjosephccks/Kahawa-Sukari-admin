import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';

export default function AbsencesPage() {
    const [absences, setAbsences] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingAbsence, setEditingAbsence] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const { role } = useAuth();

    const absenceTypes = [
        { value: 'vacation', label: 'Vacation', color: '#059669' },
        { value: 'personal', label: 'Personal', color: '#7c3aed' },
        { value: 'sick', label: 'Sick', color: '#2563eb' },
        { value: 'custom1', label: 'Custom 1', color: '#d97706' },
        { value: 'custom2', label: 'Custom 2', color: '#dc2626' }
    ];

    const [formData, setFormData] = useState({
        employee: '',
        absenceType: 'vacation',
        startDate: '',
        endDate: '',
        reason: '',
        requestedBy: 'admin',
        notes: ''
    });

    useEffect(() => {
        loadAbsences();
        loadEmployees();
    }, [pagination.page, searchTerm, statusFilter, typeFilter]);

    async function loadAbsences() {
        try {
            const response = await axios.get('/api/absences', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: searchTerm,
                    status: statusFilter,
                    absenceType: typeFilter
                }
            });
            setAbsences(response.data.absences);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading absences:', error);
            alert('Failed to load absences');
        }
    }

    async function loadEmployees() {
        try {
            const response = await axios.get('/api/employees', {
                params: { limit: 1000, status: 'active' }
            });
            setEmployees(response.data.employees);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    function handleEdit(absence) {
        setEditingAbsence(absence);
        setFormData({
            employee: absence.employee._id || absence.employee,
            absenceType: absence.absenceType,
            startDate: new Date(absence.startDate).toISOString().split('T')[0],
            endDate: new Date(absence.endDate).toISOString().split('T')[0],
            reason: absence.reason || '',
            requestedBy: absence.requestedBy,
            notes: absence.notes || ''
        });
        setShowForm(true);
    }

    function handleAdd() {
        setEditingAbsence(null);
        setFormData({
            employee: '',
            absenceType: 'vacation',
            startDate: '',
            endDate: '',
            reason: '',
            requestedBy: 'admin',
            notes: ''
        });
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingAbsence) {
                await axios.put('/api/absences', {
                    _id: editingAbsence._id,
                    ...formData
                });
            } else {
                await axios.post('/api/absences', formData);
            }
            setShowForm(false);
            loadAbsences();
        } catch (error) {
            console.error('Error saving absence:', error);
            alert(error.response?.data?.error || 'Failed to save absence');
        }
    }

    async function handleApprove(id) {
        if (confirm('Approve this absence request?')) {
            try {
                await axios.put('/api/absences', {
                    _id: id,
                    status: 'approved',
                    approvedBy: 'Admin'
                });
                loadAbsences();
            } catch (error) {
                console.error('Error approving absence:', error);
                alert('Failed to approve absence');
            }
        }
    }

    async function handleReject(id) {
        const reason = prompt('Enter rejection reason:');
        if (reason) {
            try {
                await axios.put('/api/absences', {
                    _id: id,
                    status: 'rejected',
                    rejectionReason: reason
                });
                loadAbsences();
            } catch (error) {
                console.error('Error rejecting absence:', error);
                alert('Failed to reject absence');
            }
        }
    }

    async function handleDelete(id) {
        if (confirm('Are you sure you want to delete this absence record?')) {
            try {
                await axios.delete(`/api/absences?id=${id}`);
                loadAbsences();
            } catch (error) {
                console.error('Error deleting absence:', error);
                alert('Failed to delete absence');
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

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-800">Absence Management</h1>
                        <button
                            onClick={handleAdd}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors font-medium"
                        >
                            + Record Absence
                        </button>
                    </div>

                    <div className="flex gap-4 mb-4 flex-wrap">
                        <input
                            type="text"
                            placeholder="Search by employee name or number..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Types</option>
                            {absenceTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 shadow-sm mb-4">
                        <div className="flex items-center gap-6 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700">Absence Types:</span>
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
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Requested By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {absences.map((absence) => (
                                    <tr key={absence._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {absence.employeeName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {absence.employeeNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span 
                                                className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                                                style={{backgroundColor: getTypeColor(absence.absenceType)}}
                                            >
                                                {absenceTypes.find(t => t.value === absence.absenceType)?.label}
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(absence.status)}`}>
                                                {absence.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {absence.requestedBy}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                {absence.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(absence._id)}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(absence._id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(absence)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                                {role === 'super_admin' && (
                                                    <button
                                                        onClick={() => handleDelete(absence._id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= pagination.pages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                                    <span className="font-medium">{pagination.pages}</span> ({pagination.total} total)
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page >= pagination.pages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {editingAbsence ? 'Edit Absence' : 'Record New Absence'}
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Employee *
                                    </label>
                                    <select
                                        required
                                        value={formData.employee}
                                        onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={!!editingAbsence}
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>
                                                {emp.fullName} ({emp.employeeNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Absence Type *
                                    </label>
                                    <select
                                        required
                                        value={formData.absenceType}
                                        onChange={(e) => setFormData({ ...formData, absenceType: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {absenceTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows="2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    {editingAbsence ? 'Update' : 'Record'} Absence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium"
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
