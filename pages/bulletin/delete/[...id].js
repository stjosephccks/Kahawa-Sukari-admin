import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function DeleteBulletin(){
    const [bulletinInfo, setBulletinInfo]= useState()
    const router = useRouter()
    const{id}= router.query

    useEffect(()=>{
        if(!id){
            return
        }
        axios.get('/api/bulletin?id='+id).then(response=>{
            setBulletinInfo(response.data)
        })
    },[id])


    async function deleteBulletin(){
        await axios.delete('/api/bulletin?id='+id)
        goBack()

    }
    function goBack(){
        router.push('/bulletin')

    }
    return(
        <Layout>
            <h1 className='text-center'>{`Do you really want to delete Bulletin &nbsp;&lsquo; ${bulletinInfo?.title}&rsquo?`}</h1>
            <div className='flex gap-2 justify-center'>
                <button
                onClick={deleteBulletin} className='btn-red'>Yes</button>
                <button className='btn-default' 
                    onClick={goBack}>
                        No
                </button>
            </div>

        </Layout>
    )
}