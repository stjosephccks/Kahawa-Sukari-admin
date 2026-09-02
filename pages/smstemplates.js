import Layout from "@/components/Layout";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SmsTemplates() {
    const [templates, setTemplates] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [typeFilter, setTypeFilter] = useState('');
    const { canPublish, canDelete } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        template: '',
        type: 'mpesa_confirmation',
        isActive: true
    });

    useEffect(() => {
        loadTemplates();
    }, [typeFilter]);

    function loadTemplates() {
        axios.get('/api/smstemplates', {
            params: { type: typeFilter }
        }).then(response => {
            setTemplates(response.data.templates);
        });
    }

    function handleEdit(template) {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            template: template.template,
            type: template.type,
            isActive: template.isActive
        });
        setShowForm(true);
    }

    function handleAdd() {
        setEditingTemplate(null);
        setFormData({
            name: '',
            template: '',
            type: 'mpesa_confirmation',
            isActive: true
        });
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingTemplate) {
                await axios.put('/api/smstemplates', {
                    _id: editingTemplate._id,
                    ...formData
                });
            } else {
                await axios.post('/api/smstemplates', formData);
            }
            setShowForm(false);
            loadTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await axios.delete('/api/smstemplates?id=' + id);
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        }
    }

    async function toggleActive(id, currentStatus) {
        try {
            await axios.put('/api/smstemplates', {
                _id: id,
                isActive: !currentStatus
            });
            loadTemplates();
        } catch (error) {
            console.error('Error toggling template:', error);
            alert('Failed to update template');
        }
    }

    const availableVariables = {
        mpesa_confirmation: ['fullName', 'zakaNumber', 'month', 'year', 'amount', 'receipt', 'paybill'],
        payment_confirmation: ['fullName', 'zakaNumber', 'month', 'year', 'amount'],
        custom: ['fullName', 'zakaNumber', 'month', 'year', 'amount']
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">SMS Templates</h1>
                    {canPublish && (
                        <button 
                            onClick={handleAdd}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                        >
                            Add New Template
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">All Types</option>
                        <option value="mpesa_confirmation">M-Pesa Confirmation</option>
                        <option value="payment_confirmation">Payment Confirmation</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4">
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </h2>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            required
                                            value={formData.type}
                                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="mpesa_confirmation">M-Pesa Confirmation</option>
                                            <option value="payment_confirmation">Payment Confirmation</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                                        <textarea
                                            required
                                            rows={6}
                                            value={formData.template}
                                            onChange={(e) => setFormData({...formData, template: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="Use {variableName} for variables. Example: Thank you {fullName} for your payment of {amount}"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Available variables: {availableVariables[formData.type]?.join(', ') || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                            className="mr-2"
                                        />
                                        <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        {editingTemplate ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Type</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Template</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(template => (
                                <tr key={template._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{template.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                            {template.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-md truncate">{template.template}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-sm ${
                                            template.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {template.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        {canPublish && (
                                            <button
                                                onClick={() => toggleActive(template._id, template.isActive)}
                                                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            >
                                                {template.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                        {canPublish && (
                                            <button
                                                onClick={() => handleEdit(template)}
                                                className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(template._id)}
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
            </div>
        </Layout>
    );
}
