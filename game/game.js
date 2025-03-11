// Game state and constants
const GAME_STATES = {
    START: 'start',
    RUNNING: 'running',
    BATTLE: 'battle',
    GAMEOVER: 'gameover'
};

// RPG-like stat scaling
const STAT_SCALING = {
    PLAYER: {
        BASE_HP: 100,
        BASE_ATTACK: 10,
        HP_PER_LEVEL: 25,
        ATTACK_PER_LEVEL: 5,
        CRITICAL_CHANCE: 0.1,
        CRITICAL_MULTIPLIER: 2,
        DEFENSE_PER_LEVEL: 2
    },
    ENEMY: {
        BASE_HP: 20,
        BASE_ATTACK: 5,
        HP_SCALING: 1.2,
        ATTACK_SCALING: 1.15,
        BOSS_MULTIPLIER: 2.5
    }
};

const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
let gameState = GAME_STATES.START;
let animationId;
let globalProgress = loadProgress() || {
    maxLevel: 1,
    maxKills: 0,
    enemiesDefeated: 0
};

// Player class
class Player {
    constructor() {
        this.width = 40;
        this.height = 60;
        this.x = 100;
        this.y = CANVAS.height - this.height - 20;
        this.level = Math.max(1, Math.floor(globalProgress.maxLevel));
        this.kills = globalProgress.maxKills || 0;
        
        // Calculate stats based on level
        this.maxHp = STAT_SCALING.PLAYER.BASE_HP + 
            (this.level - 1) * STAT_SCALING.PLAYER.HP_PER_LEVEL;
        this.hp = this.maxHp;
        this.attack = STAT_SCALING.PLAYER.BASE_ATTACK + 
            (this.level - 1) * STAT_SCALING.PLAYER.ATTACK_PER_LEVEL;
        this.defense = (this.level - 1) * STAT_SCALING.PLAYER.DEFENSE_PER_LEVEL;
        this.criticalChance = STAT_SCALING.PLAYER.CRITICAL_CHANCE;
        this.criticalMultiplier = STAT_SCALING.PLAYER.CRITICAL_MULTIPLIER;
        
        // Experience system
        this.xp = 0;
        this.xpToNextLevel = this.calculateXpRequired();
    }

    calculateXpRequired() {
        return Math.floor(100 * Math.pow(1.2, this.level - 1));
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
        this.maxHp = STAT_SCALING.PLAYER.BASE_HP + 
            (this.level - 1) * STAT_SCALING.PLAYER.HP_PER_LEVEL;
        this.hp = this.maxHp;
        this.attack = STAT_SCALING.PLAYER.BASE_ATTACK + 
            (this.level - 1) * STAT_SCALING.PLAYER.ATTACK_PER_LEVEL;
        this.defense = (this.level - 1) * STAT_SCALING.PLAYER.DEFENSE_PER_LEVEL;
        
        // Update global progress
        globalProgress.maxLevel = Math.max(globalProgress.maxLevel, this.level);
        saveProgress();
        
        document.getElementById('level').textContent = this.level;
        
        // Show level up message
        const levelUpMsg = document.createElement('div');
        levelUpMsg.className = 'level-up-message';
        levelUpMsg.textContent = `Level Up! ${this.level}`;
        document.body.appendChild(levelUpMsg);
        setTimeout(() => levelUpMsg.remove(), 2000);
    }

    calculateDamage() {
        let damage = this.attack;
        if (Math.random() < this.criticalChance) {
            damage *= this.criticalMultiplier;
            return { damage, isCritical: true };
        }
        return { damage, isCritical: false };
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
        
        // Enemy stats scale with global progress
        const powerLevel = Math.floor(globalProgress.enemiesDefeated / 10);
        const isBoss = killCount > 0 && killCount % 10 === 0;
        
        // Base stats scaled by power level
        let baseHp = STAT_SCALING.ENEMY.BASE_HP * 
            Math.pow(STAT_SCALING.ENEMY.HP_SCALING, powerLevel);
        let baseAttack = STAT_SCALING.ENEMY.BASE_ATTACK * 
            Math.pow(STAT_SCALING.ENEMY.ATTACK_SCALING, powerLevel);
        
        // Apply boss multiplier if applicable
        if (isBoss) {
            baseHp *= STAT_SCALING.ENEMY.BOSS_MULTIPLIER;
            baseAttack *= STAT_SCALING.ENEMY.BOSS_MULTIPLIER;
            this.isBoss = true;
            this.width = 60;
            this.height = 60;
        }
        
        this.hp = Math.floor(baseHp);
        this.maxHp = this.hp;
        this.attack = Math.floor(baseAttack);
        
        // XP reward scales with power level
        this.xpReward = Math.floor(10 * Math.pow(1.1, powerLevel));
        if (isBoss) this.xpReward *= 3;
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
    document.getElementById('hp').textContent = Math.floor(player.hp);
    document.getElementById('kills').textContent = player.kills;
    document.getElementById('xp').textContent = Math.floor(player.xp);
    document.getElementById('xp-next').textContent = player.xpToNextLevel;
}

function battle() {
    if (Date.now() - battleTimer >= BATTLE_INTERVAL) {
        // Player attacks enemy
        const playerAttack = player.calculateDamage();
        const damageToEnemy = Math.max(1, playerAttack.damage);
        currentEnemy.hp -= damageToEnemy;
        
        // Show damage numbers
        showDamageNumber(currentEnemy.x, currentEnemy.y, damageToEnemy, playerAttack.isCritical);
        
        // Enemy attacks player
        const damageToPlayer = Math.max(1, currentEnemy.attack - player.defense);
        player.hp -= damageToPlayer;
        showDamageNumber(player.x, player.y, damageToPlayer, false);
        
        updateHUD();
        battleTimer = Date.now();

        // Check battle outcome
        if (currentEnemy.hp <= 0) {
            // Grant XP and check for level up
            player.xp += currentEnemy.xpReward;
            while (player.xp >= player.xpToNextLevel) {
                player.xp -= player.xpToNextLevel;
                player.levelUp();
                player.xpToNextLevel = player.calculateXpRequired();
            }
            
            player.kills++;
            globalProgress.maxKills = Math.max(globalProgress.maxKills, player.kills);
            globalProgress.enemiesDefeated++;
            saveProgress();
            
            currentEnemy = new Enemy(player.kills);
            gameState = GAME_STATES.RUNNING;
        }
        if (player.hp <= 0) {
            gameOver();
        }
    }
}

function showDamageNumber(x, y, damage, isCritical) {
    const damageText = document.createElement('div');
    damageText.className = 'damage-number' + (isCritical ? ' critical' : '');
    damageText.textContent = Math.floor(damage);
    damageText.style.left = (x + CANVAS.offsetLeft) + 'px';
    damageText.style.top = (y + CANVAS.offsetTop - 20) + 'px';
    document.body.appendChild(damageText);
    setTimeout(() => damageText.remove(), 1000);
}

function saveProgress() {
    localStorage.setItem('gameProgress', JSON.stringify(globalProgress));
}

function loadProgress() {
    const saved = localStorage.getItem('gameProgress');
    return saved ? JSON.parse(saved) : null;
}

function gameOver() {
    gameState = GAME_STATES.GAMEOVER;
    
    // Update final stats display
    document.getElementById('final-score').textContent = player.kills;
    document.getElementById('final-level').textContent = player.level;
    document.getElementById('max-level').textContent = globalProgress.maxLevel;
    document.getElementById('total-defeated').textContent = globalProgress.enemiesDefeated;
    
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
