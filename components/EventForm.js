import axios from "axios"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { format } from 'date-fns';
import Spinner from "./Spinner";
import Image from "next/image";
import {ReactSortable} from 'react-sortablejs'

export default function EventForm({
    _id,
    title:existingTitle,
    description:existingDescription,
    date:existingDate,
    venue:existingVenue,
    images:existingImages
}){
    const [title,setTitle]=useState(existingTitle||'')
    const [description,setDescription]=useState(existingDescription||'')
    const [date,setDate]=useState(existingDate||'')
    const [images,setImages]=useState(existingImages||[])
    const [goToEvents, setgoToEvents]= useState(false)
    const [isUploading ,setIsUploading]=useState(false)
    const [venue,setVenue]= useState(existingVenue||'')
    const [loadedImages, setLoadedImages] = useState(Array(images.length).fill(false));

    const router =useRouter()
    async function saveEvent(ev){   
        ev.preventDefault()
        const data={title,description,date,venue, images,published:published||false}
        if(_id){
           await axios.put('/api/events', {...data,_id})
        }
        else{
            await axios.post('/api/events',data)
        }
        setgoToEvents(true)
          

    }
    useEffect(()=>{
        if(goToEvents){
            router.push('/event')
        }

    },[goToEvents, router ])
  function formatDateForInput(date) {
  return date ? format(new Date(date), "yyyy-MM-dd'T'HH:mm") : '';
}
async function uploadImages(ev){
    const files = ev.target?.files;
    if(files?.length > 0){
        setIsUploading(true);
        const data = new FormData();
        for(const file of files){
            data.append('file',file);

        }
       const res = await axios.post('/api/upload',data)
       const newImages = res.data.links 
           setImages(oldImages => 
             [...oldImages, ...newImages]
           );
           setLoadedImages(oldLoadedImages => [...oldLoadedImages, ...Array(newImages.length).fill(false)]);
       setIsUploading(false)
        
        //console.log(res.data)
    }
}

function updateImagesOrder(images){
    setImages(images)



}


    return(
        <>
            <form onSubmit={saveEvent}>
                <label>Event Title</label>
                <input value={title} onChange={ev=>setTitle(ev.target.value)} type="text" placeholder='title'/>
                <label>Event description</label>
                <textarea rows={15} value={description} onChange={ev=>setDescription(ev.target.value)} placeholder="event description"></textarea>
               
                <label>Photos</label>
                <div className="mb-2 flex flex-wrap gap-1">
                    <ReactSortable
                        list={images}
                        setList={updateImagesOrder}
                        className='flex flex-wrap gap-1 ' 
                        
                    >
                    {!!images?.length && images.map(link => (
                        <div key={link} className='h-24  bg-white p-4  shadow-sm rounded-sm border border-gray-200 '>
                                                     
                         <Image
                            src={link}
                            alt=''
                            className="rounded-lg"
                            width={100}
                            height={150}
                            onError={(e) => {
                                e.target.src = link
                          }}/> 
                        </div>
                    ))}
                    </ReactSortable>
                    {isUploading && (
                        <div className="h-24">
                            <Spinner/>
                        </div>  
                    )}
                    <label className='cursor-pointer w-24 h-24 text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                    </svg>

                        Add Image
                        <input type="file" className="hidden" onChange={uploadImages}/>
                    </label>
                 

                </div>
                <label>Venue</label>
                <input type="text" value={venue} onChange={ev=>setVenue(ev.target.value)}/>
                <label>Date of Event</label>
                <input value={formatDateForInput(date)} onChange={ev=>setDate(ev.target.value)} type="datetime-local"></input>
                <label className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={published}
                    onChange={ev => setPublished(ev.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-700">Published</span>
            </label>
                
                <button className="btn-primary" type="submit"> Save</button>

            </form>
        </>
    )
}