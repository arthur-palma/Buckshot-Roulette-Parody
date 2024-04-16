import React from "react";

const PlayerItemsComponent = ({ gameState, clientID, handleAction }) => (
  <div className="items-container">
    {gameState.players[clientID].items.map((item, index) => (
      <>
        <button
          key={index}
          onClick={() => handleAction("USE_ITEM", item.name)}
          disabled={
            gameState.player_turn !== clientID || gameState.status === "ENDED"
          }
          className={`item-button item-${item.name}`}
          data-description={item.description}
        ></button>
      </>
    ))}
  </div>
);

export default PlayerItemsComponent;
