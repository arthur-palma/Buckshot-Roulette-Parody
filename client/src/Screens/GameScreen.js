import React, { useState, useEffect } from "react";
import * as animations from "../Animations/animations";
import * as assets from "../assets/assets";
import RoundInfosComponent from "../component/RoundInfosComponent";
import PlayerItemsComponent from "../component/PlayerItemsComponent";
import PlayerShootingActions from "../component/PlayerShootingActions";

function GameScreen({
  gameState,
  gameID,
  clientID,
  sendToServer,
  roundWarning,
}) {
  const [showGif, setShowGif] = useState(false);
  const [gifUrl, setGifUrl] = useState("");

  useEffect(() => {
    if (gameState && gameState.last_action) {
      const isClientPlayer = gameState.last_action.last_player === clientID;
      let url = "";
      if (gameState.last_action.action.type === "SHOOT") {
        if (
          gameState.last_action.action.target_player_id ===
          gameState.last_action.last_player
        ) {
          if (gameState.last_action.action.bullet_charged) {
            if (gameState.status !== "ENDED") {
              url = isClientPlayer ? animations.self1 : animations.self3;
            } else {
              url = isClientPlayer ? animations.selfEnd1 : animations.selfEnd3;
            }
          } else {
            url = isClientPlayer
              ? animations.selfDischarged1
              : animations.selfDischarged3;
          }
        } else {
          if (gameState.last_action.action.bullet_charged) {
            if (gameState.status !== "ENDED") {
              url = isClientPlayer ? animations.shoot1 : animations.shoot3;
            } else {
              url = isClientPlayer
                ? animations.shootEnd1
                : animations.shootEnd3;
            }
          } else {
            url = isClientPlayer
              ? animations.shootDischarged1
              : animations.shootDischarged3;
          }
        }
      } else {
        switch (gameState.last_action.action.item_type) {
          case "Cigarrete":
            url = isClientPlayer
              ? animations.cigarrete1
              : animations.cigarrete3;
            break;
          case "Handcuffs":
            url = isClientPlayer
              ? animations.handcuffs1
              : animations.handcuffs3;
            break;
          case "MagnifyingGlass":
            if (gameState.last_action.action.bullet_charged) {
              url = isClientPlayer ? animations.glass1 : animations.glass3;
            } else {
              url = isClientPlayer
                ? animations.glassDischarged1
                : animations.glass3;
            }
            break;
          case "Saw":
            url = isClientPlayer ? animations.saw1 : animations.saw3;
            break;
          case "Beer":
            if (gameState.last_action.action.bullet_charged) {
              url = isClientPlayer ? animations.beer1 : animations.beer3;
            } else {
              url = isClientPlayer
                ? animations.beerDischarged1
                : animations.beerDischarged3;
            }
            break;
        }
      }
      setGifUrl(url);
      setShowGif(true);
    }
  }, [gameState, clientID, showGif]);

  function getGifUrlWithTimestamp(gifUrl) {
    return `${gifUrl}?t=${new Date().getTime()}`;
  }

  const getOtherPlayerId = (currentID) => {
    for (let player_id in gameState.players) {
      if (parseInt(player_id) !== currentID) {
        return parseInt(player_id);
      }
    }
  };

  const handleAction = (actionType, itemName) => {
    let targetId;
    let action;

    if (actionType === "SHOOT" || actionType === "SHOOT_SELF") {
      if (actionType === "SHOOT") {
        targetId = getOtherPlayerId(clientID);
      } else {
        targetId = clientID;
      }

      actionType = "SHOOT";
      action = {
        type: actionType,
        target_player_id: targetId,
      };
    } else {
      action = {
        type: actionType,
        item_type: itemName,
      };
    }

    const message = {
      type: "PLAYER_ACTION",
      player_id: clientID,
      game_id: gameID,
      action: action,
    };
    sendToServer(message);
  };

  return (
    <div className="container">
      <div className="game_board">
        {showGif && (
          <div
            className="gif-overlay"
            style={{
              backgroundImage: `url(${getGifUrlWithTimestamp(gifUrl)})`,
            }}
          ></div>
        )}
        <div className="players-info-container">
          {Object.keys(gameState.players).map((playerId) => (
            <div className="player-info" key={playerId}>
              <div className="name-and-items">
                <p className="name-text">{gameState.players[playerId].name}</p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  {gameState.players[playerId].items.map((item, index) => (
                    <img
                      key={index}
                      src={assets[item.name]}
                      alt={item.name}
                      className="item-icon"
                    />
                  ))}
                </div>
              </div>
              <div className="lifes">
                {Array(gameState.players[playerId].lives)
                  .fill()
                  .map((_, index) => (
                    <img
                      key={index}
                      src={assets.Vida}
                      alt="Ícone de Vida"
                      className="icons"
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        {gameState.status !== "ENDED" && (
          <>
            <RoundInfosComponent roundWarning={roundWarning} />
            <PlayerShootingActions
              gameState={gameState}
              clientID={clientID}
              handleAction={handleAction}
            />
            {gameState.players[clientID].items.length > 0 && (
              <PlayerItemsComponent
                gameState={gameState}
                clientID={clientID}
                handleAction={handleAction}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default GameScreen;
