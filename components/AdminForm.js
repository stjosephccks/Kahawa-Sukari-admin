import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
export default function AdminForm({
  _id,
  name: existingName,
  email: existingEmail,
  password: existingPassword,
}) {
  const [name, setName] = useState(existingName || "");
  const [email, setEmail] = useState(existingEmail || "");
  const [password, setPassword] = useState(existingPassword || "");
  const [goToAdmins, setgoToAdmins] = useState(false);
  const router = useRouter();
  async function saveAdmin(ev) {
    ev.preventDefault();
    const data = { name, email, password };
    if (_id) {
      await axios.put("/api/admin", { ...data, _id });
    } else {
      await axios.post("/api/admin", data);
    }
    setgoToAdmins(true);
  }
  useEffect(() => {
    if (goToAdmins) {
      router.push("/admin");
    }
  }, [goToAdmins, router]);

  return (
    <form onSubmit={saveAdmin}>
      <label>name</label>
      <input
        type="text"
        placeholder="name"
        value={name}
        onChange={(ev) => setName(ev.target.value)}
      />
      <label>Email</label>
      <input
        type="email"
        placeholder="admin@gmail.com"
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
      />
      <label>Password</label>
      <input
        type="password"
        placeholder=""
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
      />
      <button className="btn-primary" type="submit">
        Save
      </button>
    </form>
  );
}
