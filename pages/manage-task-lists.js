import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function ManageTaskListsPage() {
    const [taskLists, setTaskLists] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTaskList, setEditingTaskList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { role } = useAuth();
    const router = useRouter();

    const [formData, setFormData] = useState({
        employee: '',
        highlightDate: '',
        importantDates: [],
        tasks: []
    });

    const loadTaskLists = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/task-lists');
            setTaskLists(response.data.taskLists);
        } catch (error) {
            console.error('Error loading task lists:', error);
            alert('Failed to load task lists. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadEmployees = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin', { params: { limit: 100 } });
            setEmployees(response.data.employees);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }, []);

    useEffect(() => {
        if (role !== 'super_admin') {
            router.push('/my-tasks');
            return;
        }
        loadTaskLists();
        loadEmployees();
    }, [role, router, loadTaskLists, loadEmployees]);

    function handleNewTaskList() {
        setEditingTaskList(null);
        setFormData({
            employee: '',
            highlightDate: '',
            importantDates: [],
            tasks: []
        });
        setShowForm(true);
    }

    async function handleEdit(taskList) {
        setEditingTaskList(taskList);
        setFormData({
            employee: taskList.employee,
            highlightDate: new Date(taskList.highlightDate).toISOString().split('T')[0],
            importantDates: taskList.importantDates.map(d => ({
                date: new Date(d.date).toISOString().split('T')[0],
                description: d.description
            })),
            tasks: taskList.tasks.map(t => ({
                dueDate: new Date(t.dueDate).toISOString().split('T')[0],
                group: t.group || t.class || '',
                task: t.task,
                notes: t.notes || ''
            }))
        });
        setShowForm(true);
    }

    function addImportantDate() {
        setFormData({
            ...formData,
            importantDates: [...formData.importantDates, { date: '', description: '' }]
        });
    }

    function updateImportantDate(index, field, value) {
        const newDates = [...formData.importantDates];
        newDates[index][field] = value;
        setFormData({ ...formData, importantDates: newDates });
    }

    function removeImportantDate(index) {
        const newDates = formData.importantDates.filter((_, i) => i !== index);
        setFormData({ ...formData, importantDates: newDates });
    }

    function addTask() {
        setFormData({
            ...formData,
            tasks: [...formData.tasks, { dueDate: '', group: '', task: '', notes: '' }]
        });
    }

    function updateTask(index, field, value) {
        const newTasks = [...formData.tasks];
        newTasks[index][field] = value;
        setFormData({ ...formData, tasks: newTasks });
    }

    function removeTask(index) {
        const newTasks = formData.tasks.filter((_, i) => i !== index);
        setFormData({ ...formData, tasks: newTasks });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!formData.employee || !formData.highlightDate) {
            alert('Please select an employee and highlight date.');
            return;
        }
        
        try {
            setSaving(true);
            if (editingTaskList) {
                await axios.put('/api/task-lists', {
                    _id: editingTaskList._id,
                    highlightDate: formData.highlightDate,
                    importantDates: formData.importantDates,
                    tasks: formData.tasks
                });
                alert('✅ Task list updated successfully!');
            } else {
                await axios.post('/api/task-lists', formData);
                alert('✅ Task list created successfully!');
            }
            setShowForm(false);
            await loadTaskLists();
        } catch (error) {
            console.error('Error saving task list:', error);
            alert('❌ ' + (error.response?.data?.error || 'Failed to save task list. Please try again.'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(taskListId) {
        if (confirm('⚠️ Are you sure you want to delete this task list? This action cannot be undone.')) {
            try {
                setLoading(true);
                await axios.delete(`/api/task-lists?id=${taskListId}`);
                alert('✅ Task list deleted successfully!');
                await loadTaskLists();
            } catch (error) {
                console.error('Error deleting task list:', error);
                alert('❌ Failed to delete task list. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    }

    if (role !== 'super_admin') {
        return null;
    }

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Manage Task Lists</h1>
                            <p className="text-gray-600 mt-1">Create and manage employee daily task lists</p>
                        </div>
                        <button
                            onClick={handleNewTaskList}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Create Task List
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">Loading task lists...</p>
                        </div>
                    ) : taskLists.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No task lists</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a task list for an employee.</p>
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
                                            Highlight Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Important Dates
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tasks
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {taskLists.map((taskList) => (
                                        <tr key={taskList._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{taskList.employeeName}</div>
                                                <div className="text-sm text-gray-500">{taskList.employeeEmail}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(taskList.highlightDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {taskList.importantDates.length} dates
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {taskList.tasks.length} tasks
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {taskList.createdByName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(taskList)}
                                                        disabled={loading}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                        </svg>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(taskList._id)}
                                                        disabled={loading}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                        </svg>
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

                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingTaskList ? 'Edit Task List' : 'Create Task List'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Employee *
                                        </label>
                                        <select
                                            value={formData.employee}
                                            onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                                            disabled={editingTaskList}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                            required
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.name} ({emp.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Highlight Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.highlightDate}
                                            onChange={(e) => setFormData({ ...formData, highlightDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Important Dates
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addImportantDate}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            + Add Date
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.importantDates.map((date, index) => (
                                            <div key={index} className="flex gap-3 items-start">
                                                <input
                                                    type="date"
                                                    value={date.date}
                                                    onChange={(e) => updateImportantDate(index, 'date', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={date.description}
                                                    onChange={(e) => updateImportantDate(index, 'description', e.target.value)}
                                                    placeholder="Description"
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImportantDate(index)}
                                                    className="px-3 py-2 text-red-600 hover:text-red-700"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Tasks
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addTask}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            + Add Task
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.tasks.map((task, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                    <input
                                                        type="date"
                                                        value={task.dueDate}
                                                        onChange={(e) => updateTask(index, 'dueDate', e.target.value)}
                                                        placeholder="Due Date"
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={task.group}
                                                        onChange={(e) => updateTask(index, 'group', e.target.value)}
                                                        placeholder="Group"
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={task.task}
                                                    onChange={(e) => updateTask(index, 'task', e.target.value)}
                                                    placeholder="Task"
                                                    className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={task.notes}
                                                        onChange={(e) => updateTask(index, 'notes', e.target.value)}
                                                        placeholder="Notes"
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTask(index)}
                                                        className="px-3 py-2 text-red-600 hover:text-red-700"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                                <span>{editingTaskList ? 'Update Task List' : 'Create Task List'}</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
