// File: /Users/chrismeisner/Projects/subbers/src/components/Header.js

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

function Header({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
	<header className="bg-white shadow">
	  <div className="container mx-auto flex justify-between items-center py-4 px-6">
		{/* Branding / Logo */}
		<Link to="/" className="text-2xl font-bold text-blue-600">
		  Subbers
		</Link>

		{/* Desktop Navigation */}
		<nav className="hidden md:flex space-x-4">
		  <Link to="/" className="text-gray-700 hover:text-blue-600">
			Home
		  </Link>
		  {user ? (
			<>
			  <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
				Dashboard
			  </Link>
			  <button
				onClick={() => signOut(auth)}
				className="text-gray-700 hover:text-blue-600 focus:outline-none"
			  >
				Sign Out
			  </button>
			</>
		  ) : (
			<Link to="/login" className="text-gray-700 hover:text-blue-600">
			  Sign In
			</Link>
		  )}
		</nav>

		{/* Mobile Menu Toggle */}
		<div className="md:hidden">
		  <button
			onClick={() => setIsMenuOpen(!isMenuOpen)}
			className="text-gray-700 focus:outline-none"
		  >
			<svg
			  className="h-6 w-6 fill-current"
			  viewBox="0 0 24 24"
			  xmlns="http://www.w3.org/2000/svg"
			>
			  {isMenuOpen ? (
				<path
				  fillRule="evenodd"
				  clipRule="evenodd"
				  d="M18.3 5.71a1 1 0 00-1.42-1.42L12 9.17 7.12 4.29A1 1 0 105.7 5.71L10.59 10.6 5.7 15.49a1 1 0 001.42 1.42L12 12.83l4.88 4.88a1 1 0 001.42-1.42L13.41 10.6l4.89-4.89z"
				/>
			  ) : (
				<path
				  fillRule="evenodd"
				  d="M4 5h16v2H4V5zm0 6h16v2H4v-2zm0 6h16v2H4v-2z"
				/>
			  )}
			</svg>
		  </button>
		</div>
	  </div>

	  {/* Mobile Navigation Menu */}
	  {isMenuOpen && (
		<div className="md:hidden bg-white shadow">
		  <nav className="px-4 pt-2 pb-4 space-y-2">
			<Link
			  to="/"
			  className="block text-gray-700 hover:text-blue-600"
			  onClick={() => setIsMenuOpen(false)}
			>
			  Home
			</Link>
			{user ? (
			  <>
				<Link
				  to="/dashboard"
				  className="block text-gray-700 hover:text-blue-600"
				  onClick={() => setIsMenuOpen(false)}
				>
				  Dashboard
				</Link>
				<button
				  onClick={() => {
					signOut(auth);
					setIsMenuOpen(false);
				  }}
				  className="block text-gray-700 hover:text-blue-600"
				>
				  Sign Out
				</button>
			  </>
			) : (
			  <Link
				to="/login"
				className="block text-gray-700 hover:text-blue-600"
				onClick={() => setIsMenuOpen(false)}
			  >
				Sign In
			  </Link>
			)}
		  </nav>
		</div>
	  )}
	</header>
  );
}

export default Header;
