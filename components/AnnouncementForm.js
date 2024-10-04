import Layout from "@/components/Layout";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function AnnouncementForm({
  _id,
  title: existingTitle,
  description: existingDescription,
  sunday: assignedSunday,
  massScheduleAssignments: existingMassScheduleAssignments,
}) {
  const [sundays, setSundays] = useState([]);
  const [title, setTitle] = useState(existingTitle || "");
  const [description, setDescription] = useState(existingDescription || "");
  const [goToAnnouncements, setGoToAnnouncements] = useState(false);
  const [sunday, setSunday] = useState(assignedSunday || "");
  const [massScheduleAssignments, setMassScheduleAssignments] = useState(
    existingMassScheduleAssignments || []
  );
  const [newAssignmentName, setNewAssignmentName] = useState("");
  const [newAssignmentTime, setNewAssignmentTime] = useState("");

  const router = useRouter();

  async function saveAnnouncement(ev) {
    ev.preventDefault();
    const data = { title, description, sunday, massScheduleAssignments };
    console.log("Payload before sending:", JSON.stringify(data, null, 2));

    try {
      if (_id) {
        await axios.put("/api/announcements", { ...data, _id });
      } else {
        await axios.post("/api/announcements", data);
      }
      setGoToAnnouncements(true);
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Failed to save announcement: " + error.message);
    }
  }

  useEffect(() => {
    if (goToAnnouncements) {
      router.push("/announcement");
    }
  }, [goToAnnouncements, router]);

  useEffect(() => {
    axios.get("/api/sunday").then((response) => {
      setSundays(response.data);
    });
  }, []);

  function handleAssignmentChange(index, field, value) {
    const updatedAssignments = [...massScheduleAssignments];
    updatedAssignments[index][field] = value;
    setMassScheduleAssignments(updatedAssignments);
  }

  function addAssignment() {
    if (newAssignmentName.trim() !== "" && newAssignmentTime.trim() !== "") {
      const newAssignment = {
        name: newAssignmentName,
        time: newAssignmentTime,
      };
      setMassScheduleAssignments((prev) => {
        const updatedAssignments = [...prev, newAssignment];
        console.log("Updated Mass Schedule Assignments:", updatedAssignments);
        return updatedAssignments;
      });
      setNewAssignmentName(""); // Clear name input after adding
      setNewAssignmentTime(""); // Clear time input after adding
    }
  }

  function removeAssignment(index) {
    setMassScheduleAssignments(
      massScheduleAssignments.filter((_, i) => i !== index)
    );
  }

  return (
    <form onSubmit={saveAnnouncement}>
      <label>Sunday</label>
      <select
        className="mb-0"
        value={sunday}
        onChange={(ev) => setSunday(ev.target.value)}
      >
        <option value="0"> No Sunday Selected</option>
        {sundays.length > 0 &&
          sundays.map((sunday) => (
            <option key={sunday._id} value={sunday._id}>
              {sunday.sunday}
            </option>
          ))}
      </select>

      <label>Title</label>
      <input
        value={title}
        onChange={(ev) => setTitle(ev.target.value)}
        type="text"
        placeholder="Title"
      />

      <label>Description</label>
      <textarea
        placeholder="Description"
        value={description}
        onChange={(ev) => setDescription(ev.target.value)}
        rows={15}
      ></textarea>

      <label>Mass Schedule Assignments</label>
      <div>
        {massScheduleAssignments.map((assignment, index) => (
          <div key={index} className="assignment-item flex items-center mb-2">
            <input
              type="text"
              value={assignment.name}
              onChange={(ev) =>
                handleAssignmentChange(index, "name", ev.target.value)
              }
              placeholder="Group Name"
              className="mr-2 border p-1"
            />
            <input
              type="text"
              value={assignment.time}
              onChange={(ev) =>
                handleAssignmentChange(index, "time", ev.target.value)
              }
              placeholder="Mass Time"
              className="mr-2 border p-1"
            />
            <button
              type="button"
              onClick={() => removeAssignment(index)}
              className="btn-red ml-3"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Input fields for new assignment */}
      <div className="space-y-2">
        <input
          type="text"
          value={newAssignmentName}
          onChange={(ev) => setNewAssignmentName(ev.target.value)}
          placeholder="Jumuiya Name"
          className="border p-1"
        />
        <input
          type="text"
          value={newAssignmentTime}
          onChange={(ev) => setNewAssignmentTime(ev.target.value)}
          placeholder="Mass Time"
          className="border p-1"
        />
        <button
          type="button"
          className="btn-default mb-3"
          onClick={addAssignment}
        >
          Add Assignment
        </button>
      </div>

      <button type="submit" className="btn-primary">
        Save
      </button>
    </form>
  );
}
