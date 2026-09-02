import Layout from "@/components/Layout";
import axios from "axios";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function UnmatchedMpesa() {
    const [payments, setPayments] = useState([]);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(null);
    const [processedFilter, setProcessedFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
    const { canPublish, canDelete } = useAuth();

    const [formData, setFormData] = useState({
        assignedZakaNumber: '',
        assignedMonth: new Date().toLocaleString('default', { month: 'long' }),
        assignedYear: new Date().getFullYear()
    });

    useEffect(() => {
        loadPayments();
    }, [pagination.page, processedFilter]);

    function loadPayments() {
        axios.get('/api/unmatched-mpesa', {
            params: {
                page: pagination.page,
                limit: pagination.limit,
                manuallyProcessed: processedFilter
            }
        }).then(response => {
            setPayments(response.data.payments);
            setPagination(response.data.pagination);
        });
    }

    function handleProcess(payment) {
        setProcessingPayment(payment);
        setFormData({
            assignedZakaNumber: payment.billRefNumber || '',
            assignedMonth: new Date().toLocaleString('default', { month: 'long' }),
            assignedYear: new Date().getFullYear()
        });
        setShowProcessModal(true);
    }

    async function handleSubmitProcess(e) {
        e.preventDefault();
        try {
            await axios.post('/api/unmatched-mpesa', {
                _id: processingPayment._id,
                ...formData
            });
            setShowProcessModal(false);
            loadPayments();
        } catch (error) {
            console.error('Error processing payment:', error);
            alert(error.response?.data?.error || 'Failed to process payment');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this unmatched payment?')) return;
        try {
            await axios.delete('/api/unmatched-mpesa?id=' + id);
            loadPayments();
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert('Failed to delete payment');
        }
    }

    function getPaybillSourceBadge(source) {
        const styles = {
            'Parish': 'bg-green-100 text-green-800',
            'Outstation': 'bg-blue-100 text-blue-800',
            'Unknown': 'bg-gray-100 text-gray-800'
        };
        return styles[source] || 'bg-gray-100 text-gray-800';
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Unmatched M-Pesa Payments</h1>

                <div className="mb-4 flex gap-4 flex-wrap">
                    <select
                        value={processedFilter}
                        onChange={(e) => { setProcessedFilter(e.target.value); setPagination({...pagination, page: 1}); }}
                        className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">All</option>
                        <option value="false">Unprocessed</option>
                        <option value="true">Processed</option>
                    </select>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Trans ID</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Amount</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Phone</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Ref #</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Paybill</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Reason</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm">
                                        {new Date(payment.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono">{payment.transID}</td>
                                    <td className="px-6 py-4 text-sm">KES {payment.transAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm">{payment.msisdn}</td>
                                    <td className="px-6 py-4 text-sm">{payment.billRefNumber || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-sm ${getPaybillSourceBadge(payment.paybillSource)}`}>
                                            {payment.paybillSource}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {payment.manuallyProcessed ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                                Processed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                                                Unprocessed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm max-w-xs truncate" title={payment.reason}>
                                        {payment.reason}
                                    </td>
                                    <td className="px-6 py-4">
                                        {!payment.manuallyProcessed && canPublish && (
                                            <button
                                                onClick={() => handleProcess(payment)}
                                                className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 mr-2"
                                            >
                                                Process
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(payment._id)}
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

                {showProcessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h2 className="text-xl font-bold mb-4">Process Unmatched Payment</h2>
                            <div className="mb-4 p-4 bg-gray-50 rounded text-sm">
                                <p><strong>Trans ID:</strong> {processingPayment.transID}</p>
                                <p><strong>Amount:</strong> KES {processingPayment.transAmount.toLocaleString()}</p>
                                <p><strong>Phone:</strong> {processingPayment.msisdn}</p>
                                <p><strong>Ref #:</strong> {processingPayment.billRefNumber || 'N/A'}</p>
                            </div>
                            <form onSubmit={handleSubmitProcess}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Zaka Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.assignedZakaNumber}
                                            onChange={(e) => setFormData({...formData, assignedZakaNumber: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="Enter zaka number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                                        <select
                                            required
                                            value={formData.assignedMonth}
                                            onChange={(e) => setFormData({...formData, assignedMonth: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            {months.map(month => (
                                                <option key={month} value={month}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                        <select
                                            required
                                            value={formData.assignedYear}
                                            onChange={(e) => setFormData({...formData, assignedYear: parseInt(e.target.value)})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            {years.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowProcessModal(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Process Payment
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
