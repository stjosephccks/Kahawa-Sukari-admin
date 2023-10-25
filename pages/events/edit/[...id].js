import EventForm from "@/components/EventForm";
import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditEvent(){
    const [eventInfo, setEventInfo]=useState(null)
    const router= useRouter();
    const{id}= router.query;
    useEffect(()=>{
        if(!id){
            return;
        }
        axios.get('/api/events?id='+id).then(response=>{
            setEventInfo(response.data)
        })

    },[])

    return(
        <Layout>
            {
                eventInfo&&(
            
            <EventForm {...eventInfo}/>)}
        </Layout>
    )


}