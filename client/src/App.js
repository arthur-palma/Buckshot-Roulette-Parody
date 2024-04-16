import React, { useState, useEffect } from "react";
import "./App.css";
import GameScreen from "./Screens/GameScreen";
import StartGameScreen from "./Screens/StartGameScreen";

const App = () => {
  const [clientID, setClientID] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [gameID, setGameID] = useState(null);
  const [roundWarning, setRoundWarning] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket("ws://localhost:9999");
      socket.onopen = () => {
        console.log("WebSocket connected");
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      setWs(socket);
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleMessage = (data) => {
    console.log("Received message:", data);

    if (data.type === "CONNECTION") {
      setClientID(data.client_id);
    } else if (data.type === "GAME_SETTINGS") {
      setGameState(data.game_state);
      setGameID(data.game_id);
      setRoundWarning(data.game_state.round_warning);
    } else if (data.type === "GAME_STATE") {
      setGameState(data.game_state);
      if (data.game_state.round_warning !== null) {
        setRoundWarning(data.game_state.round_warning);
      }
    }
  };

  const sendToServer = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  const startGame = (playerName) => {
    const message = {
      type: "START_GAME",
      player_name: playerName,
      player_id: clientID,
    };
    sendToServer(message);
  };

  const getOtherPlayerId = (currentID) => {
    for (let player_id in gameState.players) {
      if (parseInt(player_id) !== currentID) {
        return parseInt(player_id);
      }
    }
  };

  useEffect(() => {}, [gameState]);

  // return (
  //   <div>
  //     {gameState === null ? (
  //       <div>
  //         <input
  //           type="text"
  //           value={playerName}
  //           onChange={(e) => setPlayerName(e.target.value)}
  //           placeholder="Seu nome"
  //         />
  //         <button onClick={() => startGame(playerName)}>
  //           Encontrar um Jogo
  //         </button>
  //         <button onClick={() => console.log("Sair")}>Sair</button>
  //       </div>
  //     ) : (
  //       <div>
  //         {gameState.message !== null && <h1>{gameState.message}</h1>}
  //         {gameState.status === "WAITING_PLAYERS" ? (
  //           <p>Aguardando outro jogador...</p>
  //         ) : (
  //           <div>
  //             {gameState.player_turn !== clientID && (
  //               <div>
  //                 <h1>{"Vez do : " + gameState.player_turn}</h1>
  //                 <p>Aguarde a sua vez</p>
  //               </div>
  //             )}
  //             {gameState?.player_turn === clientID && (
  //               <div>
  //                 <button onClick={() => setShowShootButton(true)}>
  //                   Atirar
  //                 </button>
  //                 {showShootButton ? (
  //                   <div>
  //                     {gameState.players[clientID].items.length > 0 && (
  //                       <div>
  //                         <h2>Itens disponíveis:</h2>
  //                         {gameState.players[clientID].items.map(
  //                           (item, index) => (
  //                             <button
  //                               key={index}
  //                               onClick={() =>
  //                                 handleAction("USE_ITEM", item.name)
  //                               }
  //                             >
  //                               {item.name}
  //                             </button>
  //                           )
  //                         )}
  //                       </div>
  //                     )}
  //                   </div>
  //                 ) : (
  //                   <div>
  //                     <button onClick={() => handleAction("SHOOT_SELF")}>
  //                       Atirar em si mesmo
  //                     </button>
  //                     <button onClick={() => handleAction("SHOOT_OPPONENT")}>
  //                       Atirar no adversário
  //                     </button>
  //                   </div>
  //                 )}
  //               </div>
  //             )}
  //           </div>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );

  //   <div className="search-game">
  //     <button onClick={() => startGame("playerName")}>
  //       Encontrar um Jogo
  //     </button>
  //   </div>
  // ) : gameState.status === "WAITING_PLAYERS" ? (
  //   <div className="waiting-players">
  //     <p className="warning">Aguardando outros jogadores...</p>
  //   </div>

  return (
    <>
      {gameState === null || gameState?.status === "WAITING_PLAYERS" ? (
        <StartGameScreen
          gameState={gameState}
          clientID={clientID}
          sendToServer={sendToServer}
        />
      ) : (
        <GameScreen
          gameState={gameState}
          gameID={gameID}
          clientID={clientID}
          sendToServer={sendToServer}
          roundWarning={roundWarning}
        />
      )}
    </>

    // <div className="container">
    //   <div className="game_board">
    //     {showVideo && (
    //       <div className="video-container">
    //         <video src={videoUrl} onEnded={handleVideoEnd} controls autoPlay />
    //       </div>
    //     )}
    //   </div>
    // </div>
  );
};

export default App;
