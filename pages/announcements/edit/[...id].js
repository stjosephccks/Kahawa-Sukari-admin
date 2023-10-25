import AnnouncementForm from "@/components/AnnouncementForm";
import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditAnnouncement(){
    const [announcementInfo, setannouncementInfo]=useState(null)
    const router = useRouter()
    const {id}=router.query
    useEffect(()=>{
        if(!id){
            return;
        }
        axios.get('/api/announcements?id='+id).then(response=>{
            setannouncementInfo(response.data)
            

        })
    },[])
    return(
    <Layout>
        {announcementInfo &&(
         <AnnouncementForm {...announcementInfo}/>      

        )}
      
    </Layout>
    )
}