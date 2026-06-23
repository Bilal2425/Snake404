/**
 * Snake 404 - Main Controller & View Binder
 */
import './style.css'; // Vite stylesheet injection
import { SnakeGame, PACKET_TYPES } from './game.js';
import { Renderer } from './renderer.js';
import { audio } from './audio.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const startOverlay = document.getElementById('overlay-start');
const gameOverOverlay = document.getElementById('overlay-gameover');
const bsodOverlay = document.getElementById('overlay-bsod');
const screenGlitchWrapper = document.getElementById('screen-glitch-wrapper');
const deployOverlay = document.getElementById('overlay-deploy');
const deployProgressBar = document.getElementById('deploy-progress-bar');
const deployLogStdout = document.getElementById('deploy-log-stdout');
const progressFill = document.getElementById('level-progress-fill');
const progressContainer = document.getElementById('level-progress-container');

const startBtn = document.getElementById('start-game-btn');
const restartBtn = document.getElementById('restart-game-btn');
const navRefreshBtn = document.getElementById('nav-refresh-btn');
const addressInput = document.getElementById('browser-address-input');

const scoreVal = document.getElementById('final-score');
const lengthVal = document.getElementById('final-length');
const pingText = document.getElementById('ping-text');

// DevTools Tabs & Panels
const devTabBtns = document.querySelectorAll('.dev-tab-btn');
const devPanels = document.querySelectorAll('.dev-panel');
const consoleLogsList = document.getElementById('console-logs-list');
const consoleInput = document.getElementById('console-cmd-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');
const networkRequestsList = document.getElementById('network-requests-list');

// DevTools Performance Stats
const perfFps = document.getElementById('perf-fps');
const perfFpsBar = document.getElementById('perf-fps-bar');
const perfSpeed = document.getElementById('perf-speed');
const perfMultiplier = document.getElementById('perf-multiplier');
const perfPackets = document.getElementById('perf-packets');
const perfMemory = document.getElementById('perf-memory');

// Bezel LEDs
const driveLed = document.getElementById('drive-led');

// About tab & modal
const tabAbout = document.getElementById('tab-about');
const tabGame = document.getElementById('tab-game');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about-btn');

// Controllers
const game = new SnakeGame(30, 20);
const renderer = new Renderer(canvas);

let gameLoopTimeout = null;

// FPS calculation variables
let lastFrameTime = performance.now();
let frameCount = 0;
let currentFps = 60;

/**
 * Setup and bind UI events
 */
function init() {
  setupEventListeners();
  setupGameCallbacks();
  
  // Sync the locks and server bookmark states
  syncBookmarkUI();
  
  // Draw initial canvas frame (background animation)
  renderBackgroundOnly();
  
  // Calculate real FPS
  calculateFpsLoop();
  
  // Log setup info
  addConsoleLog("System initialization complete.", "log-system");
  addConsoleLog("DevTools listening on local port 3000.", "log-system");
  addConsoleLog("Type /help for dev command listings.", "log-system");
}

/**
 * Continuous animation loop for screen background when not playing
 */
function renderBackgroundOnly() {
  if (game.gameState === 'menu' || game.gameState === 'gameover') {
    renderer.clear();
    renderer.drawBackgroundCode();
    renderer.drawGridDots();
    renderer.drawAndUpdateParticles();
    requestAnimationFrame(renderBackgroundOnly);
  }
}

/**
 * Real FPS calculator loop
 */
function calculateFpsLoop() {
  const now = performance.now();
  frameCount++;
  if (now > lastFrameTime + 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFrameTime));
    frameCount = 0;
    lastFrameTime = now;
  }
  requestAnimationFrame(calculateFpsLoop);
}

/**
 * Configure DOM event listeners
 */
function setupEventListeners() {
  // Game state button clicks
  startBtn.addEventListener('click', () => {
    audio.init();
    audio.playBoot();
    game.start();
  });

  restartBtn.addEventListener('click', () => {
    audio.playBoot();
    game.start();
  });

  navRefreshBtn.addEventListener('click', () => {
    audio.playBoot();
    if (game.gameState === 'playing' || game.gameState === 'gameover') {
      addConsoleLog("Connection reset requested by client...", "log-system");
      game.start();
    }
  });

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (game.gameState !== 'playing') return;

    // Prevent scrolling with arrows/space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        game.setDirection('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        game.setDirection('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        game.setDirection('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        game.setDirection('right');
        break;
    }
  });

  // DevTools tab switches
  devTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick();
      devTabBtns.forEach(b => b.classList.remove('active'));
      devPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.getElementById(target).classList.add('active');
    });
  });

  // DevTools Console inputs
  consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = consoleInput.value;
      if (val.trim() === '') return;
      
      addConsoleLog(`> ${val}`, "log-system");
      
      if (val.trim().toLowerCase() === '/clear') {
        consoleLogsList.innerHTML = '';
      } else {
        game.executeConsoleCommand(val);
      }
      
      consoleInput.value = '';
    }
  });

  clearConsoleBtn.addEventListener('click', () => {
    audio.playClick();
    consoleLogsList.innerHTML = '';
  });

  // About Tab Modal events
  tabAbout.addEventListener('click', () => {
    audio.playClick();
    aboutModal.classList.remove('hidden');
  });

  closeAboutBtn.addEventListener('click', () => {
    audio.playClick();
    aboutModal.classList.add('hidden');
  });

  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.add('hidden');
    }
  });

  // Bookmark button clicks (Server environment switching)
  const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
  bookmarkBtns.forEach(btn => {
    // Enable clicks for locked feedback
    btn.removeAttribute('disabled');
    
    btn.addEventListener('click', () => {
      audio.init(); // Ensure audio is initialized on click before playing
      
      if (btn.classList.contains('locked')) {
        audio.play403();
        addConsoleLog(`[ACCESS DENIED] Build uncompiled. Complete previous server environment first.`, "log-403");
        return;
      }
      
      audio.playClick();
      bookmarkBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const levelId = btn.id.split('-')[1]; // localhost, staging, production
      game.currentLevel = levelId;
      addConsoleLog(`[SYSTEM] Client redirecting to environment: ${levelId.toUpperCase()}`, "log-system");
      
      // Auto-restart game with new level settings
      game.start();
    });
  });
}

/**
 * Configure game state callbacks from the engine
 */
function setupGameCallbacks() {
  game.onLog = (msg, type) => {
    addConsoleLog(msg, type);
  };

  game.onShieldBreak = () => {
    audio.playShieldBreak();
  };

  game.onHackerDefeated = (x, y) => {
    renderer.spawnExplosion(x, y, '#d500f9');
    audio.playHackerDeauth();
  };

  game.onNetworkRequest = (status, name, type, size, latency) => {
    addNetworkRow(status, name, type, size, latency);
    
    // Flash Drive LED to simulate activity
    driveLed.classList.add('active');
    setTimeout(() => driveLed.classList.remove('active'), 150);
    
    // Trigger relative audio
    if (status === 200) audio.play200();
    else if (status === 404) audio.play404();
    else if (status === 301) audio.play301();
    else if (status === 500) audio.play500();
    else if (status === "GZIP") audio.playGzip();
    else if (status === "HTTPS") audio.playHttps();
    else if (status === "CACHE") audio.playCache();
  };

  game.onStateChange = (state) => {
    updateAddressBar(state);
    
    // Hide all overlays initially
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    bsodOverlay.classList.add('hidden');
    deployOverlay.classList.add('hidden');

    if (state === 'menu') {
      startOverlay.classList.remove('hidden');
      renderBackgroundOnly();
    } else if (state === 'playing') {
      // Clear game over trails
      renderer.clear();
      // Start loops
      startGameLoop();
    } else if (state === 'gameover') {
      audio.playGameOver();
      scoreVal.textContent = game.score;
      lengthVal.textContent = game.snake.length;
      gameOverOverlay.classList.remove('hidden');
      renderBackgroundOnly();
    } else if (state === 'bsod') {
      audio.play500();
      triggerBsodCrashSequence();
    } else if (state === 'deploying') {
      audio.playDeploy();
      deployOverlay.classList.remove('hidden');
      
      let progress = 0;
      deployProgressBar.style.width = '0%';
      
      const logs = [
        "> Initiating build optimization...",
        "> Compiling JS assets...",
        "> Compiling style.css stylesheets...",
        "> Bundling package files...",
        "> Uploading compiled assets to repository...",
        "> Re-routing DNS to next environment...",
        "> Deployment successful! Redirecting..."
      ];
      
      deployLogStdout.textContent = logs[0];
      
      const interval = setInterval(() => {
        progress += 4;
        deployProgressBar.style.width = `${progress}%`;
        
        const logIndex = Math.min(logs.length - 1, Math.floor((progress / 100) * logs.length));
        deployLogStdout.textContent = logs[logIndex];
        
        if (progress >= 100) {
          clearInterval(interval);
          
          setTimeout(() => {
            let nextLevel = 'staging';
            if (game.currentLevel === 'localhost') {
              nextLevel = 'staging';
            } else if (game.currentLevel === 'staging') {
              nextLevel = 'production';
            }
            
            // Unlock next level
            if (!game.unlockedLevels.includes(nextLevel)) {
              game.unlockedLevels.push(nextLevel);
              addConsoleLog(`[UNLOCKED] Server environment [${nextLevel.toUpperCase()}] compiled and unlocked!`, "log-level");
            }
            
            // Switch environment and restart game
            game.currentLevel = nextLevel;
            
            // Sync UI (bookmark styling now shows the new level as active)
            syncBookmarkUI();
            
            deployOverlay.classList.add('hidden');
            game.start();
          }, 600);
        }
      }, 100);
    }
  };

  game.onScoreUpdate = (score, length) => {
    // Add particle explosion relative to head position
    if (game.snake.length > 0) {
      const head = game.snake[0];
      const color = game.glitchActive ? '#ff0055' : '#2ea043';
      renderer.spawnExplosion(head.x, head.y, color);
    }
  };
}

/**
 * Start the set-timeout game tick recursion loop
 */
function startGameLoop() {
  if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
  
  function tick() {
    if (game.gameState !== 'playing') return;

    // Apply screen shake styling during glitch state
    if (game.glitchActive) {
      screenGlitchWrapper.classList.add('glitched-screen-shake');
    } else {
      screenGlitchWrapper.classList.remove('glitched-screen-shake');
    }

    game.tick();
    renderer.draw(game);
    updatePerformanceDisplay();

    // Recurse based on current game speed (slowing down if Cache-Control active)
    const tickSpeed = game.slowMoActive ? Math.round(game.currentSpeed * 1.7) : game.currentSpeed;
    gameLoopTimeout = setTimeout(tick, tickSpeed);
  }

  tick();
}

/**
 * Run simulated BSOD recovery loading bar sequence
 */
function triggerBsodCrashSequence() {
  bsodOverlay.classList.remove('hidden');
  const bar = document.getElementById('bsod-progress-bar');
  bar.style.width = '0%';
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      // BSOD Complete: recover server
      setTimeout(() => {
        // Recover state: shrink snake
        const shrinkAmount = 3;
        const minLength = 3;
        if (game.snake.length > minLength) {
          game.snake = game.snake.slice(0, Math.max(minLength, game.snake.length - shrinkAmount));
        }
        
        // Reset speed to normal
        game.currentSpeed = game.baseSpeed;
        
        // Return to play
        game.setGameState('playing');
        game.log("[OK] BSOD recovery complete. Network buffers defragmented. Restoring feed...", "log-200");
      }, 400);
    }
    bar.style.width = `${progress}%`;
  }, 120);
}

/**
 * Appends a log item to the simulated DevTools Console
 */
function addConsoleLog(msg, type = "log-system") {
  const item = document.createElement('div');
  item.className = `console-log-item ${type}`;
  
  // Prep timestamp
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, fractionSecDigits: 2 }).split(' ')[0];
  item.textContent = `[${time}] ${msg}`;
  
  consoleLogsList.appendChild(item);
  consoleLogsList.scrollTop = consoleLogsList.scrollHeight;

  // Truncate old logs
  while (consoleLogsList.children.length > 80) {
    consoleLogsList.removeChild(consoleLogsList.firstChild);
  }
}

/**
 * Appends a network request row to the DevTools Network table
 */
function addNetworkRow(status, name, type, size, latency) {
  const row = document.createElement('tr');
  
  const statusTd = document.createElement('td');
  statusTd.className = `net-status s${status}`;
  statusTd.textContent = status;
  
  const nameTd = document.createElement('td');
  nameTd.textContent = name;
  
  const typeTd = document.createElement('td');
  typeTd.textContent = type;
  
  const sizeTd = document.createElement('td');
  sizeTd.textContent = size;
  
  const latencyTd = document.createElement('td');
  latencyTd.textContent = latency;
  
  row.appendChild(statusTd);
  row.appendChild(nameTd);
  row.appendChild(typeTd);
  row.appendChild(sizeTd);
  row.appendChild(latencyTd);
  
  networkRequestsList.appendChild(row);
  networkRequestsList.scrollTop = networkRequestsList.scrollHeight;
  
  // Truncate old rows
  while (networkRequestsList.children.length > 25) {
    networkRequestsList.removeChild(networkRequestsList.firstChild);
  }
}

/**
 * Sync bookmarks visual state (locks vs custom server icons)
 */
function syncBookmarkUI() {
  const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
  bookmarkBtns.forEach(btn => {
    const levelId = btn.id.split('-')[1];
    if (game.unlockedLevels.includes(levelId)) {
      btn.classList.remove('locked');
      if (levelId === 'staging') {
        btn.textContent = "🧪 http://staging.local/";
        btn.title = "Switch to Staging";
      } else if (levelId === 'production') {
        btn.textContent = "🚀 http://production.live/";
        btn.title = "Switch to Production";
      }
    } else {
      btn.classList.add('locked');
      if (levelId === 'staging') {
        btn.textContent = "🔒 http://staging.local/";
        btn.title = "Staging Server (Locked)";
      } else if (levelId === 'production') {
        btn.textContent = "🔒 http://production.live/";
        btn.title = "Production Server (Locked)";
      }
    }
    
    if (game.currentLevel === levelId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Dynamically adjust browser address bar text
 */
function updateAddressBar(state) {
  if (state === 'menu') {
    addressInput.value = 'https://snake404.local/welcome.html';
    return;
  }
  if (state === 'bsod') {
    addressInput.value = 'https://snake404.local/500_server_error.html';
    return;
  }
  
  let base = 'http://localhost/';
  if (game.currentLevel === 'staging') base = 'http://staging.local/';
  else if (game.currentLevel === 'production') base = 'http://production.live/';
  
  let suffix = 'index.html';
  if (state === 'gameover') suffix = 'connection_reset.html';
  else if (game.glitchActive) suffix = 'index.html?glitch=active';
  else if (game.slowMoActive) suffix = 'index.html?cache=throttled';
  
  addressInput.value = base + suffix;
}

/**
 * Keep performance metrics updated
 */
function updatePerformanceDisplay() {
  // Update Level compile progress bar
  if (game.currentLevel === 'production') {
    progressContainer.style.display = 'none';
  } else {
    progressContainer.style.display = 'flex';
    const percent = Math.min(100, Math.floor((game.levelProgressCount / game.levelGoal) * 100));
    progressFill.style.width = `${percent}%`;
    progressFill.textContent = `${percent}%`;
  }

  // Update FPS text & bar
  perfFps.textContent = currentFps.toFixed(1);
  const fpsPct = Math.min(100, (currentFps / 60) * 100);
  perfFpsBar.style.width = `${fpsPct}%`;
  
  if (currentFps < 30) {
    perfFpsBar.style.backgroundColor = '#ff3333';
  } else if (currentFps < 50) {
    perfFpsBar.style.backgroundColor = '#ffc000';
  } else {
    perfFpsBar.style.backgroundColor = '#2ea043';
  }

  // Update ping simulator randomly (between 18ms and 36ms)
  if (Math.random() < 0.05) {
    const ping = Math.floor(Math.random() * 18) + 18;
    pingText.textContent = `PING: ${ping}ms`;
  }

  // Update speed values
  const speedText = game.slowMoActive ? `${Math.round(game.currentSpeed * 1.7)}ms (Throttled)` : `${game.currentSpeed}ms/tick`;
  perfSpeed.textContent = speedText;
  perfSpeed.style.color = game.slowMoActive ? '#00e5ff' : '#fff';
  
  // Update multipliers
  let multVal = 1.0;
  if (game.glitchActive) multVal *= 2.5;
  if (game.slowMoActive) multVal *= 0.5;
  perfMultiplier.textContent = `${multVal.toFixed(1)}x`;
  
  if (game.glitchActive) perfMultiplier.style.color = '#ff0055';
  else if (game.slowMoActive) perfMultiplier.style.color = '#00e5ff';
  else perfMultiplier.style.color = '#fff';

  // Update active packets count
  let nodesCount = game.packets.length + game.firewalls.length;
  if (game.malwareBug) nodesCount++;
  perfPackets.textContent = nodesCount;

  // Update memory (random slow increase/decrease to simulate garbage collection)
  const baseMem = 4.02 + (game.snake.length * 0.05);
  const noise = Math.sin(Date.now() / 5000) * 0.15;
  perfMemory.textContent = (baseMem + noise).toFixed(2);
}

// Run loader
window.onload = init;
