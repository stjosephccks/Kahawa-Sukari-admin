import Layout from "@/components/Layout";
import axios from "axios";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import Logo from "@/components/Logo";

export default function Home() {
  const { data: session, status } = useSession();
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (status === "authenticated") {
      const fetchData = async () => {
        try {
          // Fetch announcements
          const announcementsResponse = await axios.get("/api/announcements");
          setAnnouncements(announcementsResponse.data);
          
          // Fetch events
          const eventsResponse = await axios.get("/api/events");
          setEvents(eventsResponse.data);
        } catch (error) {
          console.error("Error fetching data:", error);
          // You can add error state and display it to the user if needed
          // setError("Failed to load data. Please try again later.");
        }
      };

      fetchData();
    }
  }, [status]);
  function formatDateForDisplay(date) {
    return date ? format(new Date(date), "MMMM d, yyyy - h:mm a") : "";
  }

  return (
    <Layout>
      <div className="text-blue-900 flex justify-between">
        <h2>
          Hello ,<b>{session?.user?.name}</b>
        </h2>
        <div className="flex bg-gray-300 tex-black gap-1 overflow-hidden rounded-lg">
          <Image
            src={
              session?.user?.image ||
              "https://lh3.googleusercontent.com/a/ACg8ocL-gRP61pse7Az3-g6oHbanGRP9kUF5pwJMKe6W9moi=s96-c"
            }
            alt={session?.user?.name}
            width={50}
            height={50}
            className="w-6 h-6"
          />
          <span className="px-2 ">{session?.user?.name}</span>
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
          {announcements.map((announcement) => (
            <tr key={announcement._id}>
              <td>{announcement.title}</td>
              <td className="truncate" style={{ maxWidth: "200px" }}>
                {announcement.description.length > 200
                  ? announcement.description.slice(0, 200) + "..."
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
          {events.map((event) => (
            <tr key={event._id}>
              <td>{event.title}</td>
              <td>{event.description}</td>
              <td>{formatDateForDisplay(event.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}
