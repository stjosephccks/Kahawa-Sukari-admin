import Layout from "@/components/Layout";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Bulletin(){
    const [bulletins, setBulletins] = useState([]);
    const { canPublish, canDelete } = useAuth();

    useEffect(()=>{
        loadBulletins();
    }, []);

    function loadBulletins() {
        axios.get('/api/bulletin').then(response => {
            setBulletins(response.data);
        });
    }

    async function togglePublish(id, currentStatus) {
        await axios.put('/api/bulletin', {
            _id: id,
            published: !currentStatus
        });
        loadBulletins();
    }

    return(
        <Layout>
            <Link className="btn-primary" href={'/bulletin/new'}>Add New Bulletin</Link>
            <table className="basic mt-2">
                <thead>
                    <tr>
                        <td>Bulletins</td>
                        <td>Status</td>
                        <td>Actions</td>
                    </tr>
                </thead>
                <tbody>
                    {bulletins.map(bulletin=>(
                        <tr key={bulletin._id}>
                            <td>{bulletin.title}</td>
                            <td>
                                <span className={`px-2 py-1 rounded-md text-sm ${
                                    bulletin.published 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {bulletin.published ? 'Published' : 'Draft'}
                                </span>
                            </td>
                            <td className="flex gap-1">
                                <Link className="btn-default" href={'/bulletin/edit/'+bulletin._id}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                    Edit
                                </Link>
                                {canPublish && (
                                <button 
                                    onClick={() => togglePublish(bulletin._id, bulletin.published)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                        bulletin.published 
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
                                        className="w-4 h-4"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5m-18 0V6a2.25 2.25 0 012.25-2.25h3.5a2.25 2.25 0 012.25 2.25v.438m0 0a60.111 60.111 0 011.5-.438m0 0a2.25 2.25 0 012.25 2.25v6m0 0a60.11 60.11 0 01-1.5.438m0 0a2.25 2.25 0 01-2.25 2.25h-3.5a2.25 2.25 0 01-2.25-2.25v-6m0 0a60.11 60.11 0 01-1.5-.438V7.5m0 0a2.25 2.25 0 012.25-2.25h3.5a2.25 2.25 0 012.25 2.25v.875" 
                                        />
                                    </svg>
                                    {bulletin.published ? 'Published' : 'Publish'}
                                </button>
                                )}
                                {canDelete && (
                                <Link className="btn-red" href={'/bulletin/delete/'+bulletin._id}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    Delete
                                </Link>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Layout>
    )
}