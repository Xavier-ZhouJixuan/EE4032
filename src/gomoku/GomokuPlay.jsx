import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { game1Bg } from "../backgroundImage";
import { getContracts } from "../contract/contractService";

const CELL_SIZE = 36; // px per grid cell
const cellStyle = (isMyTurn, value) => {
  const style = {
    width: CELL_SIZE,
    height: CELL_SIZE,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 0,
    transition: "background-color 120ms ease, transform 80ms ease",
    cursor: value === 0 && isMyTurn ? "pointer" : "default",
    backgroundColor: value === 0 && isMyTurn ? "rgba(0,0,0,0.025)" : "transparent",
  };
  if (value === 1) {
    style.background =
      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85))";
    style.backgroundColor = "#222";
    style.boxShadow = "inset 0 1px 2px rgba(255,255,255,0.25), 0 4px 8px rgba(0,0,0,0.25)";
    style.borderRadius = "50%";
    style.margin = 5;
  } else if (value === 2) {
    style.background =
      "radial-gradient(circle at 30% 30%, #fff, #f1f1f1 40%, #e2e2e2 70%, #d6d6d6)";
    style.backgroundColor = "#f9f9f9";
    style.boxShadow = "inset 0 2px 2px rgba(255,255,255,0.8), 0 3px 6px rgba(0,0,0,0.15)";
    style.border = "1px solid rgba(0,0,0,0.08)";
    style.borderRadius = "50%";
    style.margin = 5;
  }
  return style;
};

const stoneStyle = (cell) => {
  const base = {
    width: CELL_SIZE - 10,
    height: CELL_SIZE - 10,
    borderRadius: "50%",
    boxShadow:
      cell === 1
        ? "inset 0 1px 2px rgba(255,255,255,0.25), 0 4px 8px rgba(0,0,0,0.25)"
        : "inset 0 2px 2px rgba(255,255,255,0.8), 0 3px 6px rgba(0,0,0,0.15)",
  };
  if (cell === 1) {
    return {
      ...base,
      background:
        "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85))",
      backgroundColor: "#222",
    };
  }
  if (cell === 2) {
    return {
      ...base,
      background:
        "radial-gradient(circle at 30% 30%, #fff, #f1f1f1 40%, #e2e2e2 70%, #d6d6d6)",
      backgroundColor: "#f9f9f9",
      border: "1px solid rgba(0,0,0,0.08)",
    };
  }
  return { display: "none" };
};

const STATUS = { 0: "Lobby", 1: "In Progress", 2: "Finished" };

export default function GomokuPlay() {
  const { id } = useParams();
  const gameId = Number(id) || 0;
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [gameDetails, setGameDetails] = useState(null);
  const [board, setBoard] = useState([]);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { gomokuContract, signer } = getContracts();
      const currentAccount = await signer.getAddress();
      setAccount(currentAccount);

      if (gameId > 0) {
        const details = await gomokuContract.getGameDetails(gameId);
        setGameDetails({
          gameId: Number(details.gameId),
          players: details.players,
          turn: details.turn,
          status: Number(details.status),
          winner: details.winner,
          stake: details.stake,
          moveCount: Number(details.moveCount),
        });
        const b = await gomokuContract.getBoard(gameId);
        setBoard(b.map((row) => row.map((n) => Number(n))));
      }
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.message || "Failed to fetch game state");
    }
  }, [gameId]);

  useEffect(() => {
    refresh();
    try {
      const { gomokuContract } = getContracts();
      gomokuContract.on("MoveMade", () => refresh());
      gomokuContract.on("GameEnded", () => refresh());
      gomokuContract.on("GameStarted", () => refresh());
      return () => {
        try {
          gomokuContract.removeAllListeners("MoveMade");
          gomokuContract.removeAllListeners("GameEnded");
          gomokuContract.removeAllListeners("GameStarted");
        } catch {}
      };
    } catch {}
  }, [refresh]);

  const myTurn = useMemo(() => {
    if (!gameDetails || !account) return false;
    return (
      gameDetails.turn?.toLowerCase() === account.toLowerCase() &&
      gameDetails.status === 1
    );
  }, [gameDetails, account]);

  const handleMove = async (x, y) => {
    if (!myTurn || board[x][y] !== 0) return;
    try {
      setMoving(true);
      setError("");
      const { gomokuContract } = getContracts();
      const tx = await gomokuContract.makeMove(gameId, x, y);
      await tx.wait();
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.message || "Move failed");
    } finally {
      setMoving(false);
    }
  };

  const goBack = () => navigate("/game1");

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={goBack}>Back</button>
      <h2 style={{ color: "#fff" }}>Gomoku</h2>
      {error && <div style={styles.error}>{error}</div>}

      {gameDetails && (
        <div style={styles.stateCard}>
          <div><strong>Game:</strong> #{gameDetails.gameId}</div>
          <div><strong>Status:</strong> {STATUS[gameDetails.status] || gameDetails.status}</div>
          <div><strong>Player 1 (Black):</strong> {gameDetails.players?.[0]}</div>
          <div><strong>Player 2 (White):</strong> {gameDetails.players?.[1] || "-"}</div>
          <div><strong>Turn:</strong> {gameDetails.turn}</div>
          <div><strong>Stake:</strong> {ethers.formatEther(gameDetails.stake || 0)} ETH</div>
          {gameDetails.status === 2 && (
            <div><strong>Winner:</strong> {gameDetails.winner === ethers.ZeroAddress ? "Draw" : gameDetails.winner}</div>
          )}
          {gameDetails.status === 0 && account && gameDetails.players?.[0] &&
            account.toLowerCase() === gameDetails.players[0].toLowerCase() && (
              <CancelGameButton gameId={gameId} onAfter={refresh} />
          )}
        </div>
      )}

      {board && board.length > 0 && (
        <div style={{
          ...styles.board,
          backgroundImage:
            "linear-gradient(#b78b45 1px, transparent 1px), linear-gradient(90deg, #b78b45 1px, transparent 1px)",
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          backgroundPosition: "12px 12px",
        }}>
          {board.map((row, x) => (
            <div key={x} style={styles.boardRow}>
              {row.map((cell, y) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    ...cellStyle(myTurn, cell),
                    color: cell === 1 ? "#111" : cell === 2 ? "#6b7280" : "#333",
                  }}
                  onClick={() => handleMove(x, y)}
                  title={`(${x + 1}, ${y + 1})`}
                >
                  {cell === 1 ? "●" : cell === 2 ? "○" : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CancelGameButton({ gameId, onAfter }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const onCancel = async () => {
    try {
      setBusy(true);
      setErr("");
      const { gomokuContract } = getContracts();
      const tx = await gomokuContract.cancelGame(gameId);
      await tx.wait();
      onAfter?.();
    } catch (e) {
      console.error(e);
      setErr(e?.reason || e?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={onCancel} style={styles.primaryBtn} disabled={busy}>
        {busy ? "Cancelling…" : "Cancel Game"}
      </button>
      {err && <div style={styles.error}>{err}</div>}
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
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
  stateCard: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    padding: "8px 14px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  error: {
    background: "#ffe5e5",
    color: "#b00000",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  board: {
    display: "inline-block",
    margin: "24px auto",
    padding: 12,
    background: "#f6e3b4",
    borderRadius: 12,
    border: "3px solid #b78b45",
    boxShadow: "0 6px 20px rgba(0,0,0,0.15), inset 0 0 0 2px #b78b45, inset 0 0 25px rgba(0,0,0,0.06)",
  },
  boardRow: {
    display: "flex",
    gap: 0,
  },
};
