import { useState } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function AdminUtilitiesPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { role } = useAuth();
    const router = useRouter();

    if (role !== 'super_admin') {
        if (typeof window !== 'undefined') {
            router.push('/');
        }
        return null;
    }

    async function generateEmployeeNumbers() {
        if (!confirm('Generate employee numbers for all users without one? This will assign SJCCKS-XXXX format numbers.')) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await axios.post('/api/generate-employee-numbers');
            setResult(response.data);
            alert(`Success! Generated ${response.data.updates.length} employee numbers.`);
        } catch (error) {
            console.error('Error generating employee numbers:', error);
            alert(error.response?.data?.error || 'Failed to generate employee numbers');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Utilities</h1>
                    <p className="text-gray-600 mt-1">System maintenance and data management tools</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Generate Employee Numbers
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Automatically generate employee numbers (SJCCKS-XXXX format) for all users who don't have one yet.
                        </p>
                        <button
                            onClick={generateEmployeeNumbers}
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Generating...' : 'Generate Employee Numbers'}
                        </button>
                    </div>

                    {result && (
                        <div className="p-6 bg-green-50">
                            <h3 className="text-lg font-semibold text-green-800 mb-3">
                                ✓ {result.message}
                            </h3>
                            {result.updates && result.updates.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Updated Users:</h4>
                                    <div className="bg-white rounded-lg border border-green-200 max-h-64 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Name
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Employee Number
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {result.updates.map((update) => (
                                                    <tr key={update.id}>
                                                        <td className="px-4 py-2 text-sm text-gray-900">
                                                            {update.name}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm font-mono text-blue-600">
                                                            {update.employeeNumber}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-900">Note:</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Employee numbers are automatically generated for new users. Use this utility only to populate numbers for existing users who were created before this feature was implemented.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
