import Layout from "@/components/Layout";
import axios from "axios";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from 'date-fns';



export default function Home() {
  const {data: session, status}=useSession()
  const [announcements, setAnnouncements]= useState([])
  const [events, setEvents]= useState([])  
  useEffect(()=>{
    if(status === 'authenticated' ){
    axios.get('/api/announcements').then(response =>{
      setAnnouncements(response.data)
    })
    axios.get('/api/events').then(response=>{
      setEvents(response.data)

    })
   
  }
},[status])
  function formatDateForDisplay(date) {
    return date ? format(new Date(date), "MMMM d, yyyy - h:mm a") : '';
  }

  


  return<Layout>
    <div className="text-blue-900 flex justify-between">
      <h2>Hello ,<b>{session?.user?.name}</b></h2>
      <div className="flex bg-gray-300 tex-black gap-1 overflow-hidden rounded-lg">
        <Image src={session?.user?.image} alt="" width={50} height={50}className="w-6 h-6"/>
        <span className="px-2 ">
        {session?.user?.name}
        </span>
      </div>   
    </div>
   
    <table className="basic mt-1">
      <thead>
        <tr>
          <td>Accouncements</td>
          <td></td>
          <td></td>
          
        </tr>
      </thead>
      <tbody>
        {announcements.map(announcement=>(
          <tr key={announcement._id}>
            <td>{announcement.title}</td>
            <td className="truncate" style={{ maxWidth: '200px' }}>
                {announcement.description.length > 200
                  ? announcement.description.slice(0, 200) + '...'
                : announcement.description}
            </td>
  
          </tr>
        ))}
      </tbody>
      <thead>
        <tr>
          <td>Events</td>
          <td></td>
          <td></td>
        </tr>
      </thead>
      <tbody>
        {events.map(event=>(
          <tr key={event._id}>
            <td>{event.title}</td>
            <td>{event.description}</td>
            <td>{formatDateForDisplay(event.date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Layout>
 
}
