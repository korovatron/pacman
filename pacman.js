class pacMan {
    xPos;
    yPos;
    direction;
    moving;
    frame;
    startFreeze;  // indicates if pacman is frozen at start of game / level so that a left/right key will start him moving
    speed;

    constructor(speed) {
        this.speed = speed;
        this.xPos = 13 * 16;
        this.yPos = 23 * 16;
        this.direction = "right";
        this.moving = false;
        this.frame = 0;
        this.startFreeze = true;
    }

    getStartFreeze() {
        return this.startFreeze;
    }

    setStartFreeze(vl) {
        this.startFreeze = vl;
    }

    getXpos() {
        return this.xPos;
    }

    getYpos() {
        return this.yPos;
    }

    getImageFrame() {
        if (this.direction == "right") {
            return this.frame;
        }
        if (this.direction == "left") {
            return 6 + this.frame;
        }
        if (this.direction == "up") {
            return 3 + this.frame;
        }
        if (this.direction == "down") {
            return 9 + this.frame;
        }
    }

    advanceFrame() {
        this.frame = this.frame + 1;
        if (this.frame == 3) {
            this.frame = 0;
        }
    }

    resetPosition() {
        this.xPos = 13 * 16;
        this.yPos = 23 * 16;
        this.direction = "right";
        this.moving = false;
        this.frame = 0;
        this.startFreeze = true;
    }

    getDirection() {
        return this.direction;
    }

    setDirection(dr) {
        this.direction = dr;
    }

    isMoving() {
        return this.moving;
    }

    setMoving(mv) {
        this.moving = mv;
    }

    update(delta) {

        let row = Math.floor(this.yPos / 16);
        let column = Math.floor(this.xPos / 16);
        if (this.direction == "left") {
            if (this.isCloseToIntersection() == true) {
                if (mazeMap[row][column - 1] != 0 || mazeMap[row + 1][column - 1] != 0) {
                    this.moving = false;
                    this.snapToGrid();
                }
            }
            if (this.moving == true) {
                this.xPos -= this.speed * delta;
                if (this.xPos < 5) {
                    this.xPos = 27 * 16;
                }
            }
        }

        if (this.direction == "right") {
            if (this.isCloseToIntersection() == true) {
                if (mazeMap[row][column + 2] != 0 || mazeMap[row + 1][column + 2] != 0) {
                    this.moving = false;
                    this.snapToGrid();
                }
            }
            if (this.moving == true) {
                this.xPos += this.speed * delta;
                if (this.xPos > 26 * 16 + 12) {
                    this.xPos = 16;
                }
            }
        }

        if (this.direction == "up") {
            if (this.isCloseToIntersection() == true) {
                if (mazeMap[row - 1][column] != 0 || mazeMap[row - 1][column + 1] != 0) {
                    this.moving = false;
                    this.snapToGrid();
                }
            }
            if (this.moving == true) {
                this.yPos -= this.speed * delta;

            }
        }

        if (this.direction == "down") {
            if (this.isCloseToIntersection() == true) {
                if (mazeMap[row + 2][column] != 0 || mazeMap[row + 2][column + 1] != 0) {
                    this.moving = false;
                    this.snapToGrid();
                }
            }
            if (this.moving == true) {
                this.yPos += this.speed * delta;

            }
        }
    }

    setXpos(x) {
        this.xPos = x;
    }

    setYpos(y) {
        this.yPos = y;
    }

    snapToGrid() {
        this.xPos = Math.floor(this.xPos / 16) * 16;
        this.yPos = Math.floor(this.yPos / 16) * 16;
    }

    isCloseToIntersection() {

        let dx = Math.abs((Math.floor(this.xPos / 16)) * 16 - Math.floor(this.xPos))
        let dy = Math.abs((Math.floor(this.yPos / 16)) * 16 - Math.floor(this.yPos))
        // debugger;
        if (dx < 5 && dy < 5) {
            return true;
        } else {
            return false;
        }
    }
}
