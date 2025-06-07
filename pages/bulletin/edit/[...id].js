import Layout from "@/components/Layout";
import RichText from "@/components/RichTextForm";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditBulletin(){
const[bulletinInfo,setBulletinInfo]= useState(null)
const router = useRouter()
const{id}= router.query

useEffect(()=>{
    if(!id){
        return
    }
    axios.get('/api/bulletin?id='+id).then(response =>{
        setBulletinInfo(response.data)
    })

},[id])
    return(
        <Layout>
            {bulletinInfo&& (
                <RichText {...bulletinInfo} formType="bulletin" />
            )   
            }
                 
        </Layout>
       
    )
}