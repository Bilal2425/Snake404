/**
 * Snake 404 - Core Game State & Logic Engine
 */

export const PACKET_TYPES = {
  OK_200: '200_OK',
  GLITCH_404: '404_NOT_FOUND',
  REDIRECT_301: '301_REDIRECT',
  FORBIDDEN_403: '403_FORBIDDEN',
  ERROR_500: '500_SERVER_ERROR'
};

export class SnakeGame {
  constructor(cols = 30, rows = 20) {
    this.cols = cols;
    this.rows = rows;
    
    // Core game state
    this.snake = [];
    this.direction = 'right';
    this.nextDirection = 'right';
    
    this.packets = []; // Active packets on board
    this.firewalls = []; // 403 Forbidden wall blocks
    
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake404_highscore') || '0', 10);
    this.gameState = 'menu'; // menu, playing, bsod, gameover
    
    // Timing & Speed
    this.baseSpeed = 150; // ms per tick
    this.currentSpeed = this.baseSpeed;
    this.speedStep = 3; // decrease delay by 3ms per 200 OK
    this.minSpeed = 60;
    
    // Glitch (404) parameters
    this.glitchActive = false;
    this.glitchTimer = 0; // in ticks
    this.glitchDuration = 35; // ~5 seconds at 150ms
    
    // God mode (debug cheat)
    this.godMode = false;
    
    // Event listener callbacks
    this.onLog = null;
    this.onNetworkRequest = null;
    this.onStateChange = null;
    this.onScoreUpdate = null;
  }

  /**
   * Write a log message to the virtual console
   */
  log(message, type = 'system') {
    if (this.onLog) {
      this.onLog(message, type);
    }
  }

  /**
   * Log a network request in the virtual DevTools Network tab
   */
  logNetwork(status, name, type, size, latency) {
    if (this.onNetworkRequest) {
      this.onNetworkRequest(status, name, type, size, latency);
    }
  }

  /**
   * Initialize a new game session
   */
  start() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.direction = 'right';
    this.nextDirection = 'right';
    this.packets = [];
    this.firewalls = [];
    this.score = 0;
    this.currentSpeed = this.baseSpeed;
    this.glitchActive = false;
    this.glitchTimer = 0;
    
    this.setGameState('playing');
    this.log("System connection established.", "system");
    this.log("HTTP Client v1.0 listener initialized.", "system");
    
    // Spawn initial packets
    this.spawnPacket(PACKET_TYPES.OK_200);
    
    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.snake.length);
    }
  }

  /**
   * Update game state machine
   */
  setGameState(state) {
    this.gameState = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Trigger the fatal collision game over sequence
   */
  gameOver(reason = "COLLISION") {
    if (this.gameState === 'gameover') return;
    
    this.setGameState('gameover');
    this.log(`[CRITICAL] Stream terminated: ${reason}.`, "log-403");
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snake404_highscore', this.highScore.toString());
      this.log(`[OK] New local High Score compiled: ${this.highScore}!`, "log-200");
    }
  }

  /**
   * Set snake direction based on keyboard inputs (supports glitch inversion)
   */
  setDirection(newDir) {
    // If glitched, invert inputs!
    if (this.glitchActive) {
      const inversions = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
      };
      newDir = inversions[newDir] || newDir;
    }

    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };

    // Prevent turning directly back on self
    if (newDir !== opposites[this.direction]) {
      this.nextDirection = newDir;
    }
  }

  /**
   * Spawn a packet at a random free cell
   */
  spawnPacket(type = PACKET_TYPES.OK_200) {
    const cell = this.getRandomFreeCell();
    if (!cell) return;

    let packet = {
      x: cell.x,
      y: cell.y,
      type: type,
      pulse: 0
    };

    // Give special packets a lifespan (e.g. 50 ticks)
    if (type !== PACKET_TYPES.OK_200) {
      packet.lifespan = 50;
      this.log(`[GET] Incoming packet buffer queued: ${type}`, `log-${type.split('_')[0].toLowerCase()}`);
    }

    this.packets.push(packet);
  }

  /**
   * Spawn a firewall block (403 Forbidden)
   */
  spawnFirewall() {
    const cell = this.getRandomFreeCell();
    if (cell) {
      this.firewalls.push({ x: cell.x, y: cell.y });
      this.log("[WARN] Firewall rules updated: 403 Forbidden node deployed.", "log-403");
    }
  }

  /**
   * Find a random grid cell not occupied by the snake, packets, or firewalls
   */
  getRandomFreeCell() {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);

      // Check collision with snake body
      const isSnake = this.snake.some(segment => segment.x === x && segment.y === y);
      if (isSnake) continue;

      // Check collision with other packets
      const isPacket = this.packets.some(p => p.x === x && p.y === y);
      if (isPacket) continue;

      // Check collision with firewalls
      const isFirewall = this.firewalls.some(f => f.x === x && f.y === y);
      if (isFirewall) continue;

      return { x, y };
    }
    return null; // Grid is full!
  }

  /**
   * Core Game Loop Tick
   * Moves snake, handles collision, processes glitch mechanics
   */
  tick() {
    if (this.gameState !== 'playing') return;

    this.direction = this.nextDirection;

    // Calculate new head coordinates
    let head = { ...this.snake[0] };
    if (this.direction === 'up') head.y--;
    else if (this.direction === 'down') head.y++;
    else if (this.direction === 'left') head.x--;
    else if (this.direction === 'right') head.x++;

    // Wrap around screen boundaries (Server packet rerouting)
    if (head.x < 0) head.x = this.cols - 1;
    else if (head.x >= this.cols) head.x = 0;
    
    if (head.y < 0) head.y = this.rows - 1;
    else if (head.y >= this.rows) head.y = 0;

    // Check collisions
    if (!this.godMode) {
      // Body collision
      const bodyCollision = this.snake.some(segment => segment.x === head.x && segment.y === head.y);
      if (bodyCollision) {
        this.gameOver("BUFFER_OVERFLOW");
        return;
      }

      // Firewall collision
      const firewallCollision = this.firewalls.some(f => f.x === head.x && f.y === head.y);
      if (firewallCollision) {
        this.gameOver("ACCESS_DENIED_403");
        return;
      }
    }

    // Insert new head
    this.snake.unshift(head);

    // Process packets lifespan & animations
    this.packets.forEach(p => {
      p.pulse += 0.2;
      if (p.lifespan !== undefined) {
        p.lifespan--;
      }
    });

    // Remove expired packets
    this.packets = this.packets.filter(p => {
      if (p.lifespan !== undefined && p.lifespan <= 0) {
        this.log(`[DROP] Packet lifetime expired: ${p.type}`, "log-system");
        return false;
      }
      return true;
    });

    // Check food consumption
    let eatenIndex = this.packets.findIndex(p => p.x === head.x && p.y === head.y);

    if (eatenIndex !== -1) {
      const eatenPacket = this.packets[eatenIndex];
      this.packets.splice(eatenIndex, 1); // Remove it
      this.handleEatPacket(eatenPacket);
    } else {
      // Normal tick: remove tail to maintain length
      this.snake.pop();
    }

    // Handle active glitch countdown
    if (this.glitchActive) {
      this.glitchTimer--;
      if (this.glitchTimer <= 0) {
        this.glitchActive = false;
        this.log("[OK] Core layout normalized. Glitch cleared.", "log-200");
      }
    }
  }

  /**
   * Process packet consumption effects
   */
  handleEatPacket(packet) {
    const size = Math.floor(Math.random() * 10) + 1; // kb
    const latency = Math.floor(Math.random() * 40) + 5; // ms
    
    switch (packet.type) {
      case PACKET_TYPES.OK_200:
        this.score += 10;
        this.logNetwork(200, "GET /status/200_ok", "XHR", `${size}kb`, `${latency}ms`);
        this.log(`[GET] 200 OK - Standard buffer expanded (+1)`, "log-200");
        
        // Speed up game slightly
        this.currentSpeed = Math.max(this.minSpeed, this.currentSpeed - this.speedStep);
        
        // Spawn next standard packet
        this.spawnPacket(PACKET_TYPES.OK_200);

        // Probability of spawning a special packet (25%)
        if (Math.random() < 0.25) {
          const specials = [
            PACKET_TYPES.GLITCH_404,
            PACKET_TYPES.REDIRECT_301,
            PACKET_TYPES.ERROR_500
          ];
          const chosen = specials[Math.floor(Math.random() * specials.length)];
          
          // Only spawn if not already active on board
          if (!this.packets.some(p => p.type === chosen)) {
            this.spawnPacket(chosen);
          }
        }
        
        // Probability of placing a firewall obstacle (15%)
        if (Math.random() < 0.15) {
          this.spawnFirewall();
        }
        break;

      case PACKET_TYPES.GLITCH_404:
        this.score += 50;
        this.glitchActive = true;
        this.glitchTimer = this.glitchDuration;
        this.logNetwork(404, "GET /status/404_not_found", "document", `${size * 2}kb`, `${latency + 120}ms`);
        this.log(`[WARN] 404 NOT FOUND - Local cache corrupted. Restructuring grid flow...`, "log-404");
        
        // Do not pop tail this tick (adds length)
        break;

      case PACKET_TYPES.REDIRECT_301:
        this.score += 20;
        this.logNetwork(301, "GET /status/301_moved_permanently", "redirect", "0.2kb", `${latency - 2}ms`);
        
        // Redirect logic: Move head to a new random location
        const redirectCell = this.getRandomFreeCell();
        if (redirectCell) {
          this.snake[0] = { x: redirectCell.x, y: redirectCell.y };
          this.log(`[REDIRECT] 301 Moved Permanently - Relocated stream to {x:${redirectCell.x}, y:${redirectCell.y}}`, "log-301");
        }
        break;

      case PACKET_TYPES.ERROR_500:
        this.logNetwork(500, "GET /status/500_internal_error", "document", "45kb", `${latency + 300}ms`);
        this.log(`[FATAL] 500 INTERNAL SERVER ERROR - Initiating memory dump...`, "log-500");
        
        // Trigger BSOD recovery mode
        this.setGameState('bsod');
        break;
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.snake.length);
    }
  }

  /**
   * Execute DevTools CLI Commands
   */
  executeConsoleCommand(cmdString) {
    const parts = cmdString.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];

    switch (cmd) {
      case '/help':
        this.log("----------------------------------------", "system");
        this.log("Snake404 Terminal Help Console", "log-301");
        this.log("Available dev command options:", "system");
        this.log("  /god            - Toggle invincible debug mode", "system");
        this.log("  /speed <ms>     - Adjust loop speed directly (60-300)", "system");
        this.log("  /spawn <type>   - Spawn packet (200, 404, 301, 500, 403)", "system");
        this.log("  /clear          - Clear console records", "system");
        this.log("----------------------------------------", "system");
        break;
      
      case '/god':
        this.godMode = !this.godMode;
        this.log(`[DEBUG] God Mode Invincibility: ${this.godMode ? 'ENABLED' : 'DISABLED'}`, this.godMode ? 'log-200' : 'log-403');
        break;

      case '/speed':
        const val = parseInt(arg, 10);
        if (isNaN(val) || val < 40 || val > 500) {
          this.log("[ERROR] Invalid speed argument. Must be integer between 40 and 500 ms.", "log-403");
        } else {
          this.currentSpeed = val;
          this.log(`[DEBUG] Set clock ticks to: ${val} ms`, "log-200");
        }
        break;

      case '/spawn':
        if (!arg) {
          this.log("[ERROR] /spawn requires a status code (200, 404, 301, 500, 403)", "log-403");
          break;
        }
        const code = arg.trim();
        if (code === '200') this.spawnPacket(PACKET_TYPES.OK_200);
        else if (code === '404') this.spawnPacket(PACKET_TYPES.GLITCH_404);
        else if (code === '301') this.spawnPacket(PACKET_TYPES.REDIRECT_301);
        else if (code === '500') this.spawnPacket(PACKET_TYPES.ERROR_500);
        else if (code === '403') this.spawnFirewall();
        else this.log(`[ERROR] Unknown status code code packet: ${code}`, "log-403");
        break;

      default:
        this.log(`[ERROR] Command not found: ${cmd}. Type /help for options.`, "log-403");
    }
  }
}
