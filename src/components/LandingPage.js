import React from "react";
import { Link } from "react-router-dom";

function LandingPage() {
  return (
	<div>
	  {/* Hero Section */}
	  <section className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-24">
		<div className="container mx-auto px-4 text-center">
		  <h1 className="text-5xl font-extrabold mb-6">
			Simplify Your Events, Subscriptions, and Zoom Meetings
		  </h1>
		  <p className="text-lg mb-8 max-w-2xl mx-auto">
			Automate event scheduling, effortlessly manage subscribers, and create seamless Zoom integrations—all in one intuitive platform.
		  </p>
		  <Link to="/signup">
			<button className="bg-white text-blue-600 font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-shadow">
			  Start Free Trial
			</button>
		  </Link>
		</div>
	  </section>

	  {/* Feature Highlights */}
	  <section className="py-20 bg-gray-50">
		<div className="container mx-auto px-4">
		  <h2 className="text-4xl font-bold text-center mb-14">Powerful Features, Effortless Experience</h2>
		  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
			<FeatureCard
			  imgSrc="/images/calendar.svg"
			  title="Automated Scheduling"
			  description="Create recurring events in minutes, with automatic reminders and confirmations."
			/>
			<FeatureCard
			  imgSrc="/images/stripe.svg"
			  title="Secure Payments"
			  description="Manage subscriber payments seamlessly through built-in Stripe integration."
			/>
			<FeatureCard
			  imgSrc="/images/zoom.svg"
			  title="Zoom Automation"
			  description="Automatically generate Zoom meetings and email invites to subscribers each event day."
			/>
			<FeatureCard
			  imgSrc="/images/dashboard.svg"
			  title="Real-Time Insights"
			  description="Track event attendance, subscriber growth, and meeting analytics from one dashboard."
			/>
		  </div>
		</div>
	  </section>

	  {/* Step-by-Step Guide */}
	  <section className="py-20">
		<div className="container mx-auto px-4">
		  <h2 className="text-4xl font-bold text-center mb-14">Getting Started is Easy</h2>
		  <div className="grid md:grid-cols-4 gap-8 text-center">
			<Step number="1" title="Sign Up" description="Create your account and connect Stripe securely." />
			<Step number="2" title="Set Up Events" description="Define your recurring events quickly and easily." />
			<Step number="3" title="Automate Zoom" description="Let the platform handle Zoom meeting creation and invites." />
			<Step number="4" title="Engage" description="Focus on connecting with your community—hassle-free." />
		  </div>
		</div>
	  </section>

	  {/* Testimonials Section */}
	  <section className="py-20 bg-gray-100">
		<div className="container mx-auto px-4 text-center">
		  <h2 className="text-4xl font-bold mb-12">Loved by Growing Businesses</h2>
		  <blockquote className="max-w-3xl mx-auto italic text-xl">
			"The automated Zoom meetings and subscriber management have saved hours of administrative work each week. Absolutely indispensable."
		  </blockquote>
		  <p className="mt-4 font-semibold">— Jane Doe, CEO of Acme Corp</p>
		</div>
	  </section>

	  {/* Call-to-Action */}
	  <section className="py-20 bg-indigo-600 text-white text-center">
		<h2 className="text-4xl font-bold mb-6">Ready to Streamline Your Workflow?</h2>
		<Link to="/signup">
		  <button className="bg-white text-indigo-600 font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-shadow">
			Get Started Now
		  </button>
		</Link>
	  </section>

	  {/* Footer */}
	  <footer className="bg-gray-800 text-gray-300 py-8">
		<div className="container mx-auto px-4 text-center">
		  <p>&copy; {new Date().getFullYear()} Your Company Name. All rights reserved.</p>
		  <nav className="mt-4">
			<Link to="/privacy" className="mx-3 hover:text-white">Privacy Policy</Link>
			<Link to="/terms" className="mx-3 hover:text-white">Terms of Service</Link>
			<Link to="/contact" className="mx-3 hover:text-white">Contact</Link>
		  </nav>
		</div>
	  </footer>
	</div>
  );
}

function FeatureCard({ imgSrc, title, description }) {
  return (
	<div className="bg-white rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow">
	  <img src={imgSrc} alt={title} className="mx-auto h-16 mb-4" />
	  <h3 className="text-xl font-semibold mb-2">{title}</h3>
	  <p className="text-gray-600">{description}</p>
	</div>
  );
}

function Step({ number, title, description }) {
  return (
	<div>
	  <div className="mb-4 inline-block rounded-full bg-indigo-600 text-white font-bold w-12 h-12 flex items-center justify-center text-xl shadow-md">
		{number}
	  </div>
	  <h3 className="text-xl font-semibold mb-2">{title}</h3>
	  <p className="text-gray-600">{description}</p>
	</div>
  );
}

export default LandingPage;