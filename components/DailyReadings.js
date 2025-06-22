'use client';
import { useEffect, useState } from "react";
import axios from "axios";

export default function DailyReadings() {
  const [readings, setReadings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReading = async () => {
      try {
        const res = await axios.get("/api/daily-reading");
        console.log("Fetched readings:", res.data);
        setReadings(res.data);
      } catch (err) {
        console.error("Error fetching daily reading:", err);
        setError("Failed to load daily readings.");
      }
    };
    fetchReading();
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!readings) return <div>Loading daily readings...</div>;
  if (!Array.isArray(readings.readings)) return <div>No readings available today.</div>;

  return (
    <div className="mt-2 text-sm text-blue-700 px-1">
      <div>📖 {readings.title}</div>
      {readings.readings.map((r, i) => (
        <p key={i} className="mt-1">
          <strong>{r.title}:</strong> {r.text}
        </p>
      ))}
    </div>
  );
}
