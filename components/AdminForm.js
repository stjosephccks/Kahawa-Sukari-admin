import { ROLES } from "@/models/Admin";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function AdminForm({
  _id,
  name: existingName ,
  email: existingEmail ,
  password: existingPassword ,
  role: existingRole = ROLES.EDITOR,
}) {
  const [name, setName] = useState(existingName);
  const [email, setEmail] = useState(existingEmail);
  const [password, setPassword] = useState(existingPassword);
  const [role, setRole] = useState(existingRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const router = useRouter();

  // Format role options for the select dropdown
  const roleOptions = Object.entries(ROLES).map(([key, value]) => ({
    value,
    label: key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }));

  async function saveAdmin(ev) {
    ev.preventDefault();
    setError("");
    setSuccess("");
    
    // Basic validation
    if (!name.trim() || !email.trim() || (!_id && !password.trim())) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data = { name, email, role };
      // Only include password if it's a new admin or being explicitly updated
      if (!_id) {
        // For new admin, password is required
        data.password = password;
      } else if (password && password !== existingPassword) {
        // For existing admin, only include password if it's changed
        data.password = password;
      }

      if (_id) {
        await axios.put("/api/admin", { ...data, _id });
        setSuccess("Admin updated successfully!");
      } else {
        await axios.post("/api/admin", data);
        setSuccess("Admin created successfully!");
        // Clear form after successful creation
        setName("");
        setEmail("");
        setPassword("");
        setRole(ROLES.EDITOR);
      }
      
      // Redirect to admin list after a short delay
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
      
    } catch (err) {
      console.error("Error saving admin:", err);
      // Handle different types of errors
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          "An error occurred while saving the admin";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{_id ? 'Edit Admin' : 'Create New Admin'}</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={saveAdmin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className="w-full p-2 border rounded"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full p-2 border rounded"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {_id ? 'New Password (leave blank to keep current)' : 'Password *'}
          </label>
          <input
            type="password"
            placeholder={_id ? "Leave blank to keep current" : "Enter password"}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="w-full p-2 border rounded"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <select
            value={role}
            onChange={(ev) => setRole(ev.target.value)}
            className="w-full p-2 border rounded"
            disabled={isSubmitting}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-4 pt-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded text-white ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}