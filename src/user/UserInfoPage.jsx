import React, { useState } from "react";
import { ethers } from "ethers";
import { UserVaultABI } from "../contract/contractABI";
import { CONTRACT_ADDRESS } from "../contract/contractConfig";
import { userInfoBg } from "../backgroundImage";

const UserInfoPage = ({ userInfo, onBack, onChangePassword, onLogout, onRecharge, onWithdraw }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }
    try {
      setLoggingOut(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, UserVaultABI, signer);
      const tx = await contract.logout();
      await tx.wait();
      alert("✅ Logged out");
      onLogout?.();
    } catch (err) {
      console.error(err);
      alert("❌ Logout failed: " + (err.data?.message || err.message));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={onBack}>⬅ Back</button>

      <h2>User Information</h2>
      <div style={styles.infoBox}>
        <div><strong>Username:</strong> {userInfo.username}</div>
        <div><strong>Balance:</strong> {ethers.utils.formatEther(userInfo.balance || "0")} ETH</div>
        <div><strong>Status:</strong> {userInfo.frozen ? "❌ Frozen" : "✅ Active"}</div>
      </div>

      <div style={styles.buttonGroup}>
        <button style={styles.actionButton} onClick={onChangePassword}>
          Change Password
        </button>
        <button style={styles.actionButton} onClick={onRecharge}>
          Recharge
        </button>
        <button style={styles.actionButton} onClick={onWithdraw}>
          Withdraw
        </button>
        <button style={styles.actionButton} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    textAlign: "center",
    backgroundImage: `url(${userInfoBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh",
  },
  backButton: {
    position: "absolute",
    top: "20px",
    left: "20px",
    padding: "8px 12px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#6c757d",
    color: "#fff",
    cursor: "pointer",
  },
  infoBox: {
    margin: "20px auto",
    padding: "15px",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    width: "300px",
    textAlign: "left",
  },
  buttonGroup: {
    marginTop: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    alignItems: "center",
  },
  actionButton: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    width: "200px",
  },
};

export default UserInfoPage;