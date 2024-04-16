import React from "react";

const PlayerShootingActions = ({ gameState, clientID, handleAction }) => (
  <div className="buttons-box-div">
    {gameState.player_turn === clientID ? (
      <>
        <p className="action-label">SHOOT:</p>
        <div className="buttons-box">
          <button
            className="action-button"
            onClick={() => handleAction("SHOOT_SELF")}
            disabled={gameState.status === "ENDED"}
          >
            YOU
          </button>
          <button
            className="action-button"
            onClick={() => handleAction("SHOOT")}
            disabled={gameState.status === "ENDED"}
          >
            ENEMY
          </button>
        </div>
      </>
    ) : (
      <p className="action-label">AGUARDE SUA VEZ</p>
    )}
  </div>
);

export default PlayerShootingActions;
