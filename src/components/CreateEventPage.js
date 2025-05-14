// File: /Users/chrismeisner/Projects/subbers/src/components/CreateEventPage.js

import React, { useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "../firebase";

function CreateEventPage() {
  const [formData, setFormData] = useState({
	eventTitle: "",
	startDate: "",
	recurrenceType: "",
	interval: 1,
	recurrenceEnd: "",
	timeZone: "UTC",
	emailSubject: "",
	emailMessage: "",
	reminderOffset: 60,
	reminderEnabled: false,
	product: ""
  });

  const handleChange = (e) => {
	const { name, value, type, checked } = e.target;
	setFormData((prev) => ({
	  ...prev,
	  [name]: type === "checkbox" ? checked : value,
	}));
  };

  const handleSubmit = async (e) => {
	e.preventDefault();
	try {
	  const token = await getIdToken(auth.currentUser, false);
	  const response = await fetch("/create-event", {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		  Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(formData),
	  });
	  if (!response.ok) {
		throw new Error("Failed to create event");
	  }
	  alert("Event created successfully!");
	  // Optionally, redirect or reset the form here.
	} catch (error) {
	  console.error("Error creating event:", error);
	  alert("Error creating event: " + error.message);
	}
  };

  return (
	<div className="max-w-2xl mx-auto p-6 bg-white shadow rounded">
	  <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
	  <form onSubmit={handleSubmit} className="space-y-4">
		{/* Event Title */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Event Title
		  </label>
		  <input
			type="text"
			name="eventTitle"
			value={formData.eventTitle}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
			required
		  />
		</div>
		{/* Start Date & Time */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Start Date &amp; Time
		  </label>
		  <input
			type="datetime-local"
			name="startDate"
			value={formData.startDate}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
			required
		  />
		</div>
		{/* Recurrence Type */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Recurrence Type
		  </label>
		  <select
			name="recurrenceType"
			value={formData.recurrenceType}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
		  >
			<option value="">None</option>
			<option value="weekly">Weekly</option>
		  </select>
		</div>
		{/* Interval */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Interval
		  </label>
		  <input
			type="number"
			name="interval"
			value={formData.interval}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
			min="1"
		  />
		</div>
		{/* Recurrence End Date */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Recurrence End Date
		  </label>
		  <input
			type="datetime-local"
			name="recurrenceEnd"
			value={formData.recurrenceEnd}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
		  />
		</div>
		{/* Time Zone */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Time Zone
		  </label>
		  <input
			type="text"
			name="timeZone"
			value={formData.timeZone}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
			placeholder="UTC"
		  />
		</div>
		{/* Email Subject */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Email Subject
		  </label>
		  <input
			type="text"
			name="emailSubject"
			value={formData.emailSubject}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
		  />
		</div>
		{/* Email Message */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Email Message
		  </label>
		  <textarea
			name="emailMessage"
			value={formData.emailMessage}
			onChange={handleChange}
			rows="4"
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
		  ></textarea>
		</div>
		{/* Reminder Offset */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Reminder Offset (minutes)
		  </label>
		  <input
			type="number"
			name="reminderOffset"
			value={formData.reminderOffset}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
			min="0"
		  />
		</div>
		{/* Reminder Enabled */}
		<div className="flex items-center">
		  <input
			type="checkbox"
			name="reminderEnabled"
			checked={formData.reminderEnabled}
			onChange={handleChange}
			className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
		  />
		  <label className="ml-2 block text-sm text-gray-700">
			Enable Reminders
		  </label>
		</div>
		{/* Product (Optional) */}
		<div>
		  <label className="block text-sm font-medium text-gray-700">
			Product
		  </label>
		  <input
			type="text"
			name="product"
			value={formData.product}
			onChange={handleChange}
			className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
		  />
		</div>
		<button
		  type="submit"
		  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
		>
		  Create Event
		</button>
	  </form>
	</div>
  );
}

export default CreateEventPage;
