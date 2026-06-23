/**
 * Snake 404 - HTML5 Canvas Render Engine
 */
import { PACKET_TYPES } from './game.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.cols = 30;
    this.rows = 20;
    
    // Cache grid cell size
    this.cellSize = 20; // 600 / 30 = 20, 400 / 20 = 20
    
    // Particle system
    this.particles = [];
    
    // Matrix style backdrop character stream (for background hacker aesthetics)
    this.bgStreams = [];
    this.initBgStreams();
  }

  /**
   * Set up columns of falling green terminal code in the background
   */
  initBgStreams() {
    for (let i = 0; i < this.cols; i++) {
      this.bgStreams.push({
        x: i * this.cellSize + 5,
        y: Math.random() * -400,
        speed: 1 + Math.random() * 2,
        chars: Array.from({length: 10}, () => Math.random() > 0.5 ? '0' : '1')
      });
    }
  }

  /**
   * Spawn a burst of colored pixel particles
   */
  spawnExplosion(gridX, gridY, color) {
    const startX = gridX * this.cellSize + this.cellSize / 2;
    const startY = gridY * this.cellSize + this.cellSize / 2;
    
    const count = 16 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      
      this.particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: color,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  /**
   * Clear canvas with transparency for motion trails
   */
  clear() {
    this.ctx.fillStyle = 'rgba(5, 7, 10, 0.28)'; // Match retro glass base
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw the entire game frame
   */
  draw(game) {
    this.cols = game.cols;
    this.rows = game.rows;
    this.cellSize = this.canvas.width / this.cols;

    this.clear();
    
    // 1. Draw subtle background code matrix
    this.drawBackgroundCode();
    
    // 2. Draw subtle grid intersections (dots)
    this.drawGridDots();

    // 3. Draw Firewalls (403 Forbidden obstacles)
    this.drawFirewalls(game.firewalls);

    // Draw Hacker Lasers
    this.drawHackerLasers(game.hackerLasers, game.hackerLasersActive);

    // 4. Draw Status Packets (Food)
    this.drawPackets(game.packets);

    // 5. Draw Malware Bug (wandering hazard)
    if (game.malwareBug) {
      this.drawMalwareBug(game.malwareBug);
    }

    // Draw Hacker EMP trap walls (temporary)
    if (game.hackerEmpWalls && game.hackerEmpWalls.length > 0) {
      this.drawHackerEmpWalls(game.hackerEmpWalls);
    }

    // Draw Hacker Node
    if (game.hackerNode) {
      this.drawHackerNode(game.hackerNode, game.hackerTelegraphTicks, game.hackerSprintTicks);
    }

    // 6. Draw Snake Data Stream (supports SSL Shield aura)
    this.drawSnake(game.snake, game.direction, game.glitchActive, game.shieldActive);

    // 7. Draw explosions & update particles
    this.drawAndUpdateParticles();
    
    // 8. Draw custom debug indicators on canvas (if god mode active)
    if (game.godMode) {
      this.ctx.fillStyle = 'rgba(46, 160, 67, 0.8)';
      this.ctx.font = '10px "Fira Code", monospace';
      this.ctx.fillText("SYS_DEBUG: INVINCIBLE_MODE_ON", 10, 20);
    }
    
    if (game.glitchActive) {
      this.drawGlitchLines();
    }
  }

  /**
   * Draw terminal code binary streams in background
   */
  drawBackgroundCode() {
    this.ctx.fillStyle = 'rgba(46, 160, 67, 0.04)'; // Extremely faint
    this.ctx.font = '10px monospace';
    
    this.bgStreams.forEach(stream => {
      stream.chars.forEach((char, idx) => {
        const yPos = stream.y + idx * 12;
        if (yPos > 0 && yPos < this.canvas.height) {
          this.ctx.fillText(char, stream.x, yPos);
        }
      });
      
      stream.y += stream.speed;
      if (stream.y > this.canvas.height) {
        stream.y = -120;
        stream.speed = 1 + Math.random() * 2;
      }
    });
  }

  /**
   * Draw subtle grid anchor points
   */
  drawGridDots() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let c = 1; c < this.cols; c++) {
      for (let r = 1; r < this.rows; r++) {
        this.ctx.fillRect(c * this.cellSize - 1, r * this.cellSize - 1, 2, 2);
      }
    }
  }

  /**
   * Draw firewalls as warning mainframe blocks
   */
  drawFirewalls(firewalls) {
    firewalls.forEach(f => {
      const x = f.x * this.cellSize;
      const y = f.y * this.cellSize;
      const size = this.cellSize;
      
      // Outer red glow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ff3333';
      
      // Draw grid block
      this.ctx.strokeStyle = '#ff3333';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
      
      // Draw inner danger 'X'
      this.ctx.beginPath();
      this.ctx.moveTo(x + 6, y + 6);
      this.ctx.lineTo(x + size - 6, y + size - 6);
      this.ctx.moveTo(x + size - 6, y + 6);
      this.ctx.lineTo(x + 6, y + size - 6);
      this.ctx.stroke();
      
      // Reset shadows
      this.ctx.shadowBlur = 0;
    });
  }

  /**
   * Draw incoming status code packets (Food)
   */
  drawPackets(packets) {
    packets.forEach(p => {
      const x = p.x * this.cellSize;
      const y = p.y * this.cellSize;
      const size = this.cellSize;
      const center = size / 2;
      
      // Pulsing scale factor
      const scale = 1 + Math.sin(p.pulse) * 0.12;
      const r = (size / 2 - 3) * scale;
      
      this.ctx.save();
      this.ctx.translate(x + center, y + center);
      
      switch (p.type) {
        case PACKET_TYPES.OK_200:
          // Glowing green circle
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#2ea043';
          this.ctx.fillStyle = '#2ea043';
          
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Outer ring
          this.ctx.strokeStyle = '#85ea9b';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
          this.ctx.stroke();
          break;
          
        case PACKET_TYPES.GLITCH_404:
          // Magenta glitched diamond
          this.ctx.shadowBlur = 15;
          this.ctx.shadowColor = '#ff0055';
          this.ctx.fillStyle = '#ff0055';
          
          // Random offset to simulate visual screen glitching
          const glitchX = (Math.random() - 0.5) * 3;
          const glitchY = (Math.random() - 0.5) * 1.5;
          
          this.ctx.beginPath();
          this.ctx.moveTo(glitchX, -r + glitchY);
          this.ctx.lineTo(r + glitchX, glitchY);
          this.ctx.lineTo(glitchX, r + glitchY);
          this.ctx.lineTo(-r + glitchX, glitchY);
          this.ctx.closePath();
          this.ctx.fill();
          
          // Text code overlay label
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = '#fff';
          this.ctx.font = 'bold 8px "Fira Code", monospace';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText("404", glitchX, glitchY + 1);
          break;
          
        case PACKET_TYPES.REDIRECT_301:
          // Cyan spiral/portal
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#00f0ff';
          this.ctx.strokeStyle = '#00f0ff';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          // Draw portal concentric arcs
          this.ctx.arc(0, 0, r, p.pulse % (Math.PI * 2), (p.pulse % (Math.PI * 2)) + Math.PI * 1.5);
          this.ctx.stroke();
          
          this.ctx.fillStyle = '#8ffcff';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
          this.ctx.fill();
          break;
          
        case PACKET_TYPES.ERROR_500:
          // Glowing blue hazard triangle
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#3377ff';
          this.ctx.fillStyle = '#3377ff';
          
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r);
          this.ctx.lineTo(r, r);
          this.ctx.lineTo(-r, r);
          this.ctx.closePath();
          this.ctx.fill();
          
          // Center dot
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.arc(0, r/2, 2, 0, Math.PI * 2);
          this.ctx.fill();
          break;
          
        case PACKET_TYPES.GZIP:
          // Blue file box arpeggio
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#3377ff';
          this.ctx.fillStyle = '#3377ff';
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 1;
          
          this.ctx.beginPath();
          this.ctx.rect(-r + 1, -r + 1, r*2 - 2, r*2 - 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // Draw text inside
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = '#fff';
          this.ctx.font = 'bold 7px "Fira Code", monospace';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText("ZIP", 0, 0);
          break;
          
        case PACKET_TYPES.HTTPS:
          // Yellow shield badge
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#ffc000';
          this.ctx.fillStyle = '#ffc000';
          
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r);
          this.ctx.lineTo(r, -r + 4);
          this.ctx.lineTo(r - 2, 2);
          this.ctx.lineTo(0, r);
          this.ctx.lineTo(-r + 2, 2);
          this.ctx.lineTo(-r, -r + 4);
          this.ctx.closePath();
          this.ctx.fill();
          
          // Inner detail
          this.ctx.fillStyle = '#000';
          this.ctx.font = 'bold 8px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText("S", 0, 0);
          break;
          
        case PACKET_TYPES.CACHE_CONTROL:
          // Cyan clock/hourglass
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#00f0ff';
          this.ctx.fillStyle = '#00f0ff';
          
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Draw hourglass lines inside
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.moveTo(-3, -3); this.ctx.lineTo(3, 3);
          this.ctx.moveTo(3, -3); this.ctx.lineTo(-3, 3);
          this.ctx.stroke();
          break;
      }
      
      this.ctx.restore();
      this.ctx.shadowBlur = 0; // reset
    });
  }

  /**
   * Draw the slowly wandering Malware Bug hazard
   */
  drawMalwareBug(bug) {
    const x = bug.x * this.cellSize;
    const y = bug.y * this.cellSize;
    const size = this.cellSize;
    
    this.ctx.save();
    
    // Glowing red hazard
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ff3333';
    this.ctx.fillStyle = '#ff3333';
    
    // Draw bug body (rounded core)
    this.drawRoundedRect(x + 4, y + 4, size - 8, size - 8, 3);
    
    // Draw little legs (6 short lines)
    this.ctx.strokeStyle = '#ff3333';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    // Left legs
    this.ctx.moveTo(x + 4, y + 6); this.ctx.lineTo(x + 1, y + 4);
    this.ctx.moveTo(x + 4, y + 10); this.ctx.lineTo(x + 1, y + 10);
    this.ctx.moveTo(x + 4, y + 14); this.ctx.lineTo(x + 1, y + 16);
    // Right legs
    this.ctx.moveTo(x + size - 4, y + 6); this.ctx.lineTo(x + size - 1, y + 4);
    this.ctx.moveTo(x + size - 4, y + 10); this.ctx.lineTo(x + size - 1, y + 10);
    this.ctx.moveTo(x + size - 4, y + 14); this.ctx.lineTo(x + size - 1, y + 16);
    // Antenna
    this.ctx.moveTo(x + 8, y + 4); this.ctx.lineTo(x + 6, y + 1);
    this.ctx.moveTo(x + 12, y + 4); this.ctx.lineTo(x + 14, y + 1);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  /**
   * Draw the Snake Data Stream (supports glitch styling)
   */
  drawSnake(snake, direction, isGlitched, shieldActive) {
    if (snake.length === 0) return;

    // 1. Draw body segment path
    for (let i = snake.length - 1; i >= 0; i--) {
      const segment = snake[i];
      const x = segment.x * this.cellSize;
      const y = segment.y * this.cellSize;
      const size = this.cellSize;
      
      const isHead = i === 0;
      
      this.ctx.save();
      
      if (isHead) {
        // Draw head shield aura if HTTPS is active
        if (shieldActive) {
          this.ctx.save();
          this.ctx.shadowBlur = 16;
          this.ctx.shadowColor = '#ffc000';
          this.ctx.strokeStyle = 'rgba(255, 192, 0, 0.8)';
          this.ctx.lineWidth = 2.5;
          this.ctx.beginPath();
          this.ctx.arc(x + size / 2, y + size / 2, size - 1, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
        }

        // Snake Head - Glowing Node
        this.ctx.shadowBlur = 14;
        this.ctx.shadowColor = isGlitched ? '#ff0055' : '#00f0ff'; // cyan or glitch magenta
        this.ctx.fillStyle = isGlitched ? '#ff0055' : '#00f0ff';
        
        // Draw rounded rectangle for head
        this.drawRoundedRect(x + 1, y + 1, size - 2, size - 2, 6);
        
        // Draw eyes pointing towards direction
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#000';
        
        const eyeOffset = 5;
        const eyeRadius = 2.5;
        
        if (direction === 'right') {
          this.ctx.beginPath();
          this.ctx.arc(x + size - eyeOffset, y + eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.arc(x + size - eyeOffset, y + size - eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (direction === 'left') {
          this.ctx.beginPath();
          this.ctx.arc(x + eyeOffset, y + eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.arc(x + eyeOffset, y + size - eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (direction === 'up') {
          this.ctx.beginPath();
          this.ctx.arc(x + eyeOffset, y + eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.arc(x + size - eyeOffset, y + eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (direction === 'down') {
          this.ctx.beginPath();
          this.ctx.arc(x + eyeOffset, y + size - eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.arc(x + size - eyeOffset, y + size - eyeOffset, eyeRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      } else {
        // Snake Body segments
        const ratio = i / snake.length; // 0 near head, 1 near tail
        
        if (isGlitched) {
          // Glitched segment: alternating colorful blocks or characters
          const colors = ['#ff0055', '#00f0ff', '#2ea043', '#ffc000'];
          this.ctx.fillStyle = colors[(i + Math.floor(Date.now() / 100)) % colors.length];
          this.ctx.font = 'bold 12px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          
          const glChars = ['4', '0', '4', 'X', '?', '&', '@', '%'];
          this.ctx.fillText(glChars[i % glChars.length], x + size/2, y + size/2);
        } else {
          // Standard Segment: Sleek green gradient from head to tail
          // Create custom gradient interpolation
          const r = Math.floor(46 + (9 - 46) * ratio);
          const g = Math.floor(160 + (12 - 160) * ratio);
          const b = Math.floor(67 + (16 - 67) * ratio);
          
          this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          
          // Draw standard packet squares with rounded corners
          this.drawRoundedRect(x + 2, y + 2, size - 4, size - 4, 4);
        }
      }
      
      this.ctx.restore();
    }
  }

  /**
   * Helper to draw a rounded rect
   */
  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw horizontal digital glitch displacement lines
   */
  drawGlitchLines() {
    this.ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
    for (let i = 0; i < 3; i++) {
      const y = Math.random() * this.canvas.height;
      const h = 2 + Math.random() * 8;
      this.ctx.fillRect(0, y, this.canvas.width, h);
    }
  }

  /**
   * Update and draw particles from explosions
   */
  drawAndUpdateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 4;
      this.ctx.shadowColor = p.color;
      
      this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      
      this.ctx.restore();
    }
  }

  /**
   * Draw the Hacker Boss Node
   */
  drawHackerNode(hacker, telegraphTicks = 0, sprintTicks = 0) {
    const x = hacker.x * this.cellSize;
    const y = hacker.y * this.cellSize;
    const size = this.cellSize;
    const t = Date.now();

    this.ctx.save();

    let nodeColor = '#d500f9'; // default purple
    let glowColor = '#d500f9';
    let glowBlur = 15;

    if (telegraphTicks > 0) {
      // TELEGRAPH: rapid red-white flash warning
      const flash = Math.floor(t / 80) % 2 === 0;
      nodeColor = flash ? '#ff1744' : '#ffffff';
      glowColor = '#ff1744';
      glowBlur = 25;
    } else if (sprintTicks > 0) {
      // SPRINT: bright electric cyan surge
      nodeColor = '#00e5ff';
      glowColor = '#00e5ff';
      glowBlur = 30;
    }

    this.ctx.shadowBlur = glowBlur;
    this.ctx.shadowColor = glowColor;
    this.ctx.fillStyle = nodeColor;
    
    this.drawRoundedRect(x + 2, y + 2, size - 4, size - 4, 5);
    
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 12px "Fira Code", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    // Show different icon per state
    const icon = telegraphTicks > 0 ? '⚡' : sprintTicks > 0 ? '▶' : '☠';
    this.ctx.fillText(icon, x + size / 2, y + size / 2);
    
    this.ctx.restore();
  }

  /**
   * Draw temporary EMP firewall traps (yellow pulsing squares)
   */
  drawHackerEmpWalls(empWalls) {
    this.ctx.save();
    const alpha = 0.4 + Math.sin(Date.now() / 120) * 0.25;
    this.ctx.strokeStyle = `rgba(255, 214, 0, ${alpha})`;
    this.ctx.fillStyle = `rgba(255, 180, 0, ${alpha * 0.5})`;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ffd600';
    this.ctx.lineWidth = 2;

    empWalls.forEach(w => {
      const wx = w.x * this.cellSize;
      const wy = w.y * this.cellSize;
      this.ctx.fillRect(wx + 2, wy + 2, this.cellSize - 4, this.cellSize - 4);
      this.ctx.strokeRect(wx + 2, wy + 2, this.cellSize - 4, this.cellSize - 4);
    });
    this.ctx.restore();
  }

  /**
   * Draw Hacker Scanning Lasers
   */
  drawHackerLasers(lasers, activeTicks) {
    if (!lasers || lasers.length === 0) return;
    
    this.ctx.save();
    const alpha = 0.35 + Math.sin(Date.now() / 40) * 0.15;
    this.ctx.fillStyle = `rgba(255, 0, 85, ${alpha})`;
    
    lasers.forEach(cell => {
      const lx = cell.x * this.cellSize;
      const ly = cell.y * this.cellSize;
      this.ctx.fillRect(lx, ly, this.cellSize, this.cellSize);
      
      // Core laser beam line
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(lx + this.cellSize / 2, ly);
      this.ctx.lineTo(lx + this.cellSize / 2, ly + this.cellSize);
      this.ctx.moveTo(lx, ly + this.cellSize / 2);
      this.ctx.lineTo(lx + this.cellSize, ly + this.cellSize / 2);
      this.ctx.stroke();
    });
    
    this.ctx.restore();
  }
}
