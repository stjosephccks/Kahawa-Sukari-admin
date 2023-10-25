import Layout from "@/components/Layout";
import axios from "axios";
import {useRouter } from "next/router";
import { useEffect, useState } from "react";
export default function AnnouncementForm({
    _id,
    title:existingTitle,
    description:existingDescription,
    sunday: assingedSunday    
}){
    const[sundays, setSundays]=useState([]);
    const [title, setTittle]=useState(existingTitle||'');
    const [description, setDescription] = useState(existingDescription||'');
    const [goToAnnouncements, setgoToAnnouncements]= useState(false)
    const [sunday, setSunday]= useState(assingedSunday||'')
    const router=useRouter()

    // async function createSunday(ev){
    //     ev.preventDefault()
    //     const data={heading}
    //     await axios.post('/api/sunday',data)
    // }
    async function saveAnnouncement(ev){
        ev.preventDefault() 
        const data={title, description, sunday}
        //sending request to api
        if(_id){
            await axios.put('/api/announcements',{...data,_id})

        }else{

            await axios.post('/api/announcements', data);
          
   
       }
       setgoToAnnouncements(true)
      
    }
    useEffect(() => {
        if (goToAnnouncements) {
          router.push('/announcement');
        }
      }, [goToAnnouncements]);

      useEffect(()=>{
        axios.get('/api/sunday').then(response=>{
           setSundays(response.data)     
        })

      },[])
    return(
        
            <>
          

            <form onSubmit={saveAnnouncement}>
                <select className='mb-0' value={sunday} onChange={ev=>setSunday(ev.target.value)} >
                    <option value='0'> No Sunday Selected</option>
                    {sundays.length > 0 && sundays.map(sunday=>(
                        <option key={sunday._id} value={sunday._id}>{sunday.sunday}</option>
                    ))}
                </select>
             <label>Title</label>
                <input
                    value={title} onChange={ev=>setTittle(ev.target.value)}type='text' placeholder="Title"/>
                <label>Description</label>
                <textarea   placeholder="Description" value={description} onChange={ev=>setDescription(ev.target.value)}></textarea>
                <button type="submit" className="btn-primary">Save</button>
            </form>
            </>
     
    )
}