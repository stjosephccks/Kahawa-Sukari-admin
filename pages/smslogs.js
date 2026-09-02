import Layout from "@/components/Layout";
import axios from "axios";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SmsLogs() {
    const [logs, setLogs] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [templateTypeFilter, setTemplateTypeFilter] = useState('');
    const [zakaNumberFilter, setZakaNumberFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
    const { canDelete } = useAuth();

    useEffect(() => {
        loadLogs();
    }, [pagination.page, statusFilter, templateTypeFilter, zakaNumberFilter]);

    function loadLogs() {
        axios.get('/api/smslogs', {
            params: {
                page: pagination.page,
                limit: pagination.limit,
                status: statusFilter,
                templateType: templateTypeFilter,
                zakaNumber: zakaNumberFilter
            }
        }).then(response => {
            setLogs(response.data.logs);
            setPagination(response.data.pagination);
        });
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this log entry?')) return;
        try {
            await axios.delete('/api/smslogs?id=' + id);
            loadLogs();
        } catch (error) {
            console.error('Error deleting log:', error);
            alert('Failed to delete log');
        }
    }

    function getStatusBadge(status) {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            sent: 'bg-blue-100 text-blue-800',
            failed: 'bg-red-100 text-red-800',
            delivered: 'bg-green-100 text-green-800',
            test: 'bg-gray-100 text-gray-800'
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">SMS Logs</h1>

                <div className="mb-4 flex gap-4 flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPagination({...pagination, page: 1}); }}
                        className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                        <option value="delivered">Delivered</option>
                        <option value="test">Test</option>
                    </select>

                    <select
                        value={templateTypeFilter}
                        onChange={(e) => { setTemplateTypeFilter(e.target.value); setPagination({...pagination, page: 1}); }}
                        className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">All Types</option>
                        <option value="mpesa_confirmation">M-Pesa Confirmation</option>
                        <option value="weekly_reminder">Weekly Reminder</option>
                        <option value="payment_reminder">Payment Reminder</option>
                        <option value="custom">Custom</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Filter by Zaka Number"
                        value={zakaNumberFilter}
                        onChange={(e) => { setZakaNumberFilter(e.target.value); setPagination({...pagination, page: 1}); }}
                        className="px-4 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Recipient</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Zaka #</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Type</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Message</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Error</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">{log.recipient}</td>
                                    <td className="px-6 py-4 text-sm">{log.recipientName}</td>
                                    <td className="px-6 py-4 text-sm">{log.zakaNumber}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                            {log.templateType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-sm ${getStatusBadge(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm max-w-xs truncate" title={log.message}>
                                        {log.message}
                                    </td>
                                    <td className="px-6 py-4 text-sm max-w-xs truncate text-red-600" title={log.error}>
                                        {log.error || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(log._id)}
                                                className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination.pages > 1 && (
                    <div className="mt-4 flex justify-center gap-2">
                        {[...Array(pagination.pages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPagination({...pagination, page: i + 1})}
                                className={`px-4 py-2 rounded-md ${
                                    pagination.page === i + 1
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
