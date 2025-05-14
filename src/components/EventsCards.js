import React, { useState } from 'react';
import CountdownTimer from './CountdownTimer';
import { getIdToken } from "firebase/auth";
import { auth } from "../firebase";

function EventCard({ event, availableProducts = [], subscribers = [], onProductUpdate = () => {} }) {
  const [selectedProduct, setSelectedProduct] = useState(event.product || "");
  const [saving, setSaving] = useState(false);

  // Calculate the count of subscribers matching the event's assigned product
  const subscriberCount = subscribers.filter(
	(sub) => sub.product_name === event.product
  ).length;

  // Calculate next reminder time using nextOccurrence if available; otherwise, use StartDate.
  // Reminder time is calculated as (base time - reminderOffset minutes).
  const now = new Date();
  let nextReminderTime = null;
  if (event.reminderEnabled && (event.StartDate || event.nextOccurrence)) {
	const baseTime = event.nextOccurrence ? new Date(event.nextOccurrence) : new Date(event.StartDate);
	nextReminderTime = new Date(baseTime.getTime() - (event.reminderOffset || 60) * 60000);
  }

  const handleSave = async () => {
	setSaving(true);
	try {
	  const token = await getIdToken(auth.currentUser, false);
	  const response = await fetch("/update-event-product", {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		  Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ eventId: event.id, product: selectedProduct }),
	  });
	  if (!response.ok) {
		throw new Error("Failed to update product");
	  }
	  await response.json();
	  setSaving(false);
	  onProductUpdate(event.id, selectedProduct);
	} catch (error) {
	  console.error("Error updating product:", error);
	  setSaving(false);
	}
  };

  return (
	<div className="mt-2">
	  <label className="mr-2">Product:</label>
	  <select
		value={selectedProduct}
		onChange={(e) => setSelectedProduct(e.target.value)}
		className="border px-2 py-1 rounded"
	  >
		<option value="">Select a product</option>
		{availableProducts.map((prod) => (
		  <option key={prod} value={prod}>
			{prod}
		  </option>
		))}
	  </select>
	  <button
		onClick={handleSave}
		disabled={saving}
		className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
	  >
		{saving ? "Saving..." : "Save"}
	  </button>
	  {event.product && (
		<p className="text-gray-600 mt-1">
		  <strong>Subscribers:</strong> {subscriberCount}
		</p>
	  )}
	  {nextReminderTime && (
		<p className="text-gray-600 mt-1">
		  <strong>Next Reminder:</strong> {nextReminderTime.toLocaleString()} {nextReminderTime < now ? "(Due)" : ""}
		</p>
	  )}
	</div>
  );
}

function EventsCards({ events, availableProducts = [], subscribers = [], onProductUpdate = () => {} }) {
  return (
	<div className="grid grid-cols-1 gap-4">
	  {events.map((event) => (
		<div key={event.id} className="p-4 bg-white shadow rounded">
		  <h3 className="text-xl font-bold">
			{event.eventTitle || event.EventID || "Untitled Event"}
		  </h3>
		  <p className="text-gray-600">
			<strong>Start Date:</strong>{" "}
			{new Date(event.StartDate).toLocaleString(undefined, {
			  weekday: 'long',
			  year: 'numeric',
			  month: 'long',
			  day: 'numeric',
			  hour: '2-digit',
			  minute: '2-digit'
			})}
		  </p>
		  {event.nextOccurrence && (
			<p className="text-gray-600">
			  <strong>Next Occurrence:</strong>{" "}
			  {new Date(event.nextOccurrence).toLocaleString(undefined, {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			  })}
			</p>
		  )}
		  {event.nextOccurrence && (
			<div className="mt-2">
			  <strong>Countdown:</strong> <CountdownTimer targetDate={event.nextOccurrence} />
			</div>
		  )}
		  {event.recurrenceType && (
			<p className="text-gray-600">
			  <strong>Recurrence:</strong> {event.recurrenceType} every {event.interval} {event.recurrenceType === "weekly" ? "week(s)" : "period(s)"}
			</p>
		  )}
		  {event.recurrenceEnd && (
			<p className="text-gray-600">
			  <strong>Recurrence Ends:</strong>{" "}
			  {new Date(event.recurrenceEnd).toLocaleString()}
			</p>
		  )}
		  {event.timeZone && (
			<p className="text-gray-600">
			  <strong>Time Zone:</strong> {event.timeZone}
			</p>
		  )}
		  {event.product && (
			<p className="text-gray-600">
			  <strong>Assigned Product:</strong> {event.product}
			</p>
		  )}
		  <EventCard
			event={event}
			availableProducts={availableProducts}
			subscribers={subscribers}
			onProductUpdate={onProductUpdate}
		  />
		</div>
	  ))}
	</div>
  );
}

export default EventsCards;
