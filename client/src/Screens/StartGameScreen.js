import React, { useState, useEffect } from "react";

function StartGameScreen({ gameState, clientID, sendToServer }) {
  useEffect(() => {}, [gameState, clientID]);

  const [playerName, setPlayerName] = useState("");

  const startGame = (playerName) => {
    const message = {
      type: "START_GAME",
      player_name: playerName,
      player_id: clientID,
    };
    sendToServer(message);
  };

  return (
    <div className="container">
      <div className="search-game"></div>
      <div className="search-game-button-div">
        <div>
          <h1 className="title">Buckshot Roulette</h1>
          <h3 className="subtitle">Parody</h3>
        </div>
        {gameState === null ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startGame(playerName);
              }}
            >
              <input
                className="search-game-button"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nome do jogador"
              />
              <button
                className="search-game-button"
                type="submit"
                disabled={!playerName.trim()}
              >
                Encontrar um Jogo
              </button>
            </form>
          </>
        ) : gameState?.status === "WAITING_PLAYERS" ? (
          <div className="waiting-players">
            <p className="warning">Aguardando outros jogadores...</p>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

export default StartGameScreen;
