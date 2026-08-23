import "../App.css";

import React from "react";
import { FaPlay, FaInfoCircle } from "react-icons/fa";

function Hero({
  backgroundImage,
  heading,
  description,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryButtonClick,
  onSecondaryButtonClick,
  primaryButtonIcon = FaPlay,
  secondaryButtonIcon = FaInfoCircle,
}) {
  const PrimaryIcon = primaryButtonIcon;
  const SecondaryIcon = secondaryButtonIcon;

  return (
    <div className="relative w-screen overflow-x-hidden overflow-y-hidden aspect-[16/9]">
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 100%)",
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-center items-start px-4 md:px-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-red-500 text-left">
          {heading}
        </h1>
        <p className="text-xs sm:text-sm md:text-base mb-4 text-gray-300 text-left">
          {description}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onPrimaryButtonClick}
            className="bg-white text-black px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 flex items-center gap-2 rounded hover:bg-white/60 transition"
          >
            <PrimaryIcon />
            <span className="text-xs sm:text-sm md:text-base font-bold text-black">
              {primaryButtonText}
            </span>
          </button>
          <button
            onClick={onSecondaryButtonClick}
            className="bg-black/50 text-white px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 flex items-center gap-2 rounded hover:bg-black/20 transition-all duration-100"
          >
            <SecondaryIcon />
            <span className="text-xs sm:text-sm md:text-base font-bold text-white">
              {secondaryButtonText}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Hero;