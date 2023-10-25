import Layout from "@/components/Layout"
import axios from "axios"
import { useEffect, useState } from "react"

export default function SundayPage(){
 const [sunday, setSunday]= useState()
 const [sundays,setSundays]= useState([])
   async  function saveSunday(ev){
    ev.preventDefault()
       await  axios.post('/api/sunday', {sunday})
        setSunday('');
        fetchSundays()
    }
    useEffect(()=>{
        fetchSundays()

    },[])
    function fetchSundays(){
        axios.get('/api/sunday').then(result=>{
            setSundays(result.data)
       })
        
    }
    return(
        <Layout>
            <h1>Sunday</h1>
              <form onSubmit={saveSunday}>
            <label>Add New Week </label>
            <div className="flex">
                <input className="mb-0"
                    value={sunday}
                     onChange={ev=>setSunday(ev.target.value)}type='text'
                    placeholder="22nd Sunday of Ordinary time"/>
                <button type='submit' className="btn-primary">save</button>                
                </div>
            </form>
            <table className="basic mt-4 ">
                <thead>
                    <tr>
                        <td>Sundays</td>
                    </tr>
                </thead>
                <tbody>
                    {sundays.length > 0 && sundays.map(sunday=>(
                        <tr>
                            
                            <td>{sunday.sunday}</td>
                        </tr>
                    )

                    )}

                </tbody>
            </table>
        
        </Layout>
    )
}