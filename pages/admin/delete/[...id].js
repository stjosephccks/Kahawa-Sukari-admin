import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function DeleteAdmin(){

 const[adminInfo, setadminInfo]=useState()
    const router = useRouter()
    const{id}=router.query
    useEffect(()=>{
        if(!id){
            return;   
        }
        axios.get('/api/admin?id='+id).then(response=>{
           setadminInfo(response.data)
        })

    },[id])
    async function deleteAdmin(){
       await axios.delete('/api/admin?id='+id);
       goBack()
    }
    function goBack(){
        router.push('/admin')
    }
    return(
        <Layout>
            <h1 className='text-center'>{`Do you really want to delete Announcement '${announcementInfo?.title}'?`}</h1>
            <div className='flex gap-2 justify-center'>
                <button
                onClick={deleteAdmin} className='btn-red'>Yes</button>
                <button className='btn-default' 
                    onClick={goBack}>
                        No
                </button>
            </div>
        </Layout>
    )
}