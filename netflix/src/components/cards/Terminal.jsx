import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaHome, FaTerminal, FaArrowLeft } from "react-icons/fa";
import macbook from "../../assets/images/macbook.png";
import { div } from "framer-motion/client";

const TerminalFun = () => {
  const navigate = useNavigate();
  const [terminalOutput, setTerminalOutput] = useState([
    <div key="welcome-1" className="mb-1 text-blue-300 font-bold">
      Welcome to the Interactive Terminal!
    </div>,
    <div key="welcome-2" className="mb-2 text-green-300">
      Type <span className="text-yellow-300 font-semibold">"help"</span> to see
      available commands.
    </div>,
    <div> </div>,
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [gameState, setGameState] = useState(null);
  const terminalRef = useRef(null);

  // Snake game state
  const [snake, setSnake] = useState([]);
  const [food, setFood] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState("right");
  const [score, setScore] = useState(0);
  const gameOverRef = useRef(false);
  const gameLoopRef = useRef(null);

  const GRID_SIZE = 20;
  const CELL_SIZE = 1;
  const GAME_SPEED = 150; // milliseconds

  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkScreen = () => {
      const current = window.innerWidth >= 1024;
      setIsLargeScreen(current);
      if (
        !hasReloaded.current &&
        current !== (window.__wasLargeScreen ?? current)
      ) {
        hasReloaded.current = true;
        window.__wasLargeScreen = current;
        window.location.reload();
      }
      window.__wasLargeScreen = current;
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const initializeSnake = () => {
    return [
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
    ];
  };

  const generateFood = () => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
        y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
      };
    } while (
      snake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      )
    );
    return newFood;
  };

  const startSnakeGame = () => {
    const initialSnake = initializeSnake();
    setSnake(initialSnake);
    setFood(generateFood());
    setDirection("right");
    setScore(0);
    gameOverRef.current = false;
    setGameState("snake");
    setTerminalOutput([
      <div key="snake-1" className="mb-1 text-green-300 font-bold">
        Snake Game Started!
      </div>,
      <div key="snake-2" className="mb-2 text-blue-300">
        Use <span className="text-yellow-300 font-semibold">arrow keys</span> to
        move. Press <span className="text-red-400 font-semibold">Q</span> to
        quit.
      </div>,
    ]);
  };

  const endSnakeGame = () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;

    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    setGameState(null);
    setTerminalOutput((prev) => [
      ...prev,
      <div key={`gameover-${Date.now()}`} className="text-red-400 font-bold">
        Game Over! Final Score: {score}
      </div>,
    ]);
  };

  const moveSnake = () => {
    if (gameOverRef.current) return;

    setSnake((prevSnake) => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case "up":
          head.y -= 1;
          break;
        case "down":
          head.y += 1;
          break;
        case "left":
          head.x -= 1;
          break;
        case "right":
          head.x += 1;
          break;
      }

      // Check for collisions with walls
      if (
        head.x <= 0 ||
        head.x >= GRID_SIZE - 1 ||
        head.y <= 0 ||
        head.y >= GRID_SIZE - 1
      ) {
        endSnakeGame();
        return prevSnake;
      }

      // Check for collisions with self
      if (
        newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
      ) {
        endSnakeGame();
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check for food
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => prev + 10);
        setFood(generateFood());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  };

  const renderGame = () => {
    const grid = Array(GRID_SIZE)
      .fill()
      .map(() => Array(GRID_SIZE).fill(" "));

    // Draw borders
    for (let i = 0; i < GRID_SIZE; i++) {
      grid[0][i] = "─";
      grid[GRID_SIZE - 1][i] = "─";
      grid[i][0] = "│";
      grid[i][GRID_SIZE - 1] = "│";
    }
    grid[0][0] = "┌";
    grid[0][GRID_SIZE - 1] = "┐";
    grid[GRID_SIZE - 1][0] = "└";
    grid[GRID_SIZE - 1][GRID_SIZE - 1] = "┘";

    // Place snake
    snake.forEach((segment, index) => {
      grid[segment.y][segment.x] = index === 0 ? "O" : "o";
    });

    // Place food
    grid[food.y][food.x] = "*";

    return grid.map((row, y) => row.map((cell, x) => cell).join("")).join("\n");
  };

  useEffect(() => {
    if (gameState === "snake" && !gameOverRef.current) {
      gameLoopRef.current = setInterval(moveSnake, GAME_SPEED);
      return () => clearInterval(gameLoopRef.current);
    }
  }, [gameState, gameOverRef.current, direction]);

  const handleKeyDown = (e) => {
    if (gameState === "snake") {
      switch (e.key) {
        case "ArrowUp":
          if (direction !== "down") {
            e.preventDefault();
            setDirection("up");
          }
          break;
        case "ArrowDown":
          if (direction !== "up") {
            e.preventDefault();
            setDirection("down");
          }
          break;
        case "ArrowLeft":
          if (direction !== "right") {
            e.preventDefault();
            setDirection("left");
          }
          break;
        case "ArrowRight":
          if (direction !== "left") {
            e.preventDefault();
            setDirection("right");
          }
          break;
        case "q":
          e.preventDefault();
          endSnakeGame();
          break;
      }
    } else {
      if (e.key === "Enter") {
        if (input.trim()) {
          handleCommand(input);
          setInput("");
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (
          commandHistory.length > 0 &&
          historyIndex < commandHistory.length - 1
        ) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput("");
        }
      }
    }
  };

  const commands = {
    help: () => [
      <div> </div>,
      <div key="help-header" className="mb-2 font-bold text-blue-300">
        Available commands:
      </div>,
      <div key="help-help" className="text-green-300">
        <span className="text-yellow-300">help</span> - Show this help message
      </div>,
      <div key="help-clear" className="text-green-300">
        <span className="text-yellow-300">clear</span> - Clear the terminal
      </div>,
      <div key="help-about" className="text-green-300">
        <span className="text-yellow-300">about</span> - Learn about this
        portfolio
      </div>,
      <div key="help-resume" className="text-green-300">
        <span className="text-yellow-300">resume</span> - View my resume
      </div>,
      <div key="help-projects" className="text-green-300">
        <span className="text-yellow-300">projects</span> - List my projects
      </div>,
      <div key="help-skills" className="text-green-300">
        <span className="text-yellow-300">skills</span> - Show my technical
        skills
      </div>,
      <div key="help-contact" className="text-green-300">
        <span className="text-yellow-300">contact</span> - Get my contact
        information
      </div>,
      <div key="help-snake" className="text-green-300">
        <span className="text-yellow-300">snake</span> - Play the snake game
      </div>,
      <div key="help-exit" className="text-green-300 mb-2">
        <span className="text-yellow-300">exit</span> - Return to the main page
      </div>,
      <div> </div>,
    ],
    clear: () => {
      setTerminalOutput([
        <div key="welcome-1" className="mb-1 text-blue-300 font-bold">
          Welcome to the Interactive Terminal!
        </div>,
        <div key="welcome-2" className="mb-2 text-green-300">
          Type <span className="text-yellow-300 font-semibold">"help"</span> to
          see available commands.
        </div>,
        <div> </div>,
      ]);
      return [];
    },
    about: () => [
      <div> </div>,
      <div key="about-1" className="mb-2 text-blue-300">
        Hi, I'm <span className="font-bold text-white">Shaurya Verma</span> — a
        student at{" "}
        <span className="font-semibold text-green-300">
          Scaler School of Technology
        </span>{" "}
        in Bangalore, and someone who’s constantly exploring how technology can
        solve real-world problems. I go by the name{" "}
        <strong className="text-yellow-300">AstroDude</strong> online, a
        reminder of my curiosity and love for understanding how things work,
        whether it's in code or the universe.
      </div>,
      <div key="about-2" className="mb-2 text-green-200">
        My interests lie in building tools and systems that are both practical
        and impactful. At{" "}
        <span className="font-semibold text-green-300">Scaler</span>, I’ve been
        learning by doing — writing code, building projects, and taking part in
        initiatives like{" "}
        <span className="font-semibold text-blue-400">Vector</span>, where we
        help students prepare for new-age entrance exams like{" "}
        <span className="font-semibold text-yellow-300">NSET</span> with the
        right support and resources.
      </div>,
      <div key="about-3" className="mb-2 text-purple-200">
        Outside of academics, I spend a lot of time reflecting on how to make
        learning more accessible and efficient, especially for students who
        don’t always have clear guidance. I enjoy{" "}
        <span className="font-semibold text-pink-300">deep work</span>, solving
        tough problems, and collaborating with people who are passionate about
        what they do.
      </div>,
      <div key="about-4" className="text-gray-300">
        This portfolio is a window into the things I’m{" "}
        <span className="font-semibold text-blue-400">building</span> and{" "}
        <span className="font-semibold text-green-300">learning</span> along the
        way.
      </div>,
      <div> </div>,
    ],
    resume: () => [
      <div> </div>,
      <div key="resume-header" className="mb-2 font-bold text-blue-300">
        My Resume:
      </div>,
      <div key="resume-link" className="mb-1">
        Click on the link to view or download my resume:
        <a
          href="https://drive.google.com/file/d/12AXRfYhws0B2wWI7w4pokBwlrUl3jFgc/view"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline ml-2"
        >
          View Resume
        </a>
        <div> </div>
      </div>,
    ],
    projects: () => [
      <div> </div>,
      <div key="projects-header" className="mb-2 font-bold text-white">
        Projects:
      </div>,

      <div key="vector-title" className="mb-1">
        <span className="font-semibold text-blue-400">Vector</span>
        <span className="text-gray-400">
          {" "}
          — Tech Stack: React.js, Tailwind CSS, Firebase, Razorpay
        </span>
      </div>,
      <div key="vector-links" className="mb-1">
        Link:{" "}
        <a
          href="https://vector-nine.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Live Project
        </a>{" "}
        | GitHub:{" "}
        <a
          href="https://github.com/Astro-Dude/vector"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Repository
        </a>
      </div>,
      <ul
        key="vector-features"
        className="list-disc list-inside mb-2 text-green-300"
      >
        <li>Mock interview sessions and personalized mentorship features</li>
        <li>
          A computer-based test (CBT) system with timers, question navigation,
          and automated scoring
        </li>
        <li>A fully responsive UI optimized for speed and accessibility</li>
        <li>
          Firebase authentication and Razorpay integration for secure test
          booking and payments
        </li>
      </ul>,

      <div key="waves-title" className="mb-1 mt-4">
        <span className="font-semibold text-blue-400">Waves (In Progress)</span>
        <span className="text-gray-400">
          {" "}
          — Tech Stack: React (Vite), Tailwind CSS, Node.js, Express, Socket.IO,
          MongoDB, JWT
        </span>
      </div>,
      <div key="waves-links" className="mb-1">
        Link:{" "}
        <a
          href="https://waves-c53a.onrender.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Live Project
        </a>{" "}
        | GitHub:{" "}
        <a
          href="https://github.com/wavey-waves/waves"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Repository
        </a>
      </div>,
      <ul
        key="waves-features"
        className="list-disc list-inside mb-2 text-green-300"
      >
        <li>
          Modern real-time chat application supporting global and local
          (network-based) chat rooms
        </li>
        <li>
          Global chatroom with real-time messaging and presence indicators
        </li>
        <li>Network-based chatrooms assigned automatically by IP subnet</li>
        <li>
          Secure user authentication with JWT, supporting both anonymous and
          registered users
        </li>
        <li>
          Dark-themed, responsive UI with typing indicators, timestamps,
          rate-limiting, and message validations
        </li>
        <li>
          Upcoming: Peer-to-peer (P2P) communication for offline chatting within
          the same network
        </li>
      </ul>,
      <div> </div>,
    ],
    skills: () => [
      <div> </div>,
      <div key="skills-header" className="mb-2 font-bold text-blue-300">
        Technical Skills:
      </div>,
      <div key="skills-languages" className="mb-1">
        <strong className="text-yellow-300">Languages:</strong>{" "}
        <span className="text-white">
          Python, C++, Java, SQL, HTML/CSS, JavaScript, Go
        </span>
      </div>,
      <div key="skills-tech" className="mb-1">
        <strong className="text-green-300">Technologies & Frameworks:</strong>{" "}
        <span className="text-white">
          React, Tailwind CSS, Tkinter, CustomTkinter, Pandas, NumPy, Seaborn,
          Firebase, MySQL, MongoDB
        </span>
      </div>,
      <div key="skills-tools" className="mb-1">
        <strong className="text-pink-300">Tools & Platforms:</strong>{" "}
        <span className="text-white">Git, GitHub, Linux</span>
      </div>,
      <div> </div>,
    ],
    contact: () => [
      <div> </div>,
      <div key="contact-header" className="mb-2 font-bold text-blue-300">
        Contact Information:
      </div>,
      <div key="contact-email" className="mb-1">
        <span className="text-pink-300 font-semibold">Email:</span>{" "}
        <a
          href="mailto:sagittariusshaurya5@email.com"
          className="text-blue-400 underline"
        >
          sagittariusshaurya5@email.com
        </a>
      </div>,
      <div key="contact-linkedin" className="mb-1">
        <span className="text-green-300 font-semibold">LinkedIn:</span>{" "}
        <a
          href="https://www.linkedin.com/in/astro-dude"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          www.linkedin.com/in/astro-dude
        </a>
      </div>,
      <div key="contact-github" className="mb-1">
        <span className="text-yellow-300 font-semibold">GitHub:</span>{" "}
        <a
          href="https://github.com/Astro-Dude"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          https://github.com/Astro-Dude
        </a>
      </div>,
      <div key="contact-github" className="mb-1">
        <span className="text-fuchsia-400 font-semibold">Instagram:</span>{" "}
        <a
          href="https://www.instagram.com/_shauryanium.perfrauleinide_/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          https://github.com/Astro-Dude
        </a>
      </div>,
      <div> </div>,
    ],
    snake: () => {
      startSnakeGame();
      return [];
    },
  };

  const handleCommand = (cmd) => {
    const command = cmd.toLowerCase().trim();
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    if (command === "exit") {
      navigate("/lost-kid");
      return;
    }

    if (commands[command]) {
      setTerminalOutput((prev) => [
        ...prev,
        `> ${command}`,
        ...commands[command](),
      ]);
    } else {
      setTerminalOutput((prev) => [
        ...prev,
        `> ${command}`,
        'Command not found. Type "help" for available commands.',
      ]);
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handleAppClick = (app) => {
    switch (app) {
      case "home":
        navigate("/");
        break;
      case "terminal":
        // Already in terminal
        break;
      case "back":
        navigate("/lost-kid");
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1d1d1f]">
      {typeof window !== "undefined" && !isLargeScreen ? (
        <div className="flex items-center justify-center min-h-screen bg-black text-white text-center px-4">
          <div>
            <div className="text-2xl font-bold mb-4">Terminal Unavailable</div>
            <div className="text-lg">
              This interactive terminal is only available on larger screens
              (laptop/desktop).
              <br />
              Please use a device with a wider display to access this feature.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${macbook})` }}
          >
            <div className="absolute inset-0 bg-black/50" />
          </div>

          {/* Dock */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full">
            <motion.div
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer"
              onClick={() => handleAppClick("home")}
            >
              <FaHome className="text-white text-xl" />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center cursor-pointer"
              onClick={() => handleAppClick("terminal")}
            >
              <FaTerminal className="text-white text-xl" />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer"
              onClick={() => handleAppClick("back")}
            >
              <FaArrowLeft className="text-white text-xl" />
            </motion.div>
          </div>

          {/* Terminal Window */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#1d1d1f] rounded-lg shadow-2xl overflow-hidden border border-gray-700/50"
            style={{
              boxShadow:
                "0 0 30px rgba(16, 185, 129, 0.2), 0 0 60px rgba(16, 185, 129, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Terminal Header */}
            <div className="h-6 bg-[#2d2d2f] flex items-center px-4 text-xs text-gray-400 border-b border-gray-700/50">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-2 text-gray-400">shaurya@portfolio:~$</div>
            </div>

            {/* Terminal Content */}
            <div
              ref={terminalRef}
              className="h-[calc(100%-24px)] bg-black/90 p-4 overflow-y-auto font-mono terminal-scrollbar"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,0.85))",
              }}
            >
              <div className="w-full text-left overflow-x-hidden break-words">
                {terminalOutput.map((line, index) => (
                  <div
                    key={index}
                    className={`mb-1 whitespace-pre-wrap break-words text-left ${
                      typeof line === "string" &&
                      line.includes("Command not found")
                        ? "text-red-500"
                        : "text-green-400"
                    }`}
                  >
                    {line}
                  </div>
                ))}
                {gameState === "snake" && (
                  <div className="text-green-400 whitespace-pre font-mono">
                    <div className="mb-2 text-red-400 font-semibold">
                      Press Q to quit
                    </div>
                    <div className="mb-2 text-yellow-300 font-semibold">
                      Score: {score}
                    </div>
                    <div className="bg-black/20 p-2 rounded inline-block leading-[0.8] tracking-[0.2em]">
                      {renderGame()}
                    </div>
                  </div>
                )}
                <div className="flex items-start text-left">
                  <div className="text-green-400 flex items-center">
                    <span className="mr-2">$</span>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="bg-transparent text-green-400 outline-none flex-1 text-left"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <style jsx>{`
            .terminal-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .terminal-scrollbar::-webkit-scrollbar-track {
              background: rgba(26, 26, 26, 0.5);
            }
            .terminal-scrollbar::-webkit-scrollbar-thumb {
              background: #10b981;
              border-radius: 2px;
            }
            .terminal-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #059669;
            }
            .terminal-scrollbar::-webkit-scrollbar-corner {
              background: rgba(26, 26, 26, 0.5);
            }
            .terminal-window {
              position: relative;
            }
            .terminal-window::before {
              content: "";
              position: absolute;
              inset: -1px;
              background: linear-gradient(45deg, #10b981, transparent);
              border-radius: 8px;
              z-index: -1;
              opacity: 0.2;
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default TerminalFun;
