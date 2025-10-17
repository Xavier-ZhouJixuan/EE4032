import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { UserVaultABI } from "./contract/contractABI";
import { CONTRACT_ADDRESS } from "./contract/contractConfig";

import LoggedOutHome from "./LoggedOutHome";
import LoggedInHome from "./LoggedInHome";
import RegisterPage from "./register/RegisterPage";
import LoginPage from "./login/LoginPage";
import UserInfoPage from "./user/UserInfoPage";
import ChangePasswordPage from "./user/ChangePasswordPage"; 
import RechargePage from "./user/RechargePage";
import WithdrawPage from "./user/WithdrawPage";
import GamePage from "./game/GamePage";
import Game1Page from "./gomoku/Game1Page";

function App() {
  const [page, setPage] = useState("home"); 
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Check login status
  const checkLoginStatus = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, UserVaultABI, signer);

      const status = await contract.checkLoginStatus();
      console.log("Login status:", status); 
      setLoggedIn(status);

      if (status) {
        const info = await contract.getUserInfo();
        setUserInfo({
          username: info[0],
          balance: info[1].toString(),
          frozen: info[2],
        });
      }
    } catch (err) {
      console.error("Failed to check login status:", err);
      setLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Play button event
  const handlePlay = () => {
    if (!loggedIn) {
      alert("Please login first");
      return;
    }
    setPage("game"); // Navigate to game page
  };

  return (
    <>
      {page === "home" && (
        loggedIn ? (
          <LoggedInHome 
            userInfo={userInfo} 
            onPlayClick={handlePlay} 
            onUserInfoClick={() => setPage("userInfo")} // ✅ Click user info → navigate
          />
        ) : (
          <LoggedOutHome
            onRegisterClick={() => setPage("register")}
            onLoginClick={() => setPage("login")}
            onPlayClick={handlePlay}
          />
        )
      )}

      {page === "register" && (
        <RegisterPage 
          onBack={() => setPage("home")} 
          onRegisterSuccess={() => {
            checkLoginStatus(); // Refresh login status
            setPage("home"); // Return to home page
          }}
        />
      )}

      {page === "login" && (
        <LoginPage
          onBack={() => setPage("home")}
          onLoginSuccess={() => {
            checkLoginStatus(); // Refresh status after successful login
            setPage("home");
          }}
        />
      )}

      {page === "userInfo" && ( 
        <UserInfoPage 
          userInfo={userInfo} 
          onBack={() => setPage("home")} 
          onChangePassword={() => setPage("changePassword")}
          onRecharge={() => setPage("recharge")}
          onWithdraw={() => setPage("withdraw")}
        />
      )}

      {page === "changePassword" && (
        <ChangePasswordPage onBack={() => setPage("userInfo")} /> 
      )}

      {page === "recharge" && (
        <RechargePage
          onBack={() => setPage("userInfo")}
          onSubmit={(amount) => {
            alert(`Recharge submitted, amount: ${amount}`);
          }}
        />
      )}

      {page === "withdraw" && (
        <WithdrawPage
          onBack={() => setPage("userInfo")}
          onSubmit={(amount) => {
            alert(`Withdraw submitted, amount: ${amount}`);
          }}
        />
      )}

      {page === "game" && (
        <GamePage 
          onBack={() => setPage("home")} 
          onSelectGame1={() => setPage("game1")} 
          onSelectGame2={() => alert("Game 2 coming soon")} 
        />
      )}

      {page === "game1" && (
        <Game1Page onBack={() => setPage("game")} />
      )}
      
    </>
  );
}

export default App;
