import Layout from "@/components/Layout"
import axios from "axios"
import { de } from "date-fns/locale";
import { useEffect, useState } from "react"
import { withSwal } from 'react-sweetalert2';

function SundayPage({swal}){
 const[editedSunday,setEditedSunday]=useState(null) 
 const [sunday, setSunday]= useState()
 const [sundays,setSundays]= useState([])
   async  function saveSunday(ev){
    ev.preventDefault()
    const data = {sunday}
    if(editedSunday){
        data._id= editedSunday._id

        await axios.put('/api/sunday',data)
        setEditedSunday(null)
    }else{

    
       await  axios.post('/api/sunday', data)
        
    }
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
    function editSunday(sunday){
        setEditedSunday(sunday)
        setSunday(sunday.sunday)



    }
    function deleteSunday(sunday){

    }
    return(
        <Layout>
            <h1>Sunday</h1>
              <form onSubmit={saveSunday}>
            <label>{editedSunday ? `Edit Week ${editedSunday.sunday}`:'Add New Week'} </label>
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
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {sundays.length > 0 && sundays.map(sunday=>(
                        <tr>
                            
                            <td>{sunday.sunday}</td>
                            <td>
                                <button className="btn-primary mr-1 "
                                    onClick={()=>editSunday(sunday)}
                                >Edit </button>
                                <button className="btn-primary"
                                    onClick={()=>deleteSunday(sunday)}
                                >Delete</button>
                            </td>
                        </tr>
                    )

                    )}

                </tbody>
            </table>
        
        </Layout>
    )
}
export default withSwal(({swal},ref)=>(
    <SundayPage swal={swal}/>
))