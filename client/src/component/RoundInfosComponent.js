import React from "react";
import * as assets from "../assets/assets";

const renderBullets = (quantity, icon) => {
  const bullets = [];
  for (let i = 0; i < quantity; i++) {
    bullets.push(
      <img key={i} className="warning-icons" src={icon} alt="bullet" />
    );
  }
  return bullets;
};

const RoundInfosComponent = ({ roundWarning }) => (
  <div className="round-warning-container">
    <p className="round-info-label">Round {roundWarning?.round_number}</p>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "0px 5%",
        alignItems: "center",
      }}
    >
      <p
        style={{
          display: "flex",
        }}
      >
        {renderBullets(roundWarning?.charged_bullets, assets.Charged)}
      </p>
      <p
        style={{
          display: "flex",
        }}
      >
        {renderBullets(roundWarning?.discharged_bullets, assets.Discharged)}
      </p>
    </div>
  </div>
);

export default RoundInfosComponent;
