import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "../firebase";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleEmailLogin(e) {
	e.preventDefault();
	try {
	  const userCredential = await signInWithEmailAndPassword(auth, email, password);
	  onLoginSuccess(userCredential.user);
	} catch (err) {
	  setError(err.message);
	  console.error("Email login error:", err);
	}
  }

  const googleProvider = new GoogleAuthProvider();

  async function handleGoogleLogin() {
	try {
	  const result = await signInWithPopup(auth, googleProvider);
	  onLoginSuccess(result.user);
	} catch (err) {
	  setError(err.message);
	  console.error("Google login error:", err);
	}
  }

  return (
	<div className="max-w-sm mx-auto p-6 bg-white shadow rounded">
	  <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
	  {error && <p className="text-red-500 mb-4">{error}</p>}

	  <form onSubmit={handleEmailLogin} className="mb-6">
		<div className="mb-4">
		  <label className="block text-sm font-medium text-gray-700 mb-1">
			Email:
		  </label>
		  <input
			type="email"
			required
			value={email}
			onChange={(e) => setEmail(e.target.value)}
			className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
		  />
		</div>
		<div className="mb-4">
		  <label className="block text-sm font-medium text-gray-700 mb-1">
			Password:
		  </label>
		  <input
			type="password"
			required
			value={password}
			onChange={(e) => setPassword(e.target.value)}
			className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
		  />
		</div>
		<button
		  type="submit"
		  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
		>
		  Login with Email
		</button>
	  </form>

	  <div className="text-center mb-4 font-bold text-gray-700">OR</div>

	  <button
		onClick={handleGoogleLogin}
		className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
	  >
		Login with Google
	  </button>
	</div>
  );
}

export default Login;
