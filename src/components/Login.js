/************************************************************
 * src/components/Login.js
 ************************************************************/
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
	  const user = userCredential.user;
	  onLoginSuccess(user);
	} catch (err) {
	  setError(err.message);
	  console.error("Email login error:", err);
	}
  }

  const googleProvider = new GoogleAuthProvider();

  async function handleGoogleLogin() {
	try {
	  const result = await signInWithPopup(auth, googleProvider);
	  const user = result.user;
	  onLoginSuccess(user);
	} catch (err) {
	  setError(err.message);
	  console.error("Google login error:", err);
	}
  }

  return (
	<div style={{ margin: "0 auto", maxWidth: 300 }}>
	  <h2>Login</h2>
	  {error && <p style={{ color: "red" }}>{error}</p>}

	  <form onSubmit={handleEmailLogin} style={{ marginBottom: "1.5rem" }}>
		<div style={{ marginBottom: "1rem" }}>
		  <label style={{ display: "block", marginBottom: "0.5rem" }}>
			Email:
		  </label>
		  <input
			type="email"
			required
			value={email}
			onChange={(e) => setEmail(e.target.value)}
			style={{ width: "100%", padding: "0.5rem" }}
		  />
		</div>
		<div style={{ marginBottom: "1rem" }}>
		  <label style={{ display: "block", marginBottom: "0.5rem" }}>
			Password:
		  </label>
		  <input
			type="password"
			required
			value={password}
			onChange={(e) => setPassword(e.target.value)}
			style={{ width: "100%", padding: "0.5rem" }}
		  />
		</div>
		<button
		  type="submit"
		  style={{
			width: "100%",
			backgroundColor: "#4CAF50",
			color: "#fff",
			padding: "0.75rem",
			border: "none",
			borderRadius: "4px",
			cursor: "pointer"
		  }}
		>
		  Login with Email
		</button>
	  </form>

	  <div style={{ textAlign: "center", marginBottom: "1rem", fontWeight: "bold" }}>
		OR
	  </div>

	  <button
		onClick={handleGoogleLogin}
		style={{
		  width: "100%",
		  backgroundColor: "#4285F4",
		  color: "#fff",
		  padding: "0.75rem",
		  border: "none",
		  borderRadius: "4px",
		  cursor: "pointer"
		}}
	  >
		Login with Google
	  </button>
	</div>
  );
}

export default Login;
