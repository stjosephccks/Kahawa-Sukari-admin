import AdminForm from "@/components/AdminForm";
import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditAdmin() {
    const [adminInfo, setAdminInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
        if (!id) {
            return;
        }

        const fetchAdminData = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/api/admin?id=' + id);
                setAdminInfo(response.data);
                setError('');
            } catch (err) {
                console.error('Error fetching admin data:', err);
                setError('Failed to load admin data. Please try again later.');
                // Optionally redirect to admin list or show error message
                // router.push('/admin');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [id]);

    if (loading) {
        return (
            <Layout>
                <div>Loading admin data...</div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="text-red-500">{error}</div>
            </Layout>
        );
    }

    return (
        <Layout>
            {
                adminInfo && (
                    <AdminForm {...adminInfo} />
                )
            }
        </Layout>
    );
}