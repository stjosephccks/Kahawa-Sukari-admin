import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function DeleteEvent(){
    const[eventInfo, setEventInfo]=useState()
    const router = useRouter()
    const{id}=router.query
    useEffect(()=>{
        if(!id){
            return;
        }
        axios.get('/api/events?id='+id).then(response=>{
           setEventInfo(response.data)
        })

    },[id])
    async function deleteEvent(){
       await axios.delete('/api/events?id='+id);
       goBack()
    }
    function goBack(){
        router.push('/event')
    }
    return(
        <Layout>
            <h1 className='text-center'>Do you really want to delete Announcement &nbsp;"{eventInfo?.title}"?</h1>
            <div className='flex gap-2 justify-center'>
                <button
                onClick={deleteEvent} className='btn-red'>Yes</button>
                <button className='btn-default' 
                    onClick={goBack}>
                        No
                </button>
            </div>
        </Layout>
    )
}