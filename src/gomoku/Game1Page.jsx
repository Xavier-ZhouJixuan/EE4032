import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { GomokuABI } from "../contract/gomokuABI";
import { GOMOKU_ADDRESS } from "../contract/gomokuConfig";
import { CONTRACT_ADDRESS } from "../contract/contractConfig";
import { game1Bg } from "../backgroundImage";

const STATUS = {
  0: "Lobby",
  1: "In Progress",
  2: "Finished",
};

function toWei(v) {
  try { return ethers.utils.parseEther(String(v)); } catch { return null; }
}

const cellStyle = (isMyTurn, value) => ({
  width: 34,
  height: 34,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "rgba(255,255,255,0.75)",
  backgroundImage:
    value === 0
      ? "none"
      : (value === 1
          ? "radial-gradient(circle at 35% 35%, #555 0%, #111 70%)"
          : "radial-gradient(circle at 35% 35%, #fff 0%, #e6e6e6 70%)"),
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "22px 22px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 0,
  cursor: value === 0 && isMyTurn ? "pointer" : "default",
});

const pieceStyle = (val) => ({
  width: 22,
  height: 22,
  borderRadius: "50%",
  boxShadow: "0 2px 3px rgba(0,0,0,0.25)",
  background: val === 1
    ? "radial-gradient(circle at 35% 35%, #555 0%, #111 70%)"
    : "radial-gradient(circle at 35% 35%, #fff 0%, #e6e6e6 70%)",
  border: val === 2 ? "1px solid #d6d6d6" : "none",
});

export default function Game1Page({ onBack }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [gomokuAddress, setGomokuAddress] = useState("");
  const [pendingDeploy, setPendingDeploy] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [vaultInGomoku, setVaultInGomoku] = useState("");
  const [vaultMatches, setVaultMatches] = useState(null);
  const [vaultBalance, setVaultBalance] = useState(null);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [moving, setMoving] = useState(false);

  const [stakeInput, setStakeInput] = useState("");
  const [joinIdInput, setJoinIdInput] = useState("");

  const [currentGameId, setCurrentGameId] = useState(0);
  const [gameDetails, setGameDetails] = useState(null);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState("");

  const resolveGomokuAddress = () => {
    if (ethers.utils.isAddress(GOMOKU_ADDRESS)) return GOMOKU_ADDRESS;
    const stored = window.localStorage?.getItem("gomokuAddress");
    if (stored && ethers.utils.isAddress(stored)) return stored;
    return "";
  };

  const init = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask");
      return;
    }
    try {
      const p = new ethers.providers.Web3Provider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = p.getSigner();
      const addr = await s.getAddress();
      const gx = resolveGomokuAddress();
      if (!gx) {
        // no valid address yet; wait for user to set or deploy
        setProvider(p);
        setSigner(s);
        setAccount(addr);
        setGomokuAddress("");
        return;
      }
      const c = new ethers.Contract(gx, GomokuABI, s);

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setContract(c);
      setGomokuAddress(gx);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to init provider");
    }
  }, []);

  const refreshState = useCallback(async () => {
    if (!contract || !account) return;
    try {

      const gid = await contract.playerCurrentGame(account);
      const idNum = Number(gid);
      setCurrentGameId(idNum);
      if (idNum > 0) {
        const details = await contract.getGameDetails(idNum);
        // details: [gameId, players, turn, status, winner, stake, board, moveCount]
        setGameDetails({
          gameId: Number(details[0]),
          players: details[1],
          turn: details[2],
          status: Number(details[3]),
          winner: details[4],
          stake: details[5],
          moveCount: Number(details[7]),
        });
        const b = await contract.getBoard(idNum);
        setBoard(b.map(row => row.map(n => Number(n))));
      } else {
        setGameDetails(null);
        setBoard([]);
      }
    } catch (e) {
      console.error(e);
      setError(e?.data?.message || e?.message || "Failed to fetch game state");
    }
  }, [contract, account]);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { refreshState(); }, [refreshState]);
  useEffect(() => {
    if (!currentGameId) return;
    const t = setInterval(() => { refreshState(); }, 3000);
    return () => clearInterval(t);
  }, [currentGameId, refreshState]);

  const myTurn = useMemo(() => {
    if (!gameDetails || !account) return false;
    return gameDetails.turn?.toLowerCase() === account.toLowerCase() && gameDetails.status === 1;
  }, [gameDetails, account]);

  const canInteract = useMemo(() => !!gomokuAddress, [gomokuAddress]);

  const stakeWei = useMemo(() => toWei(stakeInput), [stakeInput]);
  const balanceEnoughForCreate = true;
  const balanceEnoughForJoin = true;

  const handleUseAddress = () => {
    // simplified UI: address is taken from config/localStorage
  };

  const handleDeploy = async () => {
    // removed from minimal UI
  };

  const handleCreate = async () => {
    if (!contract) return;
    
    const wei = stakeWei;
    if (!wei || wei.lte(0)) {
      setError("Invalid stake amount");
      return;
    }
    
    try {
      setCreating(true);
      setError("");
      const tx = await contract.createGame(wei);
      await tx.wait();
      await refreshState();
    } catch (e) {
      console.error(e);
      setError(e?.data?.message || e?.message || "Create game failed");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!contract) return;
    
    const id = Number(joinIdInput);
    if (!id || id <= 0) {
      setError("Invalid game ID");
      return;
    }
    
    try {
      setJoining(true);
      setError("");
      const tx = await contract.joinGame(id);
      await tx.wait();
      await refreshState();
    } catch (e) {
      console.error(e);
      setError(e?.data?.message || e?.message || "Join game failed");
    } finally {
      setJoining(false);
    }
  };

  const handleMove = async (x, y) => {
    if (!contract || !currentGameId) return;
    if (!myTurn) return;
    if (board[x][y] !== 0) return;
    try {
      setMoving(true);
      setError("");
      const tx = await contract.makeMove(currentGameId, x, y);
      await tx.wait();
      await refreshState();
    } catch (e) {
      console.error(e);
      setError(e?.data?.message || e?.message || "Move failed");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={onBack}>Back</button>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.headerRow}>
        <h2 style={{ color: "#fff", margin: 0 }}>Gomoku</h2>
        <div style={styles.tag}>Contract: {gomokuAddress ? shortAddr(gomokuAddress) : "not set"}</div>
      </div>

      {/* Address setup / deploy (hidden) */}
      <div style={{display:'none'}}>
      {/* Address setup / deploy */}
      <div style={styles.stateCard}>
        <div><strong>Gomoku Contract:</strong> {gomokuAddress || "(not set)"}</div>
        {gomokuAddress && (
          <>
            <div><strong>Vault (from Gomoku):</strong> {vaultInGomoku || "-"}</div>
            <div><strong>Vault (from App):</strong> {CONTRACT_ADDRESS}</div>
            {vaultMatches === false && (
              <div style={styles.warn}>Warning: Vault mismatch. Deploy a new Gomoku using current CONTRACT_ADDRESS, or switch CONTRACT_ADDRESS / use a Gomoku tied to that vault.</div>
            )}
            {vaultMatches === true && (
              <div style={styles.ok}>Vault check passed.</div>
            )}
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 6 }}>Set existing address or deploy a new one:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              style={styles.input}
              placeholder="0x... existing Gomoku address"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />
            <button style={styles.primaryBtn} onClick={handleUseAddress}>Use Address</button>
            <button style={styles.primaryBtn} onClick={handleDeploy} disabled={pendingDeploy}>
              {pendingDeploy ? "Deploying..." : "Deploy New"}
            </button>
          </div>
          <div style={styles.hint}>Deploy uses your current wallet and sets UserVault to CONTRACT_ADDRESS. After deploy, the vault owner must add this Gomoku address to whitelist.</div>
        </div>
      </div>

      <div style={styles.stateCard}>
        <div><strong>Your Vault Balance:</strong> {vaultBalance ? `${ethers.utils.formatEther(vaultBalance)} ETH` : "-"}</div>
        <div><strong>Create stake input:</strong> {stakeInput || "(none)"} {stakeInput ? "ETH" : ""}</div>
        {!balanceEnoughForCreate && (
          <div style={styles.warn}>Insufficient balance to create with current stake.</div>
        )}
        {gameDetails?.stake && (
          <div>
            <strong>Join requires stake:</strong> {ethers.utils.formatEther(gameDetails.stake)} ETH
            {!balanceEnoughForJoin && (
              <div style={styles.warn}>Insufficient balance to join this game.</div>
            )}
          </div>
        )}
      </div>
      </div>

      <div style={styles.actionsRow}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Create Game</div>
          <input
            type="number"
            placeholder="Stake in ETH"
            min="0"
            value={stakeInput}
            onChange={(e) => setStakeInput(e.target.value)}
            style={styles.input}
          />
          <button disabled={creating || !account || !canInteract} onClick={handleCreate} style={styles.primaryBtn}>
            {creating ? "Creating..." : "Create"}
          </button>
          <div style={styles.hint}>Requires sufficient balance in UserVault (deposit first)</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Join Game</div>
          <input
            type="number"
            placeholder="Game ID"
            min="1"
            value={joinIdInput}
            onChange={(e) => setJoinIdInput(e.target.value)}
            style={styles.input}
          />
          <button disabled={joining || !account || !canInteract} onClick={handleJoin} style={styles.primaryBtn}>
            {joining ? "Joining..." : "Join"}
          </button>
        </div>
      </div>

      <div style={styles.stateCard}>
        <div><strong>Account:</strong> {account || "-"}</div>
        <div><strong>Current Game ID:</strong> {currentGameId || "-"}</div>
        {gameDetails && (
          <>
            <div><strong>Status:</strong> {STATUS[gameDetails.status] || gameDetails.status}</div>
            <div><strong>Player 1 (Black):</strong> {gameDetails.players?.[0]}</div>
            <div><strong>Player 2 (White):</strong> {gameDetails.players?.[1] || "-"}</div>
            <div><strong>Turn:</strong> {gameDetails.turn}</div>
            <div><strong>Stake:</strong> {ethers.utils.formatEther(gameDetails.stake || 0)} ETH</div>
            {gameDetails.status === 2 && (
              <div><strong>Winner:</strong> {gameDetails.winner || "Draw (payout split)"}</div>
            )}
          </>
        )}
      </div>

      {currentGameId > 0 && board && board.length === 15 && (
        <div style={styles.boardWrap}><div style={styles.board}>
          {board.map((row, x) => (
            <div key={x} style={styles.boardRow}>
              {row.map((val, y) => (
                <div
                  key={`${x}-${y}`}
                  style={cellStyle(myTurn && !moving, val)}
                  onClick={() => (myTurn && !moving && val === 0 ? handleMove(x, y) : null)}
                  title={val === 0 ? "" : val === 1 ? "Black" : "White"}
                >
                  {val !== 0 && <div style={pieceStyle(val)} />}
                </div>
              ))}
            </div>
          ))}
        </div></div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundImage: `url(${game1Bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    overflow: "auto",
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    padding: "8px 12px",
    borderRadius: 5,
    border: "none",
    backgroundColor: "#6c757d",
    color: "#fff",
    cursor: "pointer",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  tag: {
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "6px 10px",
    borderRadius: 8,
  },
  actionsRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    padding: 16,
    minWidth: 260,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    textAlign: "center",
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ccc",
    borderRadius: 6,
    marginBottom: 8,
  },
  primaryBtn: {
    padding: "8px 14px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,123,255,0.3)",
  },
  hint: {
    fontSize: 12,
    color: "#555",
    marginTop: 8,
  },
  stateCard: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    textAlign: "center",
  },
  error: {
    background: "#ffe5e5",
    color: "#b00000",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warn: {
    background: "#fff7e6",
    color: "#8a5300",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  ok: {
    background: "#ecfff0",
    color: "#0a6b2b",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  board: {
    display: "inline-block",
    padding: 10,
    background: "linear-gradient(135deg, #f7e3b2 0%, #f2d089 100%)",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.2)",
  },
  boardRow: {
    display: "flex",
  },
  boardWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: 12,
  },
};

function shortAddr(a){
  if (!a) return "";
  return `${a.slice(0,6)}...${a.slice(-4)}`;
}



