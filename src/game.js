/**
 * Snake 404 - Core Game State & Logic Engine
 */
import { audio } from './audio.js';

export const PACKET_TYPES = {
  OK_200: '200_OK',
  GLITCH_404: '404_NOT_FOUND',
  REDIRECT_301: '301_REDIRECT',
  FORBIDDEN_403: '403_FORBIDDEN',
  ERROR_500: '500_SERVER_ERROR',
  GZIP: 'GZIP',
  HTTPS: 'HTTPS',
  CACHE_CONTROL: 'CACHE_CONTROL'
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
    this.malwareBug = null; // Slowly wandering red bug hazard
    
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake404_highscore') || '0', 10);
    this.gameState = 'menu'; // menu, playing, bsod, gameover, deploying
    this.currentLevel = 'localhost'; // localhost, staging, production
    
    this.hackerNode = null;
    this.hackerLasers = [];
    this.hackerLasersActive = 0;
    this.lastHackerSpawnScore = 0;
    this.hackerAttackPhase = 0;     // cycles: 0=laser, 1=sprint, 2=EMP
    this.hackerTelegraphTicks = 0;  // countdown before attack fires
    this.hackerSprintTicks = 0;     // remaining sprint move ticks
    this.hackerEmpWalls = [];       // temporary EMP firewall traps
    this.levelProgressCount = 0;
    this.levelGoal = 12;
    this.unlockedLevels = ['localhost'];
    
    // Timing & Speed
    this.baseSpeed = 150; // ms per tick
    this.currentSpeed = this.baseSpeed;
    this.speedStep = 3; // decrease delay by 3ms per 200 OK
    this.minSpeed = 60;
    
    // Glitch (404) parameters
    this.glitchActive = false;
    this.glitchTimer = 0; // in ticks
    this.glitchDuration = 35; // ~5 seconds at 150ms
    
    // HTTP Power-up States
    this.shieldActive = false; // SSL Shield active
    this.slowMoActive = false; // Cache-Control slow-mo active
    this.slowMoTimer = 0;
    
    // God mode (debug cheat)
    this.godMode = false;
    
    // Event listener callbacks
    this.onLog = null;
    this.onNetworkRequest = null;
    this.onStateChange = null;
    this.onScoreUpdate = null;
    this.onShieldBreak = null; // Fired when shield absorbs crash
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
    if (this.currentLevel === 'staging') {
      this.snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
      ];
    } else {
      this.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ];
    }
    this.direction = 'right';
    this.nextDirection = 'right';
    this.packets = [];
    this.firewalls = [];
    this.malwareBug = null;
    this.score = 0;
    
    this.hackerNode = null;
    this.hackerLasers = [];
    this.hackerLasersActive = 0;
    this.lastHackerSpawnScore = 0;
    this.levelProgressCount = 0;
    this.levelGoal = this.currentLevel === 'localhost' ? 12 : (this.currentLevel === 'staging' ? 18 : Infinity);
    
    // Configure speed and obstacles based on level selector bookmarks
    if (this.currentLevel === 'localhost') {
      this.baseSpeed = 180;
      this.minSpeed = 100;
      
      // Spawn 3 initial obstacles for Localhost
      for (let i = 0; i < 3; i++) {
        this.spawnFirewall();
      }
    } else if (this.currentLevel === 'staging') {
      this.baseSpeed = 145;
      this.minSpeed = 70;
      
      // Central partition wall with ports (wider 4-cell gaps at y=3,4,5,6 and y=13,14,15,16)
      const midX = Math.floor(this.cols / 2);
      for (let y = 0; y < this.rows; y++) {
        if (y !== 3 && y !== 4 && y !== 5 && y !== 6 && y !== 13 && y !== 14 && y !== 15 && y !== 16) {
          this.firewalls.push({ x: midX, y: y });
        }
      }
    } else { // production
      this.baseSpeed = 105;
      this.minSpeed = 50;
      
      // Corner server obstacles (2x2 blocks in corners)
      const corners = [
        { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: this.cols - 3, y: 1 }, { x: this.cols - 2, y: 1 }, { x: this.cols - 3, y: 2 }, { x: this.cols - 2, y: 2 },
        { x: 1, y: this.rows - 3 }, { x: 2, y: this.rows - 3 }, { x: 1, y: this.rows - 2 }, { x: 2, y: this.rows - 2 },
        { x: this.cols - 3, y: this.rows - 3 }, { x: this.cols - 2, y: this.rows - 3 }, { x: this.cols - 3, y: this.rows - 2 }, { x: this.cols - 2, y: this.rows - 2 }
      ];
      corners.forEach(cell => {
        this.firewalls.push(cell);
      });
    }
    
    this.currentSpeed = this.baseSpeed;
    this.glitchActive = false;
    this.glitchTimer = 0;
    this.shieldActive = false;
    this.slowMoActive = false;
    this.slowMoTimer = 0;
    
    this.setGameState('playing');
    this.log(`[OK] Server environment [${this.currentLevel.toUpperCase()}] online.`, "log-200");
    this.log("HTTP Client v1.0 listener initialized.", "system");
    
    // Spawn initial packets
    this.spawnPacket(PACKET_TYPES.OK_200);
    
    // Spawn wandering bug hazard for non-localhost environments
    if (this.currentLevel !== 'localhost') {
      this.spawnMalwareBug();
    }
    
    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.snake.length);
    }
  }

  /**
   * Spawn a Malware Bug on the grid
   */
  spawnMalwareBug() {
    const cell = this.getRandomFreeCell();
    if (cell) {
      this.malwareBug = {
        x: cell.x,
        y: cell.y,
        moveCooldown: this.currentLevel === 'production' ? 2 : 4 // crawls faster on production
      };
      this.log("[WARN] Threat detected: slowly wandering Malware Bug detected on grid.", "log-403");
    }
  }

  /**
   * Update Malware Bug position — random roam normally,
   * but switches to aggressive chase when snake is within 7 cells.
   * Aggro is imperfect (40% random step) so the player can outmaneuver it.
   */
  updateMalwareBug() {
    if (!this.malwareBug) return;
    
    this.malwareBug.moveCooldown--;
    if (this.malwareBug.moveCooldown <= 0) {
      
      // Measure Manhattan distance to snake head
      const head = this.snake[0];
      const distToSnake = head
        ? Math.abs(this.malwareBug.x - head.x) + Math.abs(this.malwareBug.y - head.y)
        : Infinity;
      
      const aggroRange = 7;
      let move;
      
      if (distToSnake <= aggroRange && head) {
        // AGGRO MODE: pathfind toward snake head with 40% random steps
        // so the player can trick it and dodge
        const dx = head.x - this.malwareBug.x;
        const dy = head.y - this.malwareBug.y;
        if (Math.random() < 0.6) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            move = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
          } else {
            move = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
          }
        } else {
          // 40% chance of random step — keeps it beatable
          const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
          move = dirs[Math.floor(Math.random() * dirs.length)];
        }
        
        if (!this.malwareBug.aggroLogged) {
          this.malwareBug.aggroLogged = true;
          this.log("[WARN] Malware Bug has detected your stream! Threat closing in...", "log-403");
        }
      } else {
        // ROAM MODE: random direction
        this.malwareBug.aggroLogged = false;
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        move = dirs[Math.floor(Math.random() * dirs.length)];
      }
      
      let nextX = this.malwareBug.x + move.x;
      let nextY = this.malwareBug.y + move.y;
      
      // Keep inside bounds
      if (nextX < 0) nextX = this.cols - 1;
      else if (nextX >= this.cols) nextX = 0;
      
      if (nextY < 0) nextY = this.rows - 1;
      else if (nextY >= this.rows) nextY = 0;
      
      // Prevent malware bug from stepping on firewalls
      const isFirewall = this.firewalls.some(f => f.x === nextX && f.y === nextY);
      if (!isFirewall) {
        this.malwareBug.x = nextX;
        this.malwareBug.y = nextY;
      }
      
      // Same base cooldown in all modes — aggro just has smarter direction
      const baseCooldown = this.currentLevel === 'production' ? 3 : 5;
      this.malwareBug.moveCooldown = baseCooldown;
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
   * Spawn a packet at a random free cell (or ahead the snake for panic types)
   */
  spawnPacket(type = PACKET_TYPES.OK_200) {
    // 404, 301, and 500 spawn directly in front of the snake head to create urgency
    const panicTypes = [PACKET_TYPES.GLITCH_404, PACKET_TYPES.REDIRECT_301, PACKET_TYPES.ERROR_500];
    let cell = null;
    
    if (panicTypes.includes(type) && this.snake.length > 0) {
      cell = this.getAheadFreeCell(this.snake[0], this.direction, 5, 8);
    }
    
    // Fallback to random if no ahead cell found
    if (!cell) cell = this.getRandomFreeCell();
    if (!cell) return;

    let packet = {
      x: cell.x,
      y: cell.y,
      type: type,
      pulse: 0
    };

    // Give special packets a lifespan (e.g. 60 ticks)
    if (type !== PACKET_TYPES.OK_200) {
      packet.lifespan = 60;
      this.log(`[GET] Incoming packet buffer queued: ${type}`, `log-${type.split('_')[0].toLowerCase()}`);
    }

    this.packets.push(packet);
  }

  /**
   * Spawn a firewall block (403 Forbidden)
   * On Level 1, firewalls have a lifespan so they rotate to keep the board dynamic
   */
  spawnFirewall() {
    const cell = this.getRandomFreeCell();
    if (cell) {
      const fw = { x: cell.x, y: cell.y };
      // Give Level 1 firewalls a lifespan so they relocate and keep the board fresh
      if (this.currentLevel === 'localhost') {
        fw.lifespan = 80 + Math.floor(Math.random() * 60); // 80–140 ticks
      }
      this.firewalls.push(fw);
      this.log("[WARN] Firewall rules updated: 403 Forbidden node deployed.", "log-403");
    }
  }

  /**
   * Spawn a packet directly in front of the snake (in its heading direction)
   * with a lateral spread of ±2 cells. minDist/maxDist = cells ahead.
   */
  getAheadFreeCell(origin, direction, minDist = 5, maxDist = 8) {
    // Direction vectors
    const vectors = {
      'right': { ax: 1, ay: 0, lx: 0, ly: 1 },
      'left':  { ax: -1, ay: 0, lx: 0, ly: 1 },
      'up':    { ax: 0, ay: -1, lx: 1, ly: 0 },
      'down':  { ax: 0, ay: 1,  lx: 1, ly: 0 }
    };
    const v = vectors[direction] || vectors['right'];
    const candidates = [];

    for (let ahead = minDist; ahead <= maxDist; ahead++) {
      for (let lateral = -2; lateral <= 2; lateral++) {
        const x = ((origin.x + v.ax * ahead + v.lx * lateral) + this.cols) % this.cols;
        const y = ((origin.y + v.ay * ahead + v.ly * lateral) + this.rows) % this.rows;

        const isSnake = this.snake.some(s => s.x === x && s.y === y);
        if (isSnake) continue;
        const isPacket = this.packets.some(p => p.x === x && p.y === y);
        if (isPacket) continue;
        const isFirewall = this.firewalls.some(f => f.x === x && f.y === y);
        if (isFirewall) continue;

        // Weight cells closer ahead more heavily (more likely to pick those)
        const weight = maxDist - ahead + 1;
        for (let w = 0; w < weight; w++) candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Find a free cell within [minDist, maxDist] Manhattan distance from the origin
   */
  getNearbyFreeCell(origin, minDist = 3, maxDist = 6) {
    const candidates = [];
    for (let dx = -maxDist; dx <= maxDist; dx++) {
      for (let dy = -maxDist; dy <= maxDist; dy++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < minDist || dist > maxDist) continue;
        
        const x = (origin.x + dx + this.cols) % this.cols;
        const y = (origin.y + dy + this.rows) % this.rows;
        
        const isSnake = this.snake.some(s => s.x === x && s.y === y);
        if (isSnake) continue;
        const isPacket = this.packets.some(p => p.x === x && p.y === y);
        if (isPacket) continue;
        const isFirewall = this.firewalls.some(f => f.x === x && f.y === y);
        if (isFirewall) continue;
        
        candidates.push({ x, y });
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
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

    // Tick firewall lifespans (Level 1 rotating obstacles)
    this.firewalls = this.firewalls.filter(f => {
      if (f.lifespan === undefined) return true;
      f.lifespan--;
      if (f.lifespan <= 0) {
        // Respawn a new firewall in a fresh location to keep board dynamic
        setTimeout(() => this.spawnFirewall(), 0);
        return false;
      }
      return true;
    });

    // Passive special packet spawner
    const hasSpecial = this.packets.some(p => p.type !== PACKET_TYPES.OK_200);
    if (!hasSpecial && Math.random() < 0.035) {
      let specials = [];
      if (this.currentLevel === 'localhost') {
        // Level 1: only core data packets — no 500 BSOD, no power-ups
        specials = [PACKET_TYPES.GLITCH_404, PACKET_TYPES.REDIRECT_301];
      } else if (this.currentLevel === 'staging') {
        specials = [PACKET_TYPES.GLITCH_404, PACKET_TYPES.REDIRECT_301, PACKET_TYPES.GZIP, PACKET_TYPES.HTTPS];
      } else {
        specials = [PACKET_TYPES.GLITCH_404, PACKET_TYPES.REDIRECT_301, PACKET_TYPES.ERROR_500, PACKET_TYPES.GZIP, PACKET_TYPES.HTTPS, PACKET_TYPES.CACHE_CONTROL];
      }
      const chosen = specials[Math.floor(Math.random() * specials.length)];
      this.spawnPacket(chosen);
    }

    // Move Malware bug wandering
    if (this.currentLevel !== 'localhost') {
      this.updateMalwareBug();
    }

    // Update Hacker Boss
    if (this.currentLevel === 'production') {
      this.updateHackerBoss();
    }

    // Calculate new head coordinates
    let head = { ...this.snake[0] };
    if (this.direction === 'up') head.y--;
    else if (this.direction === 'down') head.y++;
    else if (this.direction === 'left') head.x--;
    else if (this.direction === 'right') head.x++;

    // Wrap around screen boundaries / edge rules depending on level
    if (this.currentLevel === 'localhost') {
      if (head.x < 0) head.x = this.cols - 1;
      else if (head.x >= this.cols) head.x = 0;
      
      if (head.y < 0) head.y = this.rows - 1;
      else if (head.y >= this.rows) head.y = 0;
    } else if (this.currentLevel === 'staging') {
      // Wrap around like localhost — consistent feel across levels
      if (head.x < 0) head.x = this.cols - 1;
      else if (head.x >= this.cols) head.x = 0;
      
      if (head.y < 0) head.y = this.rows - 1;
      else if (head.y >= this.rows) head.y = 0;
    } else { // production
      // Cross-wrapping redirection edges
      let crossWrapped = false;
      if (head.x < 0) {
        const oldY = head.y;
        head.x = Math.min(this.cols - 1, Math.max(0, Math.floor(oldY * (this.cols / this.rows))));
        head.y = 0;
        this.direction = 'down';
        this.nextDirection = 'down';
        crossWrapped = true;
      } else if (head.x >= this.cols) {
        const oldY = head.y;
        head.x = Math.min(this.cols - 1, Math.max(0, Math.floor(oldY * (this.cols / this.rows))));
        head.y = this.rows - 1;
        this.direction = 'up';
        this.nextDirection = 'up';
        crossWrapped = true;
      } else if (head.y < 0) {
        const oldX = head.x;
        head.y = Math.min(this.rows - 1, Math.max(0, Math.floor(oldX * (this.rows / this.cols))));
        head.x = this.cols - 1;
        this.direction = 'left';
        this.nextDirection = 'left';
        crossWrapped = true;
      } else if (head.y >= this.rows) {
        const oldX = head.x;
        head.y = Math.min(this.rows - 1, Math.max(0, Math.floor(oldX * (this.rows / this.cols))));
        head.x = 0;
        this.direction = 'right';
        this.nextDirection = 'right';
        crossWrapped = true;
      }
      
      if (crossWrapped) {
        this.logNetwork(301, "GET /routing/cross_wrap", "redirect", "0.3kb", "5ms");
        this.log(`[REDIRECT] 301 Redirection: Cross-wrapped to {x:${head.x}, y:${head.y}}`, "log-301");
      }
    }

    // Check collisions
    if (!this.godMode) {
      let isColliding = false;
      let collisionReason = "";

      // Body collision
      const bodyCollision = this.snake.some(segment => segment.x === head.x && segment.y === head.y);
      if (bodyCollision) {
        isColliding = true;
        collisionReason = "BUFFER_OVERFLOW";
      }

      // Firewall collision
      const firewallCollision = this.firewalls.some(f => f.x === head.x && f.y === head.y);
      if (firewallCollision) {
        isColliding = true;
        collisionReason = "ACCESS_DENIED_403";
      }

      // EMP trap wall collision (Hacker Phase 2 attack)
      const empCollision = this.hackerEmpWalls && this.hackerEmpWalls.some(w => w.x === head.x && w.y === head.y);
      if (empCollision) {
        isColliding = true;
        collisionReason = "EMP_TRAP_DETONATED";
      }

      // Malware Bug collision
      if (this.malwareBug && this.malwareBug.x === head.x && this.malwareBug.y === head.y) {
        isColliding = true;
        collisionReason = "MALWARE_INTERRUPT";
      }

      // Hacker laser collision
      const laserCollision = this.hackerLasers && this.hackerLasers.some(l => l.x === head.x && l.y === head.y);
      if (laserCollision && this.hackerLasersActive > 0) {
        isColliding = true;
        collisionReason = "FIREWALL_LASER_SECTOR";
      }

      if (isColliding) {
        if (this.shieldActive) {
          // SSL Shield absorbs collision!
          this.shieldActive = false;
          this.log("[SHIELD] SSL Certificate absorbed collision! Shield broken.", "log-https");
          if (this.onShieldBreak) {
            this.onShieldBreak();
          }
          
          // Relocate colliding bug if it was a bug collision to prevent double hit
          if (collisionReason === "MALWARE_INTERRUPT") {
            const freeCell = this.getRandomFreeCell();
            if (freeCell && this.malwareBug) {
              this.malwareBug.x = freeCell.x;
              this.malwareBug.y = freeCell.y;
            }
          }
        } else {
          this.gameOver(collisionReason);
          return;
        }
      }

      // Hacker node collision (to defeat it)
      if (this.hackerNode && this.hackerNode.x === head.x && this.hackerNode.y === head.y) {
        // Defeat hacker!
        this.score += 100;
        this.logNetwork("DEAUTH", "POST /security/deauth_hacker", "script", "0.1kb", "12ms");
        this.log("[DEAUTH] Hacker disconnected! Server integrity restored (+100).", "log-level");
        
        if (this.shieldActive) {
          this.shieldActive = false;
          this.log("[SHIELD] SSL Certificate absorbed deauth feedback. Shield broken.", "log-https");
          if (this.onShieldBreak) {
            this.onShieldBreak();
          }
        } else {
          // Damage tail
          const shrinkLen = 4;
          const minLen = 3;
          if (this.snake.length <= minLen) {
            this.gameOver("HACKER_DESTRUCTION");
            return;
          } else {
            this.snake = this.snake.slice(0, Math.max(minLen, this.snake.length - shrinkLen));
            this.log("[WARN] Threat feedback: Stream buffer corrupted (-4 segments).", "log-403");
          }
        }
        
        if (this.onHackerDefeated) {
          this.onHackerDefeated(this.hackerNode.x, this.hackerNode.y); // Spawn purple explosions
        }
        this.hackerNode = null;
        this.hackerLasers = [];
        this.hackerLasersActive = 0;
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

    // Handle active glitch (404) countdown
    if (this.glitchActive) {
      this.glitchTimer--;
      if (this.glitchTimer <= 0) {
        this.glitchActive = false;
        this.log("[OK] Core layout normalized. Glitch cleared.", "log-200");
      }
    }

    // Handle slow-mo (Cache-Control) countdown
    if (this.slowMoActive) {
      this.slowMoTimer--;
      if (this.slowMoTimer <= 0) {
        this.slowMoActive = false;
        this.log("[OK] Connection speed normalized.", "log-200");
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
        this.levelProgressCount++;
        this.logNetwork(200, "GET /status/200_ok", "XHR", `${size}kb`, `${latency}ms`);
        this.log(`[GET] 200 OK - Standard buffer expanded (+1)`, "log-200");
        
        // Check if level compilation target reached
        if (this.levelProgressCount >= this.levelGoal) {
          this.log(`[OK] Compilation target reached (${this.levelProgressCount}/${this.levelGoal}). Ready for deployment.`, "log-level");
          this.setGameState('deploying');
          break;
        }
        
        // Speed up game slightly (only if slow-mo isn't active)
        if (!this.slowMoActive) {
          this.currentSpeed = Math.max(this.minSpeed, this.currentSpeed - this.speedStep);
        }
        
        // Spawn next standard packet
        this.spawnPacket(PACKET_TYPES.OK_200);

        // Probability of spawning a special packet (404 and 301 allowed on localhost — no 500)
        let spawnProb = 0.15;
        let specials = [PACKET_TYPES.GLITCH_404, PACKET_TYPES.REDIRECT_301];
        
        if (this.currentLevel === 'staging') {
          spawnProb = 0.25;
          specials = [
            PACKET_TYPES.GZIP,
            PACKET_TYPES.HTTPS,
            PACKET_TYPES.REDIRECT_301,
            PACKET_TYPES.GLITCH_404
          ];
        } else if (this.currentLevel === 'production') {
          spawnProb = 0.35;
          specials = [
            PACKET_TYPES.GZIP,
            PACKET_TYPES.HTTPS,
            PACKET_TYPES.REDIRECT_301,
            PACKET_TYPES.GLITCH_404,
            PACKET_TYPES.ERROR_500,
            PACKET_TYPES.CACHE_CONTROL
          ];
        }

        if (spawnProb > 0 && Math.random() < spawnProb) {
          const chosen = specials[Math.floor(Math.random() * specials.length)];
          // Only spawn if not already active on board
          if (!this.packets.some(p => p.type === chosen)) {
            this.spawnPacket(chosen);
          }
        }
        
        // Probability of placing a firewall obstacle (escalates as you compile more data in the level)
        const progressRatio = this.levelGoal === Infinity ? 1 : (this.levelProgressCount / this.levelGoal);
        const baseProb = this.currentLevel === 'localhost' ? 0.08 : (this.currentLevel === 'production' ? 0.24 : 0.16);
        const dynamicProb = baseProb * (1 + progressRatio * 0.8);
        
        if (Math.random() < dynamicProb) {
          this.spawnFirewall();
        }
        break;

      case PACKET_TYPES.GLITCH_404:
        this.score += 50;
        this.glitchActive = true;
        this.glitchTimer = this.glitchDuration;
        this.logNetwork(404, "GET /status/404_not_found", "document", `${size * 2}kb`, `${latency + 120}ms`);
        this.log(`[WARN] 404 NOT FOUND - Local cache corrupted. Restructuring grid flow...`, "log-404");
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
        this.setGameState('bsod');
        break;
        
      case PACKET_TYPES.GZIP:
        this.score += 30;
        this.logNetwork("GZIP", "POST /decompress/gzip", "script", "0.8kb", `${latency - 1}ms`);
        
        // Decompress: shrink tail by 3 segments (keep minimum length of 3)
        const shrinkLength = 3;
        const minLen = 3;
        if (this.snake.length > minLen) {
          const newLen = Math.max(minLen, this.snake.length - shrinkLength);
          this.snake = this.snake.slice(0, newLen);
        }
        this.log(`[DECOMPRESS] gzip completed. Tail buffer compressed (-3 segments).`, "log-gzip");
        break;
        
      case PACKET_TYPES.HTTPS:
        this.score += 30;
        this.shieldActive = true;
        this.logNetwork("HTTPS", "GET /security/ssl_cert", "XHR", "2.1kb", `${latency + 10}ms`);
        this.log("[SECURITY] HTTPS SSL Certificate installed. Crash barrier deployed.", "log-https");
        break;
        
      case PACKET_TYPES.CACHE_CONTROL:
        this.score += 30;
        this.slowMoActive = true;
        this.slowMoTimer = 40; // 40 ticks (~6 seconds)
        this.logNetwork("CACHE", "GET /headers/cache_control", "XHR", "0.4kb", `${latency - 4}ms`);
        this.log("[HEADERS] Cache-Control: max-age=6000ms. Grid clock speed throttled.", "log-cache");
        break;
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.snake.length);
    }
    this.checkHackerSpawn();
  }

  checkHackerSpawn() {
    if (this.currentLevel !== 'production') return;
    const currentBucket = Math.floor(this.score / 50);
    const lastBucket = Math.floor(this.lastHackerSpawnScore / 50);
    if (currentBucket > lastBucket && !this.hackerNode) {
      this.lastHackerSpawnScore = this.score;
      this.spawnHackerBoss();
    }
  }

  spawnHackerBoss() {
    const cell = this.getRandomFreeCell();
    if (cell) {
      this.hackerNode = {
        x: cell.x,
        y: cell.y,
        moveCooldown: 3,
        attackCooldown: 30  // ticks before next attack phase
      };
      this.hackerAttackPhase = 0;
      this.hackerTelegraphTicks = 0;
      this.hackerSprintTicks = 0;
      this.hackerEmpWalls = [];
      audio.playHackerAlert();
      this.log("[CRITICAL] Hack attempt detected! Hacker Node online on network segment.", "log-hacker");
    }
  }

  updateHackerBoss() {
    if (!this.hackerNode) return;

    // --- Laser lifecycle ---
    if (this.hackerLasersActive > 0) {
      this.hackerLasersActive--;
      if (this.hackerLasersActive === 0) this.hackerLasers = [];
    }

    // --- EMP trap wall lifecycle (expire after 12 ticks) ---
    this.hackerEmpWalls = this.hackerEmpWalls.filter(w => {
      w.life--;
      return w.life > 0;
    });

    // --- Movement: pathfind toward nearest 200 OK ---
    // Sprint phase overrides normal movement
    if (this.hackerSprintTicks > 0) {
      this.hackerSprintTicks--;
      const head = this.snake[0];
      if (head) {
        const dx = head.x - this.hackerNode.x;
        const dy = head.y - this.hackerNode.y;
        let nx = this.hackerNode.x;
        let ny = this.hackerNode.y;
        if (Math.abs(dx) >= Math.abs(dy)) nx += dx > 0 ? 1 : -1;
        else ny += dy > 0 ? 1 : -1;
        nx = (nx + this.cols) % this.cols;
        ny = (ny + this.rows) % this.rows;
        const blocked = this.firewalls.some(f => f.x === nx && f.y === ny);
        if (!blocked) { this.hackerNode.x = nx; this.hackerNode.y = ny; }
      }
    } else {
      this.hackerNode.moveCooldown--;
      if (this.hackerNode.moveCooldown <= 0) {
        this.hackerNode.moveCooldown = 3;
        const target = this.packets.find(p => p.type === PACKET_TYPES.OK_200);
        if (target) {
          const dx = target.x - this.hackerNode.x;
          const dy = target.y - this.hackerNode.y;
          let nx = this.hackerNode.x;
          let ny = this.hackerNode.y;
          if (Math.abs(dx) > Math.abs(dy)) nx += dx > 0 ? 1 : -1;
          else ny += dy > 0 ? 1 : -1;
          nx = (nx + this.cols) % this.cols;
          ny = (ny + this.rows) % this.rows;
          const blocked = this.firewalls.some(f => f.x === nx && f.y === ny);
          if (!blocked) { this.hackerNode.x = nx; this.hackerNode.y = ny; }

          if (this.hackerNode.x === target.x && this.hackerNode.y === target.y) {
            const idx = this.packets.indexOf(target);
            if (idx !== -1) {
              this.packets.splice(idx, 1);
              this.log("[WARN] Exfiltration! Hacker hijacked 200 OK data packet.", "log-hacker");
              audio.play404();
              this.spawnPacket(PACKET_TYPES.OK_200);
            }
          }
        }
      }
    }

    // --- Telegraph countdown: hacker flashes before attacking ---
    if (this.hackerTelegraphTicks > 0) {
      this.hackerTelegraphTicks--;
      if (this.hackerTelegraphTicks === 0) {
        // Telegraph done — fire the attack!
        this._executeHackerAttack();
      }
      return;
    }

    // --- Attack cooldown ---
    this.hackerNode.attackCooldown--;
    if (this.hackerNode.attackCooldown <= 0) {
      // Start telegraph: flash for 10 ticks before attack
      this.hackerTelegraphTicks = 10;
      this.hackerNode.attackCooldown = 35;
      this.log(`[HACKER] Incoming attack! Brace for ${['LASER_SWEEP', 'SPRINT_CHARGE', 'EMP_CORRUPT'][this.hackerAttackPhase % 3]}`, "log-hacker");
      audio.playHackerAlert();
    }
  }

  _executeHackerAttack() {
    const phase = this.hackerAttackPhase % 3;
    this.hackerAttackPhase++;

    if (phase === 0) {
      // PHASE 0 — LASER SWEEP: horizontal or vertical full-row flash
      audio.playLaserSweep();
      this.hackerLasersActive = 4;
      const orient = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      this.hackerLasers = [];
      if (orient === 'horizontal') {
        for (let x = 0; x < this.cols; x++) this.hackerLasers.push({ x, y: this.hackerNode.y });
        this.log("[ATTACK] Hacker: horizontal port sweep deployed!", "log-hacker");
      } else {
        for (let y = 0; y < this.rows; y++) this.hackerLasers.push({ x: this.hackerNode.x, y });
        this.log("[ATTACK] Hacker: vertical port sweep deployed!", "log-hacker");
      }

    } else if (phase === 1) {
      // PHASE 1 — SPRINT CHARGE: rush directly at snake for 7 rapid ticks
      this.hackerSprintTicks = 7;
      this.log("[ATTACK] Hacker: initiating sprint charge toward your data stream!", "log-hacker");
      audio.playLaserSweep();

    } else {
      // PHASE 2 — EMP CORRUPTION: inverts controls + drops 3 trap walls near snake
      this.glitchActive = true;
      this.glitchTimer = 25; // ~3 seconds of inverted controls
      this.log("[ATTACK] Hacker: EMP burst fired! Controls corrupted. Firewall traps deployed!", "log-hacker");
      audio.play404();

      // Drop 3 temporary trap firewalls around the snake head
      const head = this.snake[0];
      if (head) {
        const offsets = [{ x: 2, y: 0 }, { x: 0, y: 2 }, { x: -2, y: 0 }];
        offsets.forEach(off => {
          const tx = (head.x + off.x + this.cols) % this.cols;
          const ty = (head.y + off.y + this.rows) % this.rows;
          const occupied = this.firewalls.some(f => f.x === tx && f.y === ty)
            || this.snake.some(s => s.x === tx && s.y === ty);
          if (!occupied) {
            this.hackerEmpWalls.push({ x: tx, y: ty, life: 20 });
          }
        });
      }
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
          this.log("[ERROR] /spawn requires a type (200, 404, 301, 500, 403, gzip, https, cache, bug)", "log-403");
          break;
        }
        const code = arg.trim().toLowerCase();
        if (code === '200') this.spawnPacket(PACKET_TYPES.OK_200);
        else if (code === '404') this.spawnPacket(PACKET_TYPES.GLITCH_404);
        else if (code === '301') this.spawnPacket(PACKET_TYPES.REDIRECT_301);
        else if (code === '500') this.spawnPacket(PACKET_TYPES.ERROR_500);
        else if (code === '403') this.spawnFirewall();
        else if (code === 'gzip') this.spawnPacket(PACKET_TYPES.GZIP);
        else if (code === 'https') this.spawnPacket(PACKET_TYPES.HTTPS);
        else if (code === 'cache') this.spawnPacket(PACKET_TYPES.CACHE_CONTROL);
        else if (code === 'bug') this.spawnMalwareBug();
        else this.log(`[ERROR] Unknown spawn entity: ${code}`, "log-403");
        break;

      default:
        this.log(`[ERROR] Command not found: ${cmd}. Type /help for options.`, "log-403");
    }
  }
}
