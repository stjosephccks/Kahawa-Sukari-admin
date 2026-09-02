import Layout from "@/components/Layout";
import axios from "axios";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SendPaymentSMS() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [summary, setSummary] = useState(null);
    const [sending, setSending] = useState(false);
    const { canPublish } = useAuth();

    useEffect(() => {
        loadSummary();
    }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

    function loadSummary() {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        axios.get('/api/zakapayments/weekly-reminder', { params })
            .then(response => {
                setSummary(response.data);
            })
            .catch(error => {
                console.error('Error loading summary:', error);
            });
    }

    async function handleSendSMS() {
        if (!confirm('Send SMS to all cash payments in this date range?')) return;
        
        setSending(true);
        try {
            const response = await axios.post('/api/zakapayments/weekly-reminder', {
                startDate,
                endDate,
                testOnly: false
            });
            alert(response.data.message);
            loadSummary();
        } catch (error) {
            console.error('Error sending SMS:', error);
            alert(error.response?.data?.error || 'Failed to send SMS');
        } finally {
            setSending(false);
        }
    }

    function setThisWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        setStartDate(startOfWeek.toISOString().split('T')[0]);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        setEndDate(endOfWeek.toISOString().split('T')[0]);
    }

    function setLastWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() - 7);
        setStartDate(startOfWeek.toISOString().split('T')[0]);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        setEndDate(endOfWeek.toISOString().split('T')[0]);
    }

    function setThisMonth() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(startOfMonth.toISOString().split('T')[0]);
        setEndDate(endOfMonth.toISOString().split('T')[0]);
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Send Payment SMS</h1>

                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Date Range</h2>
                    
                    <div className="flex gap-4 mb-4 flex-wrap">
                        <button
                            onClick={setThisWeek}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            This Week
                        </button>
                        <button
                            onClick={setLastWeek}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Last Week
                        </button>
                        <button
                            onClick={setThisMonth}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            This Month
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>

                    {canPublish && (
                        <button
                            onClick={handleSendSMS}
                            disabled={sending}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                        >
                            {sending ? 'Sending...' : 'Send SMS'}
                        </button>
                    )}
                </div>

                {summary && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">Total Payments</div>
                                <div className="text-2xl font-bold text-blue-600">{summary.totalPayments}</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">Unique Members</div>
                                <div className="text-2xl font-bold text-green-600">{summary.uniquePayments}</div>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">SMS Sent</div>
                                <div className="text-2xl font-bold text-emerald-600">{summary.smsSent}</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">SMS Failed</div>
                                <div className="text-2xl font-bold text-red-600">{summary.smsFailed}</div>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600">
                            <p><strong>Date Range:</strong> {new Date(summary.dateRange.start).toLocaleDateString()} - {new Date(summary.dateRange.end).toLocaleDateString()}</p>
                            <p><strong>Pending SMS:</strong> {summary.smsPending}</p>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
