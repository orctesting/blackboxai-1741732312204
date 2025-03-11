// Game state and constants
const GAME_STATES = {
    START: 'start',
    RUNNING: 'running',
    BATTLE: 'battle',
    GAMEOVER: 'gameover'
};

const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
let gameState = GAME_STATES.START;
let animationId;

// Player class
class Player {
    constructor() {
        this.width = 40;
        this.height = 60;
        this.x = 100;
        this.y = CANVAS.height - this.height - 20;
        this.hp = 100;
        this.maxHp = 100;
        this.attack = 10;
        this.level = 1;
        this.kills = 0;
    }

    draw() {
        CTX.fillStyle = '#00ff00';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        // Draw health bar
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = 50;
        const barHeight = 5;
        const healthPercent = this.hp / this.maxHp;
        CTX.fillStyle = '#ff0000';
        CTX.fillRect(this.x - 5, this.y - 10, barWidth, barHeight);
        CTX.fillStyle = '#00ff00';
        CTX.fillRect(this.x - 5, this.y - 10, barWidth * healthPercent, barHeight);
    }

    levelUp() {
        this.level++;
        this.maxHp += 20;
        this.hp = this.maxHp;
        this.attack += 5;
        document.getElementById('level').textContent = this.level;
    }
}

// Enemy class
class Enemy {
    constructor(killCount) {
        this.width = 40;
        this.height = 40;
        this.x = CANVAS.width;
        this.y = CANVAS.height - this.height - 20;
        this.speed = 3;
        // Enemy stats scale with kill count
        const powerLevel = Math.floor(killCount / 10);
        this.hp = 20 + (powerLevel * 5);
        this.maxHp = this.hp;
        this.attack = 5 + (powerLevel * 2);
    }

    draw() {
        CTX.fillStyle = '#ff0000';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        // Draw health bar
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = 50;
        const barHeight = 5;
        const healthPercent = this.hp / this.maxHp;
        CTX.fillStyle = '#ff0000';
        CTX.fillRect(this.x - 5, this.y - 10, barWidth, barHeight);
        CTX.fillStyle = '#00ff00';
        CTX.fillRect(this.x - 5, this.y - 10, barWidth * healthPercent, barHeight);
    }

    move() {
        this.x -= this.speed;
    }
}

// Game variables
let player = new Player();
let currentEnemy = null;
let battleTimer = 0;
const BATTLE_INTERVAL = 1000; // 1 second between attacks

// Game functions
function init() {
    player = new Player();
    currentEnemy = new Enemy(player.kills);
    gameState = GAME_STATES.RUNNING;
    updateHUD();
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    gameLoop();
}

function updateHUD() {
    document.getElementById('hp').textContent = player.hp;
    document.getElementById('kills').textContent = player.kills;
}

function battle() {
    if (Date.now() - battleTimer >= BATTLE_INTERVAL) {
        // Player and enemy attack each other
        currentEnemy.hp -= player.attack;
        player.hp -= currentEnemy.attack;
        updateHUD();
        battleTimer = Date.now();

        // Check battle outcome
        if (currentEnemy.hp <= 0) {
            player.kills++;
            if (player.kills % 10 === 0) {
                player.levelUp();
            }
            currentEnemy = new Enemy(player.kills);
            gameState = GAME_STATES.RUNNING;
        }
        if (player.hp <= 0) {
            gameOver();
        }
    }
}

function gameOver() {
    gameState = GAME_STATES.GAMEOVER;
    document.getElementById('final-score').textContent = player.kills;
    document.getElementById('game-over').style.display = 'flex';
    cancelAnimationFrame(animationId);
}

function draw() {
    // Clear canvas
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    
    // Draw ground
    CTX.fillStyle = '#333';
    CTX.fillRect(0, CANVAS.height - 20, CANVAS.width, 20);
    
    // Draw player and enemy
    player.draw();
    if (currentEnemy) {
        currentEnemy.draw();
    }
}

function update() {
    if (gameState === GAME_STATES.RUNNING) {
        currentEnemy.move();
        
        // Check for collision
        if (player.x < currentEnemy.x + currentEnemy.width &&
            player.x + player.width > currentEnemy.x &&
            player.y < currentEnemy.y + currentEnemy.height &&
            player.y + player.height > currentEnemy.y) {
            gameState = GAME_STATES.BATTLE;
            battleTimer = Date.now();
        }
        
        // Spawn new enemy if current one goes off screen
        if (currentEnemy.x + currentEnemy.width < 0) {
            currentEnemy = new Enemy(player.kills);
        }
    } else if (gameState === GAME_STATES.BATTLE) {
        battle();
    }
}

function gameLoop() {
    update();
    draw();
    if (gameState !== GAME_STATES.GAMEOVER) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', init);
document.getElementById('restart-btn').addEventListener('click', init);
