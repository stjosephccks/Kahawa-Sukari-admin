import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from "@/components/Layout";
import useAuth from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';

export default function MyTasksPage() {
    const [taskLists, setTaskLists] = useState([]);
    const [selectedTaskList, setSelectedTaskList] = useState(null);
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
                loadMyTaskLists();
            }
        }
    }, [session, role]);

    useEffect(() => {
        if (role === 'super_admin' && selectedEmployee) {
            loadTaskListsForEmployee(selectedEmployee);
        }
    }, [selectedEmployee]);

    async function loadEmployees() {
        try {
            const response = await axios.get('/api/admin', { params: { limit: 100 } });
            setEmployees(response.data.employees);
            
            const currentUser = response.data.employees.find(emp => emp.email === session?.user?.email);
            
            if (currentUser) {
                const taskListResponse = await axios.get('/api/task-lists', {
                    params: { employeeId: currentUser._id }
                });
                
                if (taskListResponse.data.taskLists.length > 0) {
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

    async function loadMyTaskLists() {
        try {
            setLoading(true);
            const response = await axios.get('/api/task-lists');
            setTaskLists(response.data.taskLists);
            if (response.data.taskLists.length > 0) {
                setSelectedTaskList(response.data.taskLists[0]);
            }
        } catch (error) {
            console.error('Error loading task lists:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTaskListsForEmployee(employeeId) {
        try {
            setLoading(true);
            const response = await axios.get('/api/task-lists', {
                params: { employeeId }
            });
            setTaskLists(response.data.taskLists);
            if (response.data.taskLists.length > 0) {
                setSelectedTaskList(response.data.taskLists[0]);
            } else {
                setSelectedTaskList(null);
            }
        } catch (error) {
            console.error('Error loading task lists:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout>
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {role === 'super_admin' ? 'Employee Task Lists' : 'My Task List'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {role === 'super_admin' ? 'View employee daily task lists' : 'View your daily task list'}
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
                        <p className="mt-4 text-gray-600">Loading task lists...</p>
                    </div>
                ) : taskLists.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No task lists assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">Your admin will create a task list for you.</p>
                    </div>
                ) : (
                    <>
                        {taskLists.length > 1 && (
                            <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Task List
                                </label>
                                <select
                                    value={selectedTaskList?._id || ''}
                                    onChange={(e) => {
                                        const selected = taskLists.find(tl => tl._id === e.target.value);
                                        setSelectedTaskList(selected);
                                    }}
                                    className="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {taskLists.map(tl => (
                                        <option key={tl._id} value={tl._id}>
                                            {new Date(tl.highlightDate).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedTaskList && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                                    <h2 className="text-2xl font-bold text-white">DAILY TASK LIST</h2>
                                    <div className="mt-2 flex items-center gap-4 text-white">
                                        <span className="font-medium">TASK HIGHLIGHT DATE:</span>
                                        <span className="text-lg">{new Date(selectedTaskList.highlightDate).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
                                                IMPORTANT DATES
                                            </h3>
                                            {selectedTaskList.importantDates.length === 0 ? (
                                                <p className="text-gray-500 text-sm">No important dates listed</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {selectedTaskList.importantDates.map((date, index) => (
                                                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-medium text-gray-700">
                                                                    {new Date(date.date).toLocaleDateString()}
                                                                </div>
                                                                <div className="text-sm text-gray-600">
                                                                    {date.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
                                                TASKS
                                            </h3>
                                            {selectedTaskList.tasks.length === 0 ? (
                                                <p className="text-gray-500 text-sm">No tasks listed</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full border border-gray-300">
                                                        <thead className="bg-gray-800 text-white">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Due Date</th>
                                                                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Group</th>
                                                                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Task</th>
                                                                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {selectedTaskList.tasks.map((task, index) => {
                                                                const isHighlighted = new Date(task.dueDate).toDateString() === new Date(selectedTaskList.highlightDate).toDateString();
                                                                return (
                                                                    <tr key={index} className={isHighlighted ? 'bg-orange-500 text-white font-bold' : 'hover:bg-gray-50'}>
                                                                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-sm">
                                                                            {task.group || task.class || '-'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-sm">
                                                                            {task.task}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-sm">
                                                                            {task.notes || '-'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
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
