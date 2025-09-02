class ArkanoidGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        this.gameState = 'menu';
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        this.difficulty = 'medium';
        this.playerName = '';
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.balls = [];
        this.blocks = [];
        this.bonuses = [];
        this.activeBonuses = [];
        this.sounds = {
            bounce: new Howl({ src: ['https://cdn.freesound.org/previews/411/411092_5121236-lq.mp3'] }),
            blockHit: new Howl({ src: ['https://cdn.freesound.org/previews/171/171671_2437358-lq.mp3'] }),
            bonus: new Howl({ src: ['https://cdn.freesound.org/previews/270/270306_5123851-lq.mp3'] }),
            gameOver: new Howl({ src: ['https://cdn.freesound.org/previews/269/269705_5098977-lq.mp3'] }),
            levelComplete: new Howl({ src: ['https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3'] }),
            background: new Howl({ src: ['https://cdn.freesound.org/previews/263/263133_2061240-lq.mp3'], loop: true, volume: 0.2 })
        };
        this.statsKey = 'arkanoidStats';
        this.settingsKey = 'arkanoidSettings';
        this.giphyApiKey = 'VuExca9KDaS85j1CEAiL3S5XO3fONLku';
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.loadSounds();
        this.initUI();
        this.loadSettings();
        this.sounds.background.play();
    }

    resizeCanvas() {
        const container = document.querySelector('.game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        if (this.platform) this.platform.y = this.gameHeight - 20;
    }

    loadSounds() {
        Object.values(this.sounds).forEach(sound => sound.volume(0.5));
    }

    initUI() {
        document.getElementById('startGame').addEventListener('click', () => this.startNewGame());
        document.getElementById('settings').addEventListener('click', () => this.showSettings());
        document.getElementById('tutorial').addEventListener('click', () => this.showTutorial());
        document.getElementById('stats').addEventListener('click', () => this.showStats());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('backToMenu').addEventListener('click', () => this.hideSettings());
        document.getElementById('tutorialBack').addEventListener('click', () => this.hideTutorial());
        document.getElementById('statsBack').addEventListener('click', () => this.hideStats());
        document.getElementById('clearStats').addEventListener('click', () => this.clearStats());
        document.getElementById('pauseGame').addEventListener('click', () => this.pauseGame());
        document.getElementById('resumeGame').addEventListener('click', () => this.resumeGame());
        document.getElementById('exitToMenu').addEventListener('click', () => this.exitToMenu());
        document.getElementById('nextLevel').addEventListener('click', () => this.nextLevel());
        document.getElementById('restartGame').addEventListener('click', () => {
            document.getElementById('gameOver').classList.add('hidden');
            this.startNewGame();
        });
        document.getElementById('gameOverToMenu').addEventListener('click', () => this.exitToMenu());
        document.getElementById('playerName').addEventListener('input', (e) => this.validateName(e.target.value));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        });
    }

    validateName(name) {
        const errorElement = document.getElementById('nameError');
        if (name.length < 3) {
            errorElement.textContent = 'Имя должно содержать минимум 3 символа';
            document.getElementById('startGame').disabled = true;
            return false;
        } else if (!/^[a-zA-Zа-яА-Я0-9 ]+$/.test(name)) {
            errorElement.textContent = 'Имя содержит недопустимые символы';
            document.getElementById('startGame').disabled = true;
            return false;
        } else {
            errorElement.textContent = '';
            document.getElementById('startGame').disabled = false;
            this.playerName = name;
            return true;
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(this.settingsKey);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.difficulty = settings.difficulty || 'medium';
                const volume = settings.volume !== undefined ? settings.volume : 50;
                document.getElementById('difficulty').value = this.difficulty;
                document.getElementById('soundVolume').value = volume;
                Object.values(this.sounds).forEach(sound => sound.volume(volume / 100));
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }

    saveSettings() {
        this.difficulty = document.getElementById('difficulty').value;
        const volume = document.getElementById('soundVolume').value / 100;
        Object.values(this.sounds).forEach(sound => sound.volume(volume));
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify({
                difficulty: this.difficulty,
                volume: document.getElementById('soundVolume').value
            }));
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
        }
        this.hideSettings();
    }

    saveStats() {
        try {
            const stats = this.loadStats() || [];
            if (!stats.find(entry => 
                entry.score === this.score && 
                entry.playerName === this.playerName && 
                entry.time === document.getElementById('gameTimer').textContent
            )) {
                stats.push({
                    score: this.score,
                    playerName: this.playerName,
                    time: document.getElementById('gameTimer').textContent,
                    timestamp: Date.now()
                });
                stats.sort((a, b) => b.score - a.score);
                localStorage.setItem(this.statsKey, JSON.stringify(stats));
            }
        } catch (e) {
            console.error('Ошибка сохранения статистики:', e);
        }
    }

    loadStats() {
        try {
            const statsData = localStorage.getItem(this.statsKey);
            return statsData ? JSON.parse(statsData) : [];
        } catch (e) {
            console.error('Ошибка загрузки статистики:', e);
            return [];
        }
    }

    clearStats() {
        localStorage.removeItem(this.statsKey);
        this.showStats();
    }

    showStats() {
        const stats = this.loadStats();
        const statsContent = document.getElementById('statsContent');
        statsContent.innerHTML = '';
        if (stats.length === 0) {
            statsContent.innerHTML = '<p>Статистика пуста</p>';
        } else {
            stats.forEach(entry => {
                const div = document.createElement('div');
                div.className = 'stats-entry';
                div.innerHTML = `
                    <span>${entry.playerName}</span>
                    <span>${entry.score}</span>
                    <span>${entry.time}</span>
                `;
                statsContent.appendChild(div);
            });
        }
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('statsMenu').classList.remove('hidden');
    }

    hideStats() {
        document.getElementById('statsMenu').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    startNewGame() {
        if (!this.validateName(document.getElementById('playerName').value)) return;
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        this.elapsedTime = 0;
        document.getElementById('gameOverGif').classList.add('hidden');
        this.startLevel();
    }

    startLevel() {
        this.blocks = [];
        this.bonuses = [];
        this.activeBonuses = [];
        this.balls = [];
        this.createPlatform();
        this.createBall();
        this.createBlocks();
        this.applyDifficulty();
        this.gameState = 'playing';
        this.startTimer();
        this.updateUI();
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        if (!this.gameLoopId) this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    createPlatform() {
        const platformWidth = this.gameWidth / 6;
        this.platform = {
            x: this.gameWidth / 2 - platformWidth / 2,
            y: this.gameHeight - 20,
            width: platformWidth,
            height: 10,
            color: '#fff',
            speed: 8,
            dx: 0
        };
    }

    createBall() {
        const ballSize = this.gameWidth / 40;
        const ball = {
            x: this.gameWidth / 2,
            y: this.gameHeight - 50,
            size: ballSize,
            speed: 4,
            dx: 4 * (Math.random() > 0.5 ? 1 : -1),
            dy: -4,
            color: '#4CAF50'
        };
        this.balls = [ball];
    }

    createBlocks() {
        const levelConfig = LEVELS[this.currentLevel - 1] || LEVELS[2];
        const rows = levelConfig.rows;
        const cols = levelConfig.cols;
        const blockWidth = this.gameWidth / cols - 10;
        const blockHeight = 20;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (Math.random() > levelConfig.blockDensity) continue;
                this.blocks.push({
                    x: j * (blockWidth + 5) + 5,
                    y: i * (blockHeight + 5) + 50,
                    width: blockWidth,
                    height: blockHeight,
                    color: levelConfig.colors[i % levelConfig.colors.length],
                    health: levelConfig.blockHealth,
                    points: levelConfig.blockPoints,
                    bonus: Math.random() < 0.2 ? this.getRandomBonus() : null
                });
            }
        }
        if (this.blocks.length < rows) this.createBlocks();
    }

    getRandomBonus() {
        const bonuses = ['extend', 'shrink', 'multiball', 'slow', 'fast', 'extraLife'];
        return bonuses[Math.floor(Math.random() * bonuses.length)];
    }

    applyDifficulty() {
        const difficultySettings = {
            easy: { ballSpeed: 3, platformSpeed: 6, ballSize: this.gameWidth / 30, lives: 5 },
            medium: { ballSpeed: 4, platformSpeed: 8, ballSize: this.gameWidth / 40, lives: 3 },
            hard: { ballSpeed: 5, platformSpeed: 10, ballSize: this.gameWidth / 50, lives: 2 }
        };
        const settings = difficultySettings[this.difficulty];
        this.balls.forEach(ball => {
            ball.speed = settings.ballSpeed;
            ball.size = settings.ballSize;
            const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            const scale = settings.ballSpeed / currentSpeed;
            ball.dx *= scale;
            ball.dy *= scale;
        });
        this.platform.speed = settings.platformSpeed;
        this.lives = settings.lives;
    }

    startTimer() {
        this.startTime = Date.now() - this.elapsedTime;
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateTimerDisplay();
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.elapsedTime / 60000);
        const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
        document.getElementById('gameTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    pauseTimer() {
        clearInterval(this.timerInterval);
    }

    resumeTimer() {
        this.startTimer();
    }

    showSettings() {
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('settingsMenu').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsMenu').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    showTutorial() {
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('tutorialMenu').classList.remove('hidden');
    }

    hideTutorial() {
        document.getElementById('tutorialMenu').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    pauseGame() {
        if (this.gameState !== 'playing') return;
        this.gameState = 'paused';
        this.pauseTimer();
        document.getElementById('pauseMenu').classList.remove('hidden');
    }

    resumeGame() {
        if (this.gameState !== 'paused') return;
        this.gameState = 'playing';
        this.resumeTimer();
        document.getElementById('pauseMenu').classList.add('hidden');
    }

    exitToMenu() {
        this.gameState = 'menu';
        this.pauseTimer();
        this.saveStats();
        this.sounds.background.play();
        document.getElementById('gameUI').classList.add('hidden');
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('levelComplete').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('gameOverGif').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    nextLevel() {
        this.currentLevel++;
        document.getElementById('levelComplete').classList.add('hidden');
        this.startLevel();
    }

    async showRandomGif() {
        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${this.giphyApiKey}&tag=sad`);
            if (!response.ok) throw new Error('Failed to fetch GIF');
            const data = await response.json();
            const gifUrl = data.data.images.fixed_height.url;
            const gifElement = document.getElementById('gameOverGif');
            gifElement.src = gifUrl;
            gifElement.classList.remove('hidden');
        } catch (error) {
            console.error('Ошибка получения гифки:', error);
            const gifElement = document.getElementById('gameOverGif');
            gifElement.src = 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExenlleHczMjlqMmV4anNhbXY3bXl3bjdtbzFtN2hybjdtczliZjIzOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OPU6wzx8JrHna/giphy.gif'; // Fallback GIF
            gifElement.classList.remove('hidden');
        }
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.pauseTimer();
        this.sounds.gameOver.play();
        this.sounds.background.stop();
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameUI').classList.add('hidden');
        document.getElementById('gameOver').classList.remove('hidden');
        this.saveStats();
        this.showRandomGif();
    }

    levelComplete() {
        this.gameState = 'levelComplete';
        this.pauseTimer();
        this.sounds.levelComplete.play();
        document.getElementById('levelScore').textContent = this.score;
        document.getElementById('levelTime').textContent = document.getElementById('gameTimer').textContent;
        document.getElementById('gameUI').classList.add('hidden');
        document.getElementById('levelComplete').classList.remove('hidden');
    }

    updateUI() {
        document.getElementById('currentLevel').textContent = this.currentLevel;
        document.getElementById('currentScore').textContent = this.score;
    }

    handleKeyDown(e) {
        if (this.gameState !== 'playing') return;
        if (e.key === 'ArrowLeft' || e.key === 'Left') this.platform.dx = -this.platform.speed;
        else if (e.key === 'ArrowRight' || e.key === 'Right') this.platform.dx = this.platform.speed;
        else if (e.key === 'Escape') this.pauseGame();
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'ArrowRight' || e.key === 'Right') this.platform.dx = 0;
    }

    handleMouseMove(e) {
        if (this.gameState !== 'playing') return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        this.platform.x = mouseX - this.platform.width / 2;
        if (this.platform.x < 0) this.platform.x = 0;
        else if (this.platform.x + this.platform.width > this.gameWidth) this.platform.x = this.gameWidth - this.platform.width;
    }

    handleTouchMove(e) {
        if (this.gameState !== 'playing') return;
        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        this.platform.x = touchX - this.platform.width / 2;
        if (this.platform.x < 0) this.platform.x = 0;
        else if (this.platform.x + this.platform.width > this.gameWidth) this.platform.x = this.gameWidth - this.platform.width;
    }

    createBonus(x, y, type) {
        const bonusSize = this.gameWidth / 30;
        const bonus = { x, y, size: bonusSize, speed: 2, type, color: this.getBonusColor(type) };
        this.bonuses.push(bonus);
    }

    getBonusColor(type) {
        const colors = {
            extend: '#4CAF50', shrink: '#F44336', multiball: '#FFC107',
            slow: '#2196F3', fast: '#9C27B0', extraLife: '#FF5722'
        };
        return colors[type] || '#FFFFFF';
    }

    applyBonus(type) {
        this.activeBonuses.push({ type, time: Date.now() });
        switch (type) {
            case 'extend':
                this.platform.width = Math.min(this.platform.width * 1.5, this.gameWidth / 3);
                setTimeout(() => this.platform.width = this.gameWidth / 6, 10000);
                break;
            case 'shrink':
                this.platform.width = Math.max(this.platform.width * 0.7, this.gameWidth / 10);
                setTimeout(() => this.platform.width = this.gameWidth / 6, 10000);
                break;
            case 'multiball':
                const newBall = {
                    x: this.balls[0].x,
                    y: this.balls[0].y,
                    size: this.balls[0].size,
                    speed: this.balls[0].speed,
                    dx: this.balls[0].dx * (Math.random() > 0.5 ? 1 : -1),
                    dy: this.balls[0].dy,
                    color: this.balls[0].color
                };
                this.balls.push(newBall);
                setTimeout(() => {
                    this.balls = this.balls.slice(0, 1);
                    this.activeBonuses = this.activeBonuses.filter(b => b.type !== type);
                }, 15000);
                break;
            case 'slow':
                this.balls.forEach(ball => {
                    ball.speed *= 0.7;
                    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    const scale = ball.speed / currentSpeed;
                    ball.dx *= scale;
                    ball.dy *= scale;
                });
                setTimeout(() => {
                    this.balls.forEach(ball => {
                        ball.speed /= 0.7;
                        const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                        const scale = ball.speed / currentSpeed;
                        ball.dx *= scale;
                        ball.dy *= scale;
                    });
                }, 8000);
                break;
            case 'fast':
                this.balls.forEach(ball => {
                    ball.speed *= 1.3;
                    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    const scale = ball.speed / currentSpeed;
                    ball.dx *= scale;
                    ball.dy *= scale;
                });
                setTimeout(() => {
                    this.balls.forEach(ball => {
                        ball.speed /= 1.3;
                        const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                        const scale = ball.speed / currentSpeed;
                        ball.dx *= scale;
                        ball.dy *= scale;
                    });
                }, 8000);
                break;
            case 'extraLife':
                this.lives++;
                this.activeBonuses = this.activeBonuses.filter(b => b.type !== type);
                break;
        }
    }

    gameLoop() {
        if (this.gameState === 'playing') this.update();
        this.draw();
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.platform.x += this.platform.dx;
        if (this.platform.x < 0) this.platform.x = 0;
        else if (this.platform.x + this.platform.width > this.gameWidth) this.platform.x = this.gameWidth - this.platform.width;

        let allBallsLost = true;
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            ball.x += ball.dx;
            ball.y += ball.dy;

            if (ball.x + ball.size > this.gameWidth) {
                ball.x = this.gameWidth - ball.size;
                ball.dx *= -1;
                this.sounds.bounce.play();
            } else if (ball.x - ball.size < 0) {
                ball.x = ball.size;
                ball.dx *= -1;
                this.sounds.bounce.play();
            }
            if (ball.y - ball.size < 0) {
                ball.y = ball.size;
                ball.dy *= -1;
                this.sounds.bounce.play();
            }

            if (
                ball.y + ball.size > this.platform.y &&
                ball.y - ball.size < this.platform.y + this.platform.height &&
                ball.x + ball.size > this.platform.x &&
                ball.x - ball.size < this.platform.x + this.platform.width
            ) {
                const hitPosition = (ball.x - (this.platform.x + this.platform.width / 2)) / (this.platform.width / 2);
                const angle = hitPosition * Math.PI / 3;
                const speed = ball.speed;
                ball.dx = speed * Math.sin(angle);
                ball.dy = -speed * Math.cos(angle);
                this.sounds.bounce.play();
                this.platform.color = '#4CAF50';
                setTimeout(() => this.platform.color = '#fff', 100);
            }
            if (ball.y + ball.size > this.gameHeight) {
                this.balls.splice(i, 1);
                continue;
            }
            allBallsLost = false;
        }
        if (allBallsLost) {
            this.lives--;
            if (this.lives <= 0) this.gameOver();
            else this.createBall();
        }

        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            let hit = false;
            for (let j = 0; j < this.balls.length; j++) {
                const ball = this.balls[j];
                if (
                    ball.x + ball.size > block.x &&
                    ball.x - ball.size < block.x + block.width &&
                    ball.y + ball.size > block.y &&
                    ball.y - ball.size < block.y + block.height
                ) {
                    block.health--;
                    if (block.health <= 0) {
                        this.score += block.points;
                        this.updateUI();
                        if (block.bonus) this.createBonus(block.x + block.width / 2, block.y + block.height / 2, block.bonus);
                        this.blocks.splice(i, 1);
                        this.sounds.blockHit.play();
                        if (this.blocks.length === 0) setTimeout(() => this.levelComplete(), 500);
                    } else {
                        block.color = this.darkenColor(block.color, 20);
                        this.sounds.blockHit.play();
                    }
                    const ballCenterX = ball.x;
                    const ballCenterY = ball.y;
                    const blockCenterX = block.x + block.width / 2;
                    const blockCenterY = block.y + block.height / 2;
                    const dx = ballCenterX - blockCenterX;
                    const dy = ballCenterY - blockCenterY;
                    const width = (ball.size + block.width) / 2;
                    const height = (ball.size + block.height) / 2;
                    const crossWidth = width * dy;
                    const crossHeight = height * dx;
                    if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
                        if (crossWidth > crossHeight) ball.dy *= -1;
                        else ball.dx *= -1;
                    }
                    hit = true;
                    break;
                }
            }
            if (hit) break;
        }

        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            bonus.y += bonus.speed;
            if (
                bonus.y + bonus.size > this.platform.y &&
                bonus.y - bonus.size < this.platform.y + this.platform.height &&
                bonus.x + bonus.size > this.platform.x &&
                bonus.x - bonus.size < this.platform.x + this.platform.width
            ) {
                this.applyBonus(bonus.type);
                this.sounds.bonus.play();
                this.bonuses.splice(i, 1);
            }
            if (bonus.y - bonus.size > this.gameHeight) {
                this.bonuses.splice(i, 1);
            }
        }
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (
            0x1000000 +
            (R < 0 ? 0 : R) * 0x10000 +
            (G < 0 ? 0 : G) * 0x100 +
            (B < 0 ? 0 : B)
        ).toString(16).slice(1);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        this.ctx.fillStyle = this.platform.color;
        this.ctx.fillRect(this.platform.x, this.platform.y, this.platform.width, this.platform.height);
        this.balls.forEach(ball => {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            this.ctx.fill();
            this.ctx.closePath();
        });
        this.blocks.forEach(block => {
            this.ctx.fillStyle = block.color;
            this.ctx.fillRect(block.x, block.y, block.width, block.height);
            this.ctx.strokeStyle = '#000';
            this.ctx.strokeRect(block.x, block.y, block.width, block.height);
            if (block.health > 1) {
                this.ctx.fillStyle = '#000';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(block.health.toString(), block.x + block.width / 2, block.y + block.height / 2 + 3);
            }
        });
        this.bonuses.forEach(bonus => {
            this.ctx.fillStyle = bonus.color;
            this.ctx.beginPath();
            this.ctx.arc(bonus.x, bonus.y, bonus.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.closePath();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(bonus.x, bonus.y, bonus.size * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.closePath();
        });
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Жизни: ' + '♥'.repeat(this.lives), 10, 20);
        if (this.score === 50 || this.score === 100 || this.score === 200) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Отличный результат!', this.gameWidth / 2, 30);
        }
    }
}

const LEVELS = [
    { rows: 4, cols: 8, colors: ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3'], blockHealth: 1, blockPoints: 10, blockDensity: 0.8 },
    { rows: 5, cols: 10, colors: ['#E91E63', '#FFC107', '#8BC34A', '#03A9F4', '#9C27B0'], blockHealth: 2, blockPoints: 20, blockDensity: 0.9 },
    { rows: 6, cols: 12, colors: ['#F44336', '#FF9800', '#CDDC39', '#00BCD4', '#673AB7', '#607D8B'], blockHealth: 3, blockPoints: 30, blockDensity: 1.0 }
];

document.addEventListener('DOMContentLoaded', () => new ArkanoidGame());