import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import nameLogo from "../assets/images/nameLogo.png";
import blue from "../assets/images/blue.png";
import red from "../assets/images/red.png";
import yellow from "../assets/images/yellow.png";
import green from "../assets/images/green.png";

function Header() {
  const [userAvatar, setUserAvatar] = useState(blue);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const selectedUser = localStorage.getItem("selectedUser");

    // Set the avatar based on the user type
    if (selectedUser === "Recruiter") {
      setUserAvatar(blue);
    } else if (selectedUser === "Lost Kid") {
      setUserAvatar(red);
    } else if (selectedUser === "Stalker") {
      setUserAvatar(yellow);
    } else if (selectedUser === "Investor") {
      setUserAvatar(green);
    } else {
      setUserAvatar(blue); 
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAvatarClick = () => {
    navigate("/");
  };

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[rgb(20,20,20)]' : 'bg-gradient-to-b from-black to-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-16 py-3 sm:py-4">
        <div className="flex items-center">
          <img 
            src={nameLogo} 
            alt="Shaurya Verma" 
            className="h-6 sm:h-8 md:h-10 transition-all duration-300" 
          />
        </div>

        <nav className="hidden md:flex space-x-6"></nav>

        <div className="flex items-center space-x-4">
          <img
            src={userAvatar}
            alt="User Avatar"
            className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg cursor-pointer hover:opacity-80 transition-all duration-300"
            onClick={handleAvatarClick}
          />
        </div>
      </div>
    </header>
  );
}

export default Header;
