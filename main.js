// #region set event handlers etc.
"use strict";
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
//window.addEventListener('load', resizeCanvas);
const pressedKeys = new Set();
const isKeyDown = (key) => pressedKeys.has(key);


// #region manifest for progressive web app

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registered:', reg);
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

// #endregion



// #region allows audio to resume when reopened, esp in PWA in iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);
}

let audioOverlay = null;
function showAudioOverlay() {
    if (!audioOverlay) {
        audioOverlay = document.createElement('div');
        audioOverlay.id = 'audio-resume-overlay';
        // Set styles for fullscreen, z-index, background, etc.
        audioOverlay.style.position = 'fixed';
        audioOverlay.style.top = '0';
        audioOverlay.style.left = '0';
        audioOverlay.style.width = '100vw';
        audioOverlay.style.height = '100vh';
        audioOverlay.style.background = 'rgba(0,0,0,0.85)';
        audioOverlay.style.display = 'flex';
        audioOverlay.style.flexDirection = 'column';
        audioOverlay.style.justifyContent = 'center';
        audioOverlay.style.alignItems = 'center';
        audioOverlay.style.zIndex = '9999';
        audioOverlay.innerHTML = '<div style="color: white; font-size: 2em; text-align: center; margin-bottom: 1em;">Audio paused by iOS.<br>Tap anywhere to resume.</div>';
        document.body.appendChild(audioOverlay);
    } else {
        audioOverlay.style.display = 'flex';
    }
}
function hideAudioOverlay() {
    if (audioOverlay) {
        audioOverlay.style.display = 'none';
    }
}

function recreateHowlerAndResume() {
    // Close and delete old Howler context
    try {
        if (Howler.ctx && Howler.ctx.close) {
            Howler.ctx.close();
        }
    } catch (e) {}
    try {
        delete Howler.ctx; Howler._setup();
    } catch (e) {}

    // Recreate Howler instance and sprite player
    window.pacManAudioSprite = new Howl({
        src: [
            'Sounds/pacManAudioSprite.ogg',
            'Sounds/pacManAudioSprite.m4a',
            'Sounds/pacManAudioSprite.mp3',
            'Sounds/pacManAudioSprite.ac3'
        ],
        sprite: {
            die: [0, 1542],
            eatGhost: [3000, 544],
            ghostSiren: [5000, 14442],
            levelcomplete: [21000, 5204],
            munch: [28000, 215],
            pacmanstart: [30000, 4265],
            scared: [36000, 7010]
        }
    });

    window.playIfIdle = createPerSpriteIdlePlayer(window.pacManAudioSprite);
    window.playScared = createRestartableScaredPlayer(window.pacManAudioSprite);

    // Respect mute state
    if (mute) {
        window.pacManAudioSprite.volume(0);
    }

    // Play a silent sound to unlock audio (iOS hack)
    try {
        var ctx = Howler.ctx;
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {}

    hideAudioOverlay();
}

const resumeAudio = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => { if (isIOS()) showAudioOverlay(); });
    } else if (isIOS() && (!Howler.ctx || Howler.ctx.state !== 'running')) {
        showAudioOverlay();
    }
    window.removeEventListener('touchstart', resumeAudio);
    window.removeEventListener('click', resumeAudio);
};

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        if (isIOS()) {
            // Always show overlay after backgrounding on iOS
            showAudioOverlay();
        } else {
            Howler.ctx && Howler.ctx.resume && Howler.ctx.resume().catch(() => {
                window.addEventListener('touchstart', resumeAudio, { once: true });
                window.addEventListener('click', resumeAudio, { once: true });
            });
        }
    }
});

document.addEventListener('click', function overlayTapHandler(e) {
    if (audioOverlay && audioOverlay.style.display === 'flex') {
        recreateHowlerAndResume();
        // Play the 'munch' sound to help unlock audio and give feedback
        try {
            if (window.pacManAudioSprite && typeof window.pacManAudioSprite.play === 'function') {
                window.pacManAudioSprite.play('munch');
            }
        } catch (e) {}
        // After trying to resume, check if audio is unlocked, then hide overlay
        setTimeout(() => {
            if (Howler.ctx && Howler.ctx.state === 'running') {
                hideAudioOverlay();
            }
        }, 100);
    }
}, true);
document.addEventListener('touchstart', function overlayTouchHandler(e) {
    if (audioOverlay && audioOverlay.style.display === 'flex') {
        recreateHowlerAndResume();
        // Play the 'munch' sound to help unlock audio and give feedback
        try {
            if (window.pacManAudioSprite && typeof window.pacManAudioSprite.play === 'function') {
                window.pacManAudioSprite.play('munch');
            }
        } catch (e) {}
        setTimeout(() => {
            if (Howler.ctx && Howler.ctx.state === 'running') {
                hideAudioOverlay();
            }
        }, 100);
    }
}, true);



// #endregion



// #region touch screen event listners

let lastX = null;
let lastY = null;
let accumulatedX = 0;
let accumulatedY = 0;
let startX = 0;
let startY = 0;
let touchStartTime = 0;

const MOVE_THRESHOLD = 15;
const TAP_THRESHOLD = 20;
const TIME_THRESHOLD = 300;

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    touchStartTime = Date.now();
    lastX = startX;
    lastY = startY;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    accumulatedX += currentX - lastX;
    accumulatedY += currentY - lastY;

    if (accumulatedX > MOVE_THRESHOLD) {
        inputBuffer = "right";
        accumulatedX = 0;
    } else if (accumulatedX < -MOVE_THRESHOLD) {
        inputBuffer = "left";
        accumulatedX = 0;
    }

    if (accumulatedY > MOVE_THRESHOLD) {
        inputBuffer = "down";
        accumulatedY = 0;
    } else if (accumulatedY < -MOVE_THRESHOLD) {
        inputBuffer = "up";
        accumulatedY = 0;
    }

    lastX = currentX;
    lastY = currentY;
}, { passive: false });

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const touchDuration = Date.now() - touchStartTime;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (touchDuration < TIME_THRESHOLD && distance < TAP_THRESHOLD) {





        performTouchTap(touch.clientX, touch.clientY);
    }

    lastX = null;
    lastY = null;
    accumulatedX = 0;
    accumulatedY = 0;
}, { passive: false });


// #endregion
// #region keyboard handlers
document.addEventListener('keydown', (e) => {
    pressedKeys.add(e.key);
    // disable arrow keys default behaviour i.e. scrolling the browser window up/down
    switch (e.key) {
        case "ArrowLeft":
            e.preventDefault();
        case "ArrowRight":
            e.preventDefault();
        case "ArrowUp":
            e.preventDefault();
        case "ArrowDown":
            e.preventDefault();
    }
}
);
document.addEventListener('keyup', (e) => pressedKeys.delete(e.key));
// #endregion

let canvas;
let context;
let secondsPassed = 0;
let oldTimeStamp = 0;
document.addEventListener("mousedown", function (e) {
    getMouseClickPosition(canvas, e);
});

// #endregion

// #region gameLoop
function gameLoop(timeStamp) {
    // Calculate how much time has passed
    secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    oldTimeStamp = timeStamp;
    update(secondsPassed);
    // Move forward in time with a maximum amount
    secondsPassed = Math.min(secondsPassed, 0.1);
    draw();
    // Keep requesting new frames
    window.requestAnimationFrame(gameLoop);
}

// #endregion

// #region pre-load images etc and start the gameLoop... (doesn't seem to work with audio so do that in game variables section)
window.onload = init;
function init() {
    // #region Load Images
    let imagesLoaded = 0;
    const numberImages = 11; // Set number of images to load
    walls.src = "GameImages/Walls.png";
    walls.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    ghosts.src = "GameImages/Ghosts.png";
    ghosts.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    pacMen.src = "GameImages/PacMan.png";
    pacMen.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    imgPowerPill.src = "GameImages/PowerPill.png";
    imgPowerPill.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    dot.src = "GameImages/Dot.png";
    dot.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    pacManLogo.src = "GameImages/PacManLogo.png";
    pacManLogo.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {

            createCanvas();
        }
    }
    gameOver.src = "GameImages/gameOver.png";
    gameOver.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    ready.src = "GameImages/ready.png";
    ready.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    controls.src = "GameImages/controls.png";
    controls.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    soundOn.src = "GameImages/soundOn.png";
    soundOn.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    soundOff.src = "GameImages/soundOff.png";
    soundOff.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    // #endregion
}
function createCanvas() {
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeCanvas();
    // Start the first frame request
    window.requestAnimationFrame(gameLoop);
    gameLoad();
}
//   #endregion

// #region classes (cannot reference before declared, hence at the top)

class targetVector {
    direction;
    distance;
    constructor(direction, distance) {
        this.direction = direction;
        this.distance = distance;
    }
    getDirection() {
        return this.direction;
    }
    getDistance() {
        return (this.distance);
    }
    setDirection(direction) {
        this.direction = direction;
    }
    setDistance(distance) {
        this.distance = distance;
    }
}

class cell {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    getX() {
        return (this.x);
    }
    getY() {
        return (this.y);
    }
    setX(x) {
        this.x = x;
    }
    setY(y) {
        this.y = y;
    }
}

// #endregion

// #region game Variables

// Images must pre-loaded in the initialise section above
// #region mazeMap
const mazeMapText = `
2,7,7,7,7,7,7,7,7,7,7,7,7,7,12,7,7,7,7,7,7,7,7,7,7,7,7,7,4
6,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,2,7,4,0,0,2,7,7,4,0,0,6,0,0,2,7,7,4,0,0,2,7,4,0,0,6
6,0,0,3,7,5,0,0,3,7,7,5,0,0,8,0,0,3,7,7,5,0,0,3,7,5,0,0,6
6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,11,7,10,0,0,9,0,0,11,7,7,12,7,7,10,0,0,9,0,0,11,7,10,0,0,6
6,0,0,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,0,0,6
6,0,0,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,0,0,6
3,7,7,7,7,4,0,0,13,7,7,10,0,0,8,0,0,11,7,7,14,0,0,2,7,7,7,7,5
0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0
0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0
7,7,7,7,7,5,0,0,8,0,0,2,7,16,17,18,7,4,0,0,8,0,0,3,7,7,7,7,7
0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0
0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0
7,7,7,7,7,4,0,0,9,0,0,3,7,7,7,7,7,5,0,0,9,0,0,2,7,7,7,7,7
0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0
0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0
2,7,7,7,7,5,0,0,8,0,0,11,7,7,12,7,7,10,0,0,8,0,0,3,7,7,7,7,4
6,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,11,7,4,0,0,11,7,7,10,0,0,8,0,0,11,7,7,10,0,0,2,7,10,0,0,6
6,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,6
6,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,6
13,7,10,0,0,8,0,0,9,0,0,11,7,7,12,7,7,10,0,0,9,0,0,8,0,0,11,7,14
6,0,0,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,0,0,6
6,0,0,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,6,0,0,0,0,0,0,0,6
6,0,0,11,7,7,7,7,15,7,7,10,0,0,8,0,0,11,7,7,15,7,7,7,7,10,0,0,6
6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6
6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6
3,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,5
`;
// Creates a 2D array for the maze map usage: mazeMap[row][column]
const mazeMap = mazeMapText.trim().split('\n').map(line =>
    line.split(',').map(num => parseInt(num))
);
// #endregion
// #region dotMap
const dotMapString =
    "00000000000000000000000000000" +
    "01111111111110011111111111100" +
    "00000010000010010000010000000" +
    "00000010000010010000010000000" +
    "00000010000010010000010000000" +
    "01111111111111111111111111100" +
    "01000010010000000010010000100" +
    "01000010010000000010010000100" +
    "01111110011110011110011111100" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00011110000000000000011110000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "00000010000000000000010000000" +
    "01111111111110011111111111100" +
    "00000010000010010000010000000" +
    "00000010000010010000010000000" +
    "01110011111110011111110011100" +
    "00010010010000000010010010000" +
    "00010010010000000010010010000" +
    "01111110011110011110011111100" +
    "01000000000010010000000000100" +
    "01000000000010010000000000100" +
    "01111111111111111111111111100" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000";

const rows = 32;
const cols = 29;
const dotMap = []; //Master dot map
for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        row.push(dotMapString[index]);
    }
    dotMap.push(row);
}
const currentDotMap = [];
// can't just use currentDotMap = dotMap as this links both by reference, so changing an element in one affects the other
for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        row.push(dotMapString[index]);
    }
    currentDotMap.push(row);
}
// #endregion
// #region images & sprite sheets
const walls = new Image(288, 16);
const ghosts = new Image(1216, 32);
const pacMen = new Image(480, 32);
const imgPowerPill = new Image(128, 32);
const dot = new Image(16, 16);
const pacManLogo = new Image(300, 78);
const gameOver = new Image(176, 27);
const fullScreenLogo = new Image(64, 64);
const controls = new Image(785, 363);
const ready = new Image(139, 27);
const soundOn = new Image(86, 64);
const soundOff = new Image(86, 64);
// #endregion
// #region Sounds

window.pacManAudioSprite = new Howl({
    src: [
        'Sounds/pacManAudioSprite.ogg',
        'Sounds/pacManAudioSprite.m4a',
        'Sounds/pacManAudioSprite.mp3',
        'Sounds/pacManAudioSprite.ac3'
    ],
    sprite: {
        die: [0, 1542],
        eatGhost: [3000, 544],
        ghostSiren: [5000, 14442],
        levelcomplete: [21000, 5204],
        munch: [28000, 215],
        pacmanstart: [30000, 4265],
        scared: [36000, 7010]
    }
});


window.playIfIdle = createPerSpriteIdlePlayer(window.pacManAudioSprite);
window.playScared = createRestartableScaredPlayer(window.pacManAudioSprite);

// #endregion
// #region game characters
const pm = new pacMan(120);
const blinky = new ghost("blinky", 130, "red");
const pinky = new ghost("pinky", 130, "magenta");
const inky = new ghost("inky", 130, "cyan");
const clyde = new ghost("clyde", 130, "orange");
const allGhosts = [blinky, pinky, inky, clyde];
const pp1 = new powerPill(3, 1);
const pp2 = new powerPill(3, 26);
const pp3 = new powerPill(21, 1);
const pp4 = new powerPill(21, 26);
const powerPills = [pp1, pp2, pp3, pp4];

// #endregion
// native size that canvas is drawn
const baseWidth = 524;
const baseHeight = 615;
let developerMode = false;
let scale = 1; // scale that the canvas is drawn. Will change afcter resize
// offset that game is drawn from top-left of canvas
let xOffset = 30;
let yOffset = 15;
let wallTile;
// Native canvas size (based on tile layout)
let pacManAnimateCounter = 0;
let ghostAnimateCounter = 0;
let powerPillAnimateCounter = 0;
let ghostMode;
let ghostsMoving;
let timer = 17; // 17 second chase mode
let frightenedTimer = 0;
let ghostHouseTimer = 10; // time before ghost house opens
let game = 0; // 0=title screen, 1=playing, 2=lose life, 3=game over
let lives;
let collision;
let dieimg = 0;
let readyDisplay;
let readyAnimateCounter;
let gameOverDisplay;
let gameOverAnimateCounter;
let score = 0;
let level = 1;
let dotsLeft;
let mouseX = 0;
let mouseY = 0;
let showTargets = false;
let frightenedCollision;
let ghostsEaten;
let mute;
let drawGrid = false;
let dx;
let ghostFreeze;
let startGameButtonPressed = false;
let scaleX;
let scaleY;
let chompId;
let inputBuffer = "";
let accumulatedTime;
let activeMunchId = null;
let blinkySpawning;
let blinkySpawningTimer;
const blinkySpawnTime = 1.5; // seconds that blinky cannot kill at start of game/level/new life
let munchId;
let startMusicTimer;


// #endregion

// #region gameLoad
function gameLoad() {
    mute = false;
    ghostMode = "chase";
    timer = 17;
    lives = 3;
    score = 0;
    dotsLeft = 240;
    setGhostHouseTimer();
    copyDotMapToCurrent();
    drawGrid = false;
    xOffset = 30;
    yOffset = 15;
    dx = 0;
    ghostFreeze = false;
    game = 0; // title screen
}

// #endregion

// #region update game state
function update(secondsPassed) {
    if (secondsPassed > 0.03) {
        secondsPassed = 0.03;
    }

    switch (game) {
        case 0: // title screen
            timer += secondsPassed;
            powerPills.forEach(pp => pp.setActive(true));
            if (timer > 0.5) {
                if (isKeyDown(' ')) {
                    game = 0.5;
                    startMusicTimer = 0;
                    playIfIdle("pacmanstart");
                    startGame();
                    readyDisplay = false;
                    readyAnimateCounter = 0;
                }
            }
            break;

        case 0.5: // start music
            startMusicTimer += secondsPassed;
            animatePowerPills();
            pacManAnimateCounter += secondsPassed;
            readyAnimateCounter += secondsPassed;
            if (readyAnimateCounter > 0.8) {
                readyAnimateCounter = 0;
                if (readyDisplay == true) {
                    readyDisplay = false;
                } else {
                    readyDisplay = true;
                }
            }

            if (pacManAnimateCounter > 0.1) {
                pacManAnimateCounter = 0;
                pm.advanceFrame();
            }
            if (startMusicTimer > 4.625) {
                game = 1;
                inputBuffer = "";
            }
            break;

        case 1: // game playing
            animatePowerPills();
            setGhostSpeeds();
            timer -= secondsPassed;
            if (timer < 0) {
                if (ghostMode == "chase") {
                    ghostMode = "scatter";
                    allGhosts.forEach(ghost => {
                        if (ghost.getMode() == "chase") {
                            ghost.setMode("scatter");
                        }
                    })
                    timer = 7
                }
                else {
                    ghostMode = "chase";
                    allGhosts.forEach(ghost => {
                        if (ghost.getMode() == "scatter") {
                            ghost.setMode("chase");
                        }
                    })
                    timer = 17;
                }
            }
            frightenedTimer -= secondsPassed;
            if (frightenedTimer < 0 && frightenedTimer > -1) {
                allGhosts.forEach(ghost => {
                    if (ghost.getMode() == "dead") {
                        ghost.resetPosition();
                        if (ghost.getGhostType() == "blinky") {
                            blinkySpawning = true;
                            blinkySpawningTimer = 0;
                        }
                    }
                    ghost.setMoving(true);
                    ghost.setMode("chase");
                })
            }
            ghostHouseTimer -= secondsPassed;
            if (ghostHouseTimer < 0) {
                openGhostHouse();
            }
            blinkySpawningTimer += secondsPassed;
            if (blinkySpawningTimer > blinkySpawnTime) {
                blinkySpawning = false;
            }
            let column = Math.floor(pm.getXpos() / 16);
            let row = Math.floor(pm.getYpos() / 16);
            if (isKeyDown('ArrowRight')) {
                // add direction to buffer. it will be stored for 1 second, unless changed by a different direction.
                inputBuffer = "right"
            }
            if (isKeyDown('ArrowLeft')) {
                inputBuffer = "left"

            }
            if (isKeyDown('ArrowUp')) {
                inputBuffer = "up"

            }
            if (isKeyDown('ArrowDown')) {
                inputBuffer = "down"

            }
            switch (inputBuffer) {
                case "left":
                    leftActions();

                    break;
                case "right":
                    rightActions();


                    break;
                case "up":
                    upActions();

                    break;
                case "down":
                    downActions();

                    break;
                default:
                    break;
            }
            pacManAnimateCounter += secondsPassed;

            if (pacManAnimateCounter > 0.1) {
                pacManAnimateCounter = 0;
                pm.advanceFrame();
            }
            animateGhosts();

            // #region update pacman and ghosts
            let temp;
            pm.update(secondsPassed);
            if (ghostFreeze == false) {

                allGhosts.forEach(ghost => ghost.update(pm.getXpos(), pm.getYpos(), blinky.getxPos(), blinky.getyPos(), pm.getDirection(), secondsPassed));

            }

            // #endregion

            // #region Check for collision with power pill
            powerPills.forEach(pp => {
                if (pp.getActive() == true) {
                    if ((Math.floor(pm.getYpos() / 16) == pp.getRow()) && (Math.floor(pm.getXpos() / 16) == pp.getColumn())) {
                        pp.setActive(false);
                        score += 50;
                        ghostsEaten = 0;
                        playScared();
                        frightenedTimer = 7; // 7 seconds of being frightened

                        openGhostHouse();
                        allGhosts.forEach(ghost => {
                            if (ghost.getMode() != "dead") {
                                ghost.setMode("frightened");
                                ghost.reverseDirection();
                            }

                        })
                    }
                }
            })
            // #endregion

            // #region  pacman collision with ghost

            allGhosts.forEach(ghost => {
                if (ghost.isEnabled() == true) {
                    if ((Math.abs(pm.getXpos() - ghost.getxPos()) < 24) && (Math.abs(pm.getYpos() - ghost.getyPos()) < 24)) {
                        switch (ghost.getMode()) {
                            case "frightened":
                                ghost.setMode("dead");
                                pacManAudioSprite.play("eatGhost");
                                ghostsEaten += 1;
                                switch (ghostsEaten) {
                                    case 1:
                                        score += 200;
                                        break;
                                    case 2:
                                        score += 400;
                                        break;
                                    case 3:
                                        score += 800;
                                        break;
                                    case 4:
                                        score += 1600;
                                        break;
                                }
                                break;

                            case "dead":

                                break;

                            default:
                                if (ghost.getGhostType() == "blinky" && blinkySpawning == true) {

                                } else {
                                    lives -= 1;
                                    allGhosts.forEach(ghost => {
                                        ghost.setEnabled(false);
                                    })
                                    game = 2;// lose life state
                                    pacManAnimateCounter = 0;
                                    collision = false;
                                    frightenedCollision = false;
                                    dieimg = 0;
                                    closeGhostHouse();
                                    setGhostHouseTimer();
                                    pacManAudioSprite.stop();
                                    playIfIdle("die");
                                }
                        }
                    }
                }
            })

            // #endregion

            // #region Check for collision with dots
            if (currentDotMap[Math.floor(pm.getYpos() / 16)][Math.floor(pm.getXpos() / 16)] == 1) {
                currentDotMap[Math.floor(pm.getYpos() / 16)][Math.floor(pm.getXpos() / 16)] = 0;
                score += 10;
                dotsLeft -= 1;

                if (dotsLeft == 120) {
                    if (level < 5) {
                        playIfIdle("ghostSiren", { loop: true });
                    }
                }
                playMunch();
            }
            // #endregion

            // #region Check if level complete
            if (dotsLeft == 0) {
                level += 1;
                dotsLeft = 240;
                pm.resetPosition();
                allGhosts.forEach(ghost => {
                    ghost.setEnabled(true);
                    ghost.resetPosition();
                    ghost.setMoving(true);
                })
                copyDotMapToCurrent();
                setGhostHouseTimer();
                closeGhostHouse();
                blinkySpawning = true;
                blinkySpawningTimer = 0;
                powerPills.forEach(pp => pp.setActive(true));
                pacManAudioSprite.stop();
                playIfIdle("levelcomplete");
            }
            // #endregion
            break;

        case 2: // lose life
            animatePowerPills();
            pacManAnimateCounter += 1;
            if (pacManAnimateCounter == 20) {
                pacManAnimateCounter = 0;
                dieimg += 1;
                if (dieimg == 4) {
                    dieimg = 1;
                    if (lives == 0) {
                        game = 3; //game over state
                        gameOverDisplay = false;
                        gameOverAnimateCounter = 0;
                        accumulatedTime = 0;


                    } else {
                        game = 1; // playing state
                        allGhosts.forEach(ghost => {
                            ghost.setEnabled(true);
                            ghost.resetPosition();
                        })
                        pm.resetPosition();
                        inputBuffer = "";
                        setGhostHouseTimer();
                        blinkySpawning = true;
                        blinkySpawningTimer = 0;
                        if (dotsLeft < 120) {
                            if (level < 5) {
                                playIfIdle("ghostSiren", { loop: true });
                            }
                        }
                    }
                }
            }
            break;
        case 3: // game over
            animatePowerPills();
            gameOverAnimateCounter += secondsPassed;
            accumulatedTime += secondsPassed;
            if (gameOverAnimateCounter > 0.8) {
                gameOverAnimateCounter = 0;
                if (gameOverDisplay == true) {
                    gameOverDisplay = false;
                } else {
                    gameOverDisplay = true;
                }
            }
            if (isKeyDown(' ') || accumulatedTime > 15) {
                endGame();
            }

            break;
    }
    checkMouseClickButtons();
}
// #endregion

// #region draw Each Frame to Canvas
function draw() {

    context.clearRect(0, 0, baseWidth, baseHeight);
    if (game == 0) {
        context.fillStyle = "#000000";
    } else {
        if (drawGrid == true) {
            context.fillStyle = "#000000";
        } else {
            context.fillStyle = "#000000";
        }
    }
    context.fillRect(0, 0, baseWidth, baseHeight);

    switch (game) {
        case 0:  // title screen
            animateGhosts();
            dx = dx + 2 * Math.PI / 180;
            if (dx > 2 * Math.PI) {
                dx = 0;
            }
            // #region display ghosts
            allGhosts.forEach(ghost => ghost.setEnabled(true));
            if (10 * Math.sin(dx) < 0) {
                blinky.setDirection("left");
            } else {
                blinky.setDirection("right");
            }
            blinky.setX(60 + 10 * Math.sin(dx));
            blinky.setY(160);
            if (10 * Math.sin(dx + Math.PI / 2) < 0) {
                pinky.setDirection("left");
            } else {
                pinky.setDirection("right");
            }
            pinky.setX(60 + 10 * Math.sin(dx + Math.PI / 2));
            pinky.setY(210);
            if (10 * Math.sin(dx + Math.PI) < 0) {
                inky.setDirection("left");
            } else {
                inky.setDirection("right");
            }
            inky.setX(60 + 10 * Math.sin(dx + Math.PI));
            inky.setY(260);
            if (10 * Math.sin(dx + Math.PI * 3 / 2) < 0) {
                clyde.setDirection("left");
            } else {
                clyde.setDirection("right");
            }
            clyde.setX(60 + 10 * Math.sin(dx + Math.PI * 3 / 2));
            clyde.setY(310);
            pm.setXpos(300);
            pm.setYpos(300);

            // #endregion
            context.drawImage(pacManLogo, 0, 0, 300, 78, xOffset + 85, yOffset + 15, 300, 78);
            context.drawImage(controls, 0, 0, 785, 363, xOffset + 160 - xOffset, yOffset + 370, 196, 91);
            context.font = "bold 16px Courier New";
            context.fillStyle = "white";
            drawCentredText(context, "tap or space to start", yOffset + 480);
            context.fillStyle = "yellow";
            drawCentredText(context, "a javaScript game by Neil Kendall 2025", yOffset + 570);
            context.font = "20px Arial";
            context.fillStyle = "white";
            context.fillText("CHARACTER   /   NICKNAME", xOffset + 110, yOffset + 135);
            context.fillStyle = "red";
            context.fillText('- SHADOW             "BLINKY"', xOffset + 110, yOffset + 185);
            context.fillStyle = "magenta";
            context.fillText('- SPEEDY               "PINKY"', xOffset + 110, yOffset + 235);
            context.fillStyle = "cyan";
            context.fillText('- BASHFUL             "INKY"', xOffset + 110, yOffset + 285);
            context.fillStyle = "orange";
            context.fillText('- POKEY                 "CLYDE"', xOffset + 110, yOffset + 335);
            drawGhosts();
            if (mute == false) {
                context.drawImage(soundOn, 0, 0, 86, 64, xOffset + 205, yOffset + 495, 43, 32);
            } else {
                context.drawImage(soundOff, 0, 0, 86, 64, xOffset + 205, yOffset + 495, 43, 32);
            }
            break;
        case 0.5: // start music
            drawBackGrid();
            drawMaze();
            drawDots();
            drawPowerPills();
            drawLivesScoreLevel();
            drawPacMan();
            if (readyDisplay == true) {
                context.drawImage(ready, 0, 0, 139, 27, xOffset + 164, yOffset + 275, 139, 27);
            }
            break;
        case 1:  // game playing
            drawBackGrid();
            drawMaze();
            drawDots();
            drawPowerPills();
            drawLivesScoreLevel();
            drawPacMan();
            drawGhosts();
            break;
        case 2:  // lose life
            drawBackGrid();
            drawMaze();
            drawDots();
            drawPowerPills();
            drawLivesScoreLevel();
            drawGhosts();
            context.drawImage(pacMen, (12 + dieimg) * 32, 0, 32, 32, xOffset + pm.getXpos(), yOffset + pm.getYpos(), 32, 32)
            break;
        case 3:  // game over
            drawBackGrid();
            drawMaze();
            drawDots();
            drawPowerPills();
            drawLivesScoreLevel();
            drawGhosts();
            if (gameOverDisplay == true) {
                context.drawImage(gameOver, 0, 0, 176, 27, xOffset + 144, yOffset + 275, 176, 27);
            }
            break;
    }
}
// #endregion

// #region other methods

function getDotValue(dotMap, row, col) {
    const index = row * 29 + col;
    return dotMap[index];
}

function openGhostHouse() {
    mazeMap[13][13] = 0;
    mazeMap[13][14] = 0;
    mazeMap[13][15] = 0;
}

function closeGhostHouse() {
    mazeMap[13][13] = 16;
    mazeMap[13][14] = 17;
    mazeMap[13][15] = 18;
}

function drawLivesScoreLevel() {
    for (let index = 0; index < lives; index++) {
        context.drawImage(pacMen, 0, 0, 32, 32, xOffset + 8 + index * 32, yOffset + 34 * 16, 32, 32)
    }
    context.font = "20px Arial";
    context.fillStyle = "white";
    context.fillText("SCORE " + score.toLocaleString(), xOffset + 10, yOffset + 535);
    context.fillText("LEVEL " + level, xOffset + 370, yOffset + 535);
    context.font = "15px Arial";
    if (mute == false) {
        context.drawImage(soundOn, 0, 0, 86, 64, xOffset + 315, yOffset + 512, 43, 32);
    } else {
        context.drawImage(soundOff, 0, 0, 86, 64, xOffset + 315, yOffset + 512, 43, 32);
    }



    if (developerMode == true) {

        context.fillText("SHOW GHOST TARGETS", xOffset + 250, yOffset + 563);
        context.fillStyle = "yellow";
        context.fillRect(xOffset + 435, yOffset + 550, 16, 16); // Add a rectangle to the current path
        if (showTargets == true) {
            context.fillStyle = "red";
        } else {
            context.fillStyle = "black";

        }
        context.fillRect(xOffset + 437, yOffset + 552, 12, 12); // Add a rectangle to the current path 

        context.font = "15px Arial";
        context.fillStyle = "white";
        context.fillText("SHOW GRID", xOffset + 340, yOffset + 584);
        context.fillStyle = "yellow";
        context.fillRect(xOffset + 435, yOffset + 571, 16, 16); // Add a rectangle to the current path
        if (drawGrid == true) {
            context.fillStyle = "red";
        } else {
            context.fillStyle = "black";

        }
        context.fillRect(xOffset + 437, yOffset + 573, 12, 12); // Add a rectangle to the current path 

        context.font = "15px Arial";
        context.fillStyle = "white";
        context.fillText("FREEZE GHOSTS", xOffset + 170, yOffset + 584);
        context.fillStyle = "yellow";
        context.fillRect(xOffset + 305, yOffset + 571, 16, 16); // Add a rectangle to the current path
        if (ghostFreeze == true) {
            context.fillStyle = "red";
        } else {
            context.fillStyle = "black";
        }
        context.fillRect(xOffset + 307, yOffset + 573, 12, 12); // Add a rectangle to the current path 

    }

}

// copy dot map into the current dot map
function copyDotMapToCurrent() {
    const rows = 32;
    const cols = 29;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            currentDotMap[r][c] = dotMap[r][c];
        }
    }
}

function getMouseClickPosition(canvas, event) {
    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    mouseX = x / scale;
    mouseY = y / scale;
}


function toggleShowGhostTargets() {
    if (showTargets == true) {
        showTargets = false;
    } else {
        showTargets = true;
    }
    mouseX = 0;
    mouseY = 0;
}

function toggleMute() {
    if (mute == true) {
        mute = false;
        pacManAudioSprite.volume(1);
    } else {
        mute = true;
        pacManAudioSprite.volume(0);
    }
    mouseX = 0;
    mouseY = 0;
}

function toggleGrid() {
    if (drawGrid == true) {
        drawGrid = false;
    } else {
        drawGrid = true;
    }
    mouseX = 0;
    mouseY = 0;
}

function toggleGhostFreeze() {
    if (ghostFreeze == true) {
        ghostFreeze = false;

    } else {
        ghostFreeze = true;

    }

    mouseX = 0;
    mouseY = 0;
}

function setGhostSpeeds() {
    if (level == 1) {
        allGhosts.forEach(ghost => {
            ghost.setSpeed(100);
        })
    }
    if (level == 2) {
        allGhosts.forEach(ghost => {
            ghost.setSpeed(100);
        })
        blinky.setSpeed(130);
    }
    if (level == 3) {
        allGhosts.forEach(ghost => {
            ghost.setSpeed(100);
        })
        blinky.setSpeed(135);
        inky.setSpeed(135);
    }
    if (level == 4) {
        allGhosts.forEach(ghost => {
            ghost.setSpeed(110);
        })
        blinky.setSpeed(135);
        inky.setSpeed(135);
        clyde.setSpeed(135);
    }
    if (level > 4 || dotsLeft < 51) {
        allGhosts.forEach(ghost => {
            ghost.setSpeed(135);
        })
    }
    allGhosts.forEach(ghost => {
        if (ghost.getMode() == "dead") {
            ghost.setSpeed(400);
        }
    })
}

function drawMaze() {
    for (let row = 0; row < 32; row++) {
        for (let column = 0; column < 29; column++) {
            wallTile = mazeMap[row][column]
            if (wallTile != 0) {
                context.drawImage(walls, (wallTile - 1) * 16, 0, 16, 16, xOffset + column * 16, yOffset + row * 16, 16, 16);
            }
        }
    }
}

function drawDots() {
    for (let row = 0; row < 32; row++) {
        for (let column = 0; column < 29; column++) {
            if (currentDotMap[row][column] == 1) {
                context.drawImage(dot, 0, 0, 16, 16, xOffset + column * 16, yOffset + row * 16, 16, 16);
            }
        }
    }
}

function drawPowerPills() {
    powerPills.forEach(pp => {
        if (pp.getActive() == true) {
            context.drawImage(imgPowerPill, pp.getFrame() * 32, 0, 32, 32, xOffset + pp.getColumn() * 16, yOffset + pp.getRow() * 16, 32, 32)
        }

    })
}

function drawPacMan() {
    const fadeZone = 72; // Distance (in pixels) from tunnel to start fade
    let alpha = 1;
    // Check if pacman is on tunnel row
    if (Math.floor(pm.getYpos() / 16) === 14) {
        const leftThreshold = 16; // Column 0
        const rightThreshold = 426;
        if (pm.getXpos() <= leftThreshold + fadeZone) {
            alpha = (pm.getXpos() - leftThreshold) / fadeZone;
        } else if (pm.getXpos() >= rightThreshold - fadeZone) {
            alpha = (rightThreshold + 16 - pm.getXpos()) / fadeZone;
        }
        alpha = Math.max(0, Math.min(1, alpha)); // Clamp between 0 and 1
    }
    // Apply alpha to drawing
    context.save();
    context.globalAlpha = alpha;
    context.drawImage(pacMen, pm.getImageFrame() * 32, 0, 32, 32, xOffset + pm.getXpos(), yOffset + pm.getYpos(), 32, 32);
    context.restore();
}

function drawGhosts() {
    let targetBoxX;
    let targetBoxY;
    allGhosts.forEach(ghost => {
        const fadeZone = 72; // Distance (in pixels) from tunnel to start fade
        let alpha = 1;
        switch (ghost.getGhostType()) {
            case "blinky":
                targetBoxX = 0;
                targetBoxY = 0;
                break;
            case "pinky":
                targetBoxX = 0;
                targetBoxY = 8;
                break;
            case "inky":
                targetBoxX = 8;
                targetBoxY = 0;
                break;
            case "clyde":
                targetBoxX = 8;
                targetBoxY = 8;
                break;
        }
        if (ghost.isEnabled() == true) {
            // Check if ghost is on tunnel row
            if (Math.floor(ghost.getyPos() / 16) === 14) {
                const leftThreshold = 16; // Column 0
                const rightThreshold = 426;
                if (ghost.getxPos() <= leftThreshold + fadeZone) {
                    alpha = (ghost.getxPos() - leftThreshold) / fadeZone;
                } else if (ghost.getxPos() >= rightThreshold - fadeZone) {
                    alpha = (rightThreshold + 16 - ghost.getxPos()) / fadeZone;
                }

                alpha = Math.max(0, Math.min(1, alpha)); // Clamp between 0 and 1
            }
            if (ghost.getGhostType() == "blinky" && blinkySpawning == true) {
                alpha = blinkySpawningTimer / blinkySpawnTime;
            }
            // Apply alpha to drawing
            context.save();
            context.globalAlpha = alpha;
            context.drawImage(ghosts, ghost.getImagePosition() * 32, 0, 32, 32, xOffset + ghost.getxPos(), yOffset + ghost.getyPos(), 32, 32); // Your ghost rendering code
            context.restore();

            // blink ghost with original colour if close to turning back to chase mode from frightened
            if (ghost.getMode() == "frightened" && frightenedTimer < 2 && ghost.getImagePosition() == 32) {
                switch (ghost.getGhostType()) {
                    case "blinky":
                        context.drawImage(ghosts, (ghost.getImagePosition() - 32) * 32, 0, 32, 32, xOffset + ghost.getxPos(), yOffset + ghost.getyPos(), 32, 32);
                        break;
                    case "pinky":
                        context.drawImage(ghosts, (ghost.getImagePosition() - 8) * 32, 0, 32, 32, xOffset + ghost.getxPos(), yOffset + ghost.getyPos(), 32, 32);
                        break;
                    case "inky":
                        context.drawImage(ghosts, (ghost.getImagePosition() - 16) * 32, 0, 32, 32, xOffset + ghost.getxPos(), yOffset + ghost.getyPos(), 32, 32);
                        break;
                    case "clyde":
                        context.drawImage(ghosts, (ghost.getImagePosition() - 24) * 32, 0, 32, 32, xOffset + ghost.getxPos(), yOffset + ghost.getyPos(), 32, 32);
                        break;
                    default:
                        break;
                }
            }
            if ((showTargets == true) && (game == 1)) {
                context.fillStyle = ghost.getColour();
                context.fillRect(xOffset + ghost.calculateTargetCell(pm.getXpos(), pm.getYpos(), blinky.getxPos(), blinky.getyPos(), pm.getDirection()).getX() * 16 + targetBoxX, yOffset + ghost.calculateTargetCell(pm.getXpos(), pm.getYpos(), blinky.getxPos(), blinky.getyPos(), pm.getDirection()).getY() * 16 + targetBoxY, 8, 8);

            }
        }
    })
}

function drawBackGrid() {
    if (drawGrid == true) {
        for (let row = 0; row < 32; row++) {
            context.font = "10px Courier New";
            context.fillStyle = "yellow";
            context.fillText(row, xOffset - 20, yOffset + 10 + row * 16);
        }
        for (let column = 0; column < 29; column++) {
            context.font = "10px Courier New";
            context.fillStyle = "yellow";
            context.fillText(column, xOffset + + column * 16, yOffset - 3);
        }
        for (let row = 0; row < 32; row++) {
            for (let column = 0; column < 29; column++) {
                context.fillStyle = "black";
                context.fillRect(xOffset + column * 16, yOffset + row * 16, 16, 16);
                context.fillStyle = "grey";
                context.fillRect(xOffset + column * 16 + 1, yOffset + row * 16 + 1, 14, 14);
            }
        }
    }
}

function animatePowerPills() {
    powerPillAnimateCounter += secondsPassed;
    if (powerPillAnimateCounter > 0.08) {
        powerPillAnimateCounter = 0;
        powerPills.forEach(pp => {
            pp.advanceFrame();
        })
    }
}

function checkMouseClickButtons() {

    if (game == 1 || game == 3 || game == 0.5 || game == 2) {
        // these check the developer buttons (not displayed by default)
        if (mouseX > xOffset + 315 && mouseX < xOffset + 358 && mouseY > yOffset + 512 && mouseY < yOffset + 544) {
            toggleMute();
        }

        if (developerMode == true) {
            if (mouseX > xOffset + 436 && mouseX < xOffset + 450 && mouseY > yOffset + 551 && mouseY < yOffset + 565) {
                toggleShowGhostTargets();
            }

            if (mouseX > xOffset + 436 && mouseX < xOffset + 450 && mouseY > yOffset + 571 && mouseY < yOffset + 585) {
                toggleGrid();
            }
            if (mouseX > xOffset + 306 && mouseX < xOffset + 320 && mouseY > yOffset + 571 && mouseY < yOffset + 585) {
                toggleGhostFreeze();
            }
        }
    }

    if (game == 0) {
        // these check the developer buttons (not displayed by default)
        if (mouseX > xOffset + 205 && mouseX < xOffset + 248 && mouseY > yOffset + 495 && mouseY < yOffset + 527) {
            toggleMute();
        }

    }

}

function animateGhosts() {
    ghostAnimateCounter += secondsPassed;
    if (ghostAnimateCounter > 0.2) {
        ghostAnimateCounter = 0;
        allGhosts.forEach(ghost => {
            ghost.advanceFrame();
        })
    }
}

function setGhostHouseTimer() {
    if (level == 1) {
        ghostHouseTimer = 10;
    }
    if (level == 2) {
        ghostHouseTimer = 5;
    }
    if (level > 2) {
        ghostHouseTimer = 2;
    }
}

function resizeCanvas() {

    const gameWidth = canvas.width;
    const gameHeight = canvas.height;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / gameWidth;
    const scaleY = windowHeight / gameHeight;
    scale = Math.min(scaleX, scaleY); // note, not using let or const gives scale global scope (oops!)

    canvas.style.transform = `scale(${scale})`;
    canvas.style.position = 'absolute';
    canvas.style.left = `${(windowWidth - gameWidth * scale) / 2}px`;
    canvas.style.top = `${(windowHeight - gameHeight * scale) / 2}px`;
}

function performTouchTap(x, y) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = (x - rect.left) / scale;
    let mouseY = (y - rect.top) / scale;
    switch (game) {
        case 0:
            if (mouseX > xOffset + 205 && mouseX < xOffset + 248 && mouseY > yOffset + 495 && mouseY < yOffset + 527) {
                toggleMute();
            } else {
                game = 0.5;
                startMusicTimer = 0;
                playIfIdle("pacmanstart");
                startGame();
                readyDisplay = false;
                readyAnimateCounter = 0;
            }
            break;
        case 0.5:
            if (mouseX > xOffset + 315 && mouseX < xOffset + 358 && mouseY > yOffset + 512 && mouseY < yOffset + 544) {
                toggleMute();
            }
            break;
        case 1:
            if (mouseX > xOffset + 315 && mouseX < xOffset + 358 && mouseY > yOffset + 512 && mouseY < yOffset + 544) {
                toggleMute();
            }
            break;
        case 2:
            if (mouseX > xOffset + 315 && mouseX < xOffset + 358 && mouseY > yOffset + 512 && mouseY < yOffset + 544) {
                toggleMute();
            }
            break;
        case 3:
            if (mouseX > xOffset + 315 && mouseX < xOffset + 358 && mouseY > yOffset + 512 && mouseY < yOffset + 544) {
                toggleMute();
            } else {
                endGame();
            }
            break;
        default:
            break;
    }
}

function rightActions() {
    if (pm.getStartFreeze() == true) {
        pm.setStartFreeze(false);
        pm.setDirection("right");
        pm.setMoving(true);

    } else {
        if (pm.getDirection() != "right") {
            let column = Math.floor(pm.getXpos() / 16);
            let row = Math.floor(pm.getYpos() / 16);

            if (pm.isMoving() == true && pm.getDirection == "left") {
                pm.setDirection("right");
                return;
            }
            if (pm.isCloseToIntersection() == true) {
                if (mazeMap[row][column + 2] == 0 && mazeMap[row + 1][column + 2] == 0) {
                    pm.setDirection("right");
                    pm.snapToGrid();
                    pm.setMoving(true);

                }
            }
        }
    }
}
function leftActions() {
    if (pm.getStartFreeze() == true) {
        pm.setStartFreeze(false);
        pm.setDirection("left");
        pm.setMoving(true);

    } else {

        if (pm.getDirection() != "left") {
            let column = Math.floor(pm.getXpos() / 16);
            let row = Math.floor(pm.getYpos() / 16);
            if (pm.isMoving() == true && pm.getDirection == "right") {
                pm.setDirection("left");
                return;
            }

            if (pm.isCloseToIntersection() == true) {

                if (mazeMap[row][column - 1] == 0 && mazeMap[row + 1][column - 1] == 0) {
                    pm.setDirection("left");
                    pm.snapToGrid();
                    pm.setMoving(true);

                }
            }
        }
    }
}
function upActions() {
    if (pm.getDirection() != "up") {
        let column = Math.floor(pm.getXpos() / 16);
        let row = Math.floor(pm.getYpos() / 16);
        if (pm.isMoving() == true && pm.getDirection == "down") {
            pm.setDirection("up");
            return;
        }
        if (pm.isCloseToIntersection() == true) {
            if (mazeMap[row - 1][column] == 0 && mazeMap[row - 1][column + 1] == 0) {
                pm.setDirection("up");
                pm.snapToGrid();
                pm.setMoving(true);
            }
        }
    }
}
function downActions() {
    if (pm.getDirection() != "down") {
        let column = Math.floor(pm.getXpos() / 16);
        let row = Math.floor(pm.getYpos() / 16);
        if (pm.isMoving() == true && pm.getDirection == "up") {
            pm.setDirection("down");
            return;
        }
        if (pm.isCloseToIntersection() == true) {
            if (mazeMap[row + 2][column] == 0 && mazeMap[row + 2][column + 1] == 0) {
                pm.setDirection("down");
                pm.snapToGrid();
                pm.setMoving(true);
            }
        }
    }
}

function createIdleSpritePlayer(howlInstance) {
    let activeId = null;

    return function playIfIdle(spriteName, options = {}) {
        const isLoop = !!options.loop;

        // Only play if the current sprite isn't playing
        if (!activeId || !howlInstance.playing(activeId)) {
            activeId = howlInstance.play(spriteName);

            // Track end only if not looping
            if (!isLoop) {
                howlInstance.once('end', (id) => {
                    if (id === activeId) activeId = null;
                });
            }

            // Apply optional controls
            if (options.volume !== undefined) {
                howlInstance.volume(options.volume, activeId);
            }
            if (options.rate !== undefined) {
                howlInstance.rate(options.rate, activeId);
            }
            if (options.loop !== undefined) {
                howlInstance.loop(options.loop, activeId);
            }
        }

        return activeId;
    };
}

function createSpriteManager(howlInstance) {
    let activeId = null;

    return function playUniqueSprite(spriteName, options = {}) {
        // Stop the previous sprite if it's still playing
        if (activeId && howlInstance.playing(activeId)) {
            howlInstance.stop(activeId);
        }

        // Play the new sprite and store the ID
        activeId = howlInstance.play(spriteName);

        // Optional hook: on end, clear the activeId
        howlInstance.once('end', (id) => {
            if (id === activeId) {
                activeId = null;
            }
        });

        // Support extras like volume, rate, etc.
        if (options.volume !== undefined) {
            howlInstance.volume(options.volume, activeId);
        }
        if (options.rate !== undefined) {
            howlInstance.rate(options.rate, activeId);
        }

        return activeId;
    };
}

function startGame() {
    ghostMode = "chase";
    allGhosts.forEach(ghost => {
        ghost.setEnabled(true);
        ghost.resetPosition();
        ghost.setMoving(true);
    })
    lives = 3;
    ghostsMoving = true;
    timer = 17;
    pm.resetPosition();
    score = 0;
    level = 1;
    dotsLeft = 240;
    copyDotMapToCurrent();
    powerPills.forEach(pp => pp.setActive(true));
    setGhostHouseTimer();
    closeGhostHouse();
    startGameButtonPressed = false;
    blinkySpawning = true;
    blinkySpawningTimer = 0;
}

function endGame() {
    game = 0;
    inputBuffer = "";
    timer = 0;
    ghostFreeze = false;
    drawGrid = false;
    showTargets = false;
    startGameButtonPressed = false;
}

// this functions stops too many munces playing at once, which can cause overload in the browser
function playMunch() {
    if (chompId !== undefined) {
        pacManAudioSprite.stop(chompId);
    }
    chompId = pacManAudioSprite.play('munch');
}

function createPerSpriteIdlePlayer(howlInstance) {
    const activeIds = {};

    return function playIfIdle(spriteName, options = {}) {
        const currentId = activeIds[spriteName];

        if (!currentId || !howlInstance.playing(currentId)) {
            const newId = howlInstance.play(spriteName);
            activeIds[spriteName] = newId;

            // Set loop if specified
            if (options.loop !== undefined) {
                howlInstance.loop(options.loop, newId);
            }

            // Set volume if specified
            if (options.volume !== undefined) {
                howlInstance.volume(options.volume, newId);
            }

            // Set rate if specified
            if (options.rate !== undefined) {
                howlInstance.rate(options.rate, newId);
            }

            // Clear tracking when sound ends (if not looping)
            if (!options.loop) {
                howlInstance.once('end', (id) => {
                    if (activeIds[spriteName] === id) {
                        delete activeIds[spriteName];
                    }
                });
            }

            return newId;
        }

        return null;
    };
}

function createRestartableScaredPlayer(howlInstance) {
    const spriteName = 'scared';
    const spriteDuration = 7010; // using the native value

    let activeId = null;
    let timer = null;

    return function playOrRestartScared() {
        if (activeId && howlInstance.playing(activeId)) {
            howlInstance.stop(activeId);
        }

        activeId = howlInstance.play(spriteName);

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            howlInstance.stop(activeId);
            activeId = null;
        }, spriteDuration);
    };
}

function drawCentredText(ctx, textString, y) {
    let textWidth = ctx.measureText(textString).width;
    ctx.fillText(textString, (baseWidth / 2) - (textWidth / 2), y);
}

// #endregion
