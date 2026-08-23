import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

// Import images for the different user types
import blue from "../assets/images/blue.png";
import red from "../assets/images/red.png";
import green from "../assets/images/green.png";
import yellow from "../assets/images/yellow.png";

function LandingPage() {
  // State to manage the sizes of the images and text
  const [sizes, setSizes] = useState({ imageSize: 140, textSize: 22 });
  const navigate = useNavigate(); 

  useEffect(() => {
    // Function to update sizes based on window width
    const updateSizes = () => {
      const width = window.innerWidth;

      const imageSize = Math.max(120, Math.min(200, width / 10));
      const textSize = Math.max(18, Math.min(35, width / 57));

      setSizes({ imageSize, textSize });
    };

    updateSizes();

    window.addEventListener("resize", updateSizes);

    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  // Function to handle user selection and navigate to the respective page
  const handleUserSelection = (userType, path) => {
    localStorage.setItem("selectedUser", userType); 
    navigate(path);
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <h1
        style={{ fontSize: `${sizes.textSize * 2}px` }}
        className="text-white"
      >
        Who's watching?
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-10">
        <div
          className="flex flex-col items-center group cursor-pointer"
          onClick={() => handleUserSelection("Recruiter", "/recruiter")}
        >
          <img
            src={blue}
            alt="Blue"
            style={{ width: `${sizes.imageSize}px` }}
            className="object-contain border-4 border-transparent group-hover:border-gray-300 transition-all rounded-lg"
          />
          <p
            style={{ fontSize: `${sizes.textSize * 0.7}px` }}
            className="text-gray-500 group-hover:text-white transition-all"
          >
            Recruiter
          </p>
        </div>
        <div
          className="flex flex-col items-center group cursor-pointer"
          onClick={() => handleUserSelection("Lost Kid", "/lost-kid")}
        >
          <img
            src={red}
            alt="Red"
            style={{ width: `${sizes.imageSize}px` }}
            className="object-contain border-4 border-transparent group-hover:border-gray-300 transition-all rounded-lg"
          />
          <p
            style={{ fontSize: `${sizes.textSize * 0.7}px` }}
            className="text-gray-500 group-hover:text-white transition-all"
          >
            Lost Kid
          </p>
        </div>
        <div
          className="flex flex-col items-center group cursor-pointer"
          onClick={() => handleUserSelection("Stalker", "/stalker")}
        >
          <img
            src={yellow}
            alt="Yellow"
            style={{ width: `${sizes.imageSize}px` }}
            className="object-contain border-4 border-transparent group-hover:border-gray-300 transition-all rounded-lg"
          />
          <p
            style={{ fontSize: `${sizes.textSize * 0.7}px` }}
            className="text-gray-500 group-hover:text-white transition-all"
          >
            Stalker
          </p>
        </div>
        <div
          className="flex flex-col items-center group cursor-pointer"
          onClick={() => handleUserSelection("Investor", "/investor")}
        >
          <img
            src={green}
            alt="Green"
            style={{ width: `${sizes.imageSize}px` }}
            className="object-contain border-4 border-transparent group-hover:border-gray-300 transition-all rounded-lg"
          />
          <p
            style={{ fontSize: `${sizes.textSize * 0.7}px` }}
            className="text-gray-500 group-hover:text-white transition-all"
          >
            Investor
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
