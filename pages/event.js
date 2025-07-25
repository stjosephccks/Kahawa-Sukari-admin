import Layout from "@/components/Layout";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from 'date-fns';

export default function Events() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadEvents();
  }, []);

  function loadEvents() {
    axios.get('/api/events').then(response => {
      setEvents(response.data);
    });
  }

  async function togglePublish(id, currentStatus) {
    await axios.put('/api/events', {
      _id: id,
      published: !currentStatus
    });
    loadEvents();
  }

  function formatDateForDisplay(date) {
    return date ? format(new Date(date), "MMMM d, yyyy - h:mm a") : '';
  }
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <Link
            href="/events/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Add New Event
          </Link>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Title</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Description</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {events.map(event => (
                <tr key={event._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900">{event.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{event.description}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {event.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDateForDisplay(event.date)}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <Link
                      href={`/events/edit/${event._id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                        />
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={() => togglePublish(event._id, event.published)}
                      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition ${
                        event.published
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5m-18 0V6a2.25 2.25 0 012.25-2.25h3.5a2.25 2.25 0 012.25 2.25v.438m0 0a60.111 60.111 0 011.5-.438m0 0a2.25 2.25 0 012.25 2.25v6m0 0a60.11 60.11 0 01-1.5.438m0 0a2.25 2.25 0 01-2.25 2.25h-3.5a2.25 2.25 0 01-2.25-2.25v-6m0 0a60.11 60.11 0 01-1.5-.438V7.5m0 0a2.25 2.25 0 012.25-2.25h3.5a2.25 2.25 0 012.25 2.25v.875"
                        />
                      </svg>
                      {event.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link
                      href={`/events/delete/${event._id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                      Delete
                    </Link>
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