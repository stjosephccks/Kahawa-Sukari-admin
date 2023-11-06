import AdminForm from "@/components/AdminForm";
import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditAdmin(){
    const [adminInfo, setAdminInfo]= useState(null)
    const router = useRouter()
    const {id}= router.query
    useEffect(()=>{
        if(!id){
            return
        }
            axios.get('/api/admin?id='+id).then(response=>{
                setAdminInfo(response.data)
            })
        
    },[])
    return(
        <Layout>
            {
                adminInfo &&(
                <AdminForm {...adminInfo}/>
                )
            }
            
        </Layout>
    )
}