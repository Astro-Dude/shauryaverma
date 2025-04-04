import React from "react";
import Header from "./Header";
import Hero from "./Hero";

function Recruiter() {
  const handleResumeClick = () => {
    console.log("Resume button clicked");
  };

  const handleMoreInfoClick = () => {
    console.log("More Info button clicked");
  };

  return (
    <div className="relative w-full h-screen">
      <Header />
      <Hero
        backgroundImage="https://picsum.photos/1280/720"
        heading="Hiring? Let's Make It Easy!"
        description="You're looking for top talent, and—surprise—it's me. Check out my projects, skills, and why I'm the perfect fit."
        primaryButtonText="Download Resume"
        secondaryButtonText="LinkedIn"
        onPrimaryButtonClick={handleResumeClick}
        onSecondaryButtonClick={handleMoreInfoClick}
      />
    </div>
  );
}

export default Recruiter;