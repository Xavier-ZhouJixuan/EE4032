import React, { useState } from "react";
import { ethers } from "ethers";
import { UserVaultABI } from "../contract/contractABI";
import { CONTRACT_ADDRESS } from "../contract/contractConfig";
import { registerBg } from "../backgroundImage";


function RegisterPage({ onBack, onRegisterSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    setMessage(""); // Clear previous message

    if (!username || !password || !confirmPassword) {
      setMessage("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      if (!window.ethereum) {
        setMessage("Please install MetaMask");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, UserVaultABI, signer);

      // Call registration function
      const tx = await contract.registerUser(username, password);
      setMessage("Transaction sent, waiting for block confirmation...");
      await tx.wait(); // Wait for block confirmation
      setMessage("Registration successful!");
      
      // Call callback after successful registration
      setTimeout(() => {
        onRegisterSuccess?.();
      }, 1500); // Delay 1.5 seconds to let user see success message
    } catch (err) {
      console.error(err);

      // Handle Solidity revert error messages
      let errorMsg = err?.data?.message || err?.message || "Registration failed";
      if (errorMsg.includes("Username already taken")) {
        setMessage("Username already taken");
      } else if (errorMsg.includes("User already registered")) {
        setMessage("You have already registered");
      } else {
        setMessage(errorMsg);
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2>User Registration</h2>
      <input
        style={styles.input}
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <button style={styles.button} onClick={handleRegister}>
        Register
      </button>
      <button style={styles.backButton} onClick={onBack}>
        Back
      </button>
      {message && <p style={{ color: message.includes("successful") ? "green" : "red" }}>{message}</p>}
    </div>
  );
}

const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: `url(${registerBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    gap: "12px",
  },
  input: {
    padding: "8px 12px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    width: "200px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#3b82f6",
    color: "white",
    marginTop: "8px",
  },
  backButton: {
    padding: "8px 16px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #888",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#333",
    marginTop: "4px",
  },
};

export default RegisterPage;
