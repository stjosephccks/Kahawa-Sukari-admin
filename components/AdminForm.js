import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
export default function AdminForm({
    _id,
    name:existingName,
    email:existingEmail,
 
}){
    const [name,setName]= useState(existingName||'')
    const[email,setEmail]= useState(existingEmail||'')
    const [goToAdmins, setgoToAdmins]= useState(false)
    const router=useRouter()
    async function  saveAdmin(ev){
        ev.preventDefault()
        const data={name,email}
        if(_id){
          
            await axios.put('/api/admin',{...data,_id})
        
        }else{
        await axios.post('/api/admin',data)
        }
        setgoToAdmins(true)

    }
    useEffect(() => {
        if (goToAdmins) {
          router.push('/admin');
        }
      }, [goToAdmins, router]);
  
    return(
        <form onSubmit={saveAdmin}>
        <label>name</label>
        <input type="text" placeholder="name" value={name} onChange={ev=>setName(ev.target.value)}/>
        <label>Email</label>
        <input type="text" placeholder="admin@gmail.com" value={email} onChange={ev=>setEmail(ev.target.value)}/>
        <button className="btn-primary" type="submit">Save</button>
    </form>
    )
}