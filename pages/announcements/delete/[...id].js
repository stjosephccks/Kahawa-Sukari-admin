import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "@/components/Layout";



export default function DeleteAnnouncementPage(){
    const[announcementInfo, setannouncementInfo]=useState()
    const router = useRouter()
    const{id}=router.query
    useEffect(()=>{
        if(!id){
            return;
        }
        axios.get('/api/announcements?id='+id).then(response=>{
           setannouncementInfo(response.data)
        })

    },[id])
    async function deleteAnnouncement(){
       await axios.delete('/api/announcements?id='+id);
       goBack()
    }
    function goBack(){
        router.push('/announcement')
    }
    return(
        <Layout>
            <h1 className='text-center'> Do you really want to delete Announcement &nbsp;&lsquo;{announcementInfo?.title}&rsquo;?</h1>
            <div className='flex gap-2 justify-center'>
                <button
                onClick={deleteAnnouncement} className='btn-red'>Yes</button>
                <button className='btn-default' 
                    onClick={goBack}>
                        No
                </button>
            </div>
        </Layout>
    )
}