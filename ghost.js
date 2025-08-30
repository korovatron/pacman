class ghost {
    xPos;
    yPos;
    direction;
    moving;
    frame;
    ghostType;
    mode; // 0 = chase, 1 = scatter, 2 = frightened, 3 = dead
    speed; // power of 2
    enabled;
    colour;

    constructor(ghostType, speed, colour) {
        this.ghostType = ghostType;
        this.speed = speed;
        this.colour = colour;
        if (ghostType == "blinky") {
            this.xPos = 13 * 16;
            this.yPos = 11 * 16;
            this.direction = "right";
        }
        if (ghostType == "pinky") {
            this.xPos = 14 * 16;
            this.yPos = 14 * 16;
            this.direction = "right";
        }
        if (ghostType == "inky") {
            this.xPos = 12 * 16;
            this.yPos = 14 * 16;
            this.direction = "up";
        }
        if (ghostType == "clyde") {
            this.xPos = 13 * 16;
            this.yPos = 14 * 16;
            this.direction = "left";
        }
        this.moving = true;
        this.frame = 0
        this.mode = "chase"
        this.frame = 0;
        this.enabled = true;
    }
    update(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection, delta) {
        if (this.moving == true) {

            if (this.direction == "left") {
                let finalXpos = this.xPos - this.speed * delta;
                this.xPos = Math.ceil(this.xPos);
                let steps = Math.ceil(this.xPos) - Math.ceil(finalXpos);

                for (let index = 0; index < steps; index++) {
                    this.xPos -= 1;
                    if (this.xPos % 16 == 0 && this.yPos % 16 == 0) {
                        if (this.checkForNewDirection(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection) == true) {
                            this.xPos = Math.floor(this.xPos);
                            return;
                        }
                    }
                }
                this.xPos = finalXpos;
                if (this.xPos < 5) {
                    this.xPos = 27 * 16; // tunnel
                }
            }

            if (this.direction == "right") {
                let finalXpos = this.xPos + this.speed * delta;
                this.xPos = Math.floor(this.xPos);
                let steps = Math.floor(finalXpos) - Math.floor(this.xPos);

                for (let index = 0; index < steps; index++) {
                    this.xPos += 1;
                    if (this.xPos % 16 == 0 && this.yPos % 16 == 0) {
                        if (this.checkForNewDirection(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection) == true) {
                            this.xPos = Math.floor(this.xPos);
                            return;
                        }
                    }
                }
                this.xPos = finalXpos;

                if (this.xPos > 26 * 16 + 12) {
                    this.xPos = 16; // tunnel
                }
            }

            if (this.direction == "up") {
                let finalYpos = this.yPos - this.speed * delta;
                this.yPos = Math.ceil(this.yPos);
                let steps = Math.ceil(this.yPos) - Math.ceil(finalYpos);

                for (let index = 0; index < steps; index++) {
                    this.yPos -= 1;
                    if (this.yPos % 16 == 0 && this.xPos % 16 == 0) {
                        if (this.checkForNewDirection(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection) == true) {
                            this.yPos = Math.floor(this.yPos);
                            return;
                        }
                    }
                }
                this.yPos = finalYpos;
            }

            if (this.direction == "down") {
                let finalYpos = this.yPos + this.speed * delta;
                this.yPos = Math.floor(this.yPos);
                let steps = Math.floor(finalYpos) - Math.floor(this.yPos);

                for (let index = 0; index < steps; index++) {
                    this.yPos += 1;
                    if (this.yPos % 16 == 0 && this.xPos % 16 == 0) {
                        if (this.checkForNewDirection(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection) == true) {
                            this.yPos = Math.floor(this.yPos);
                            return;
                        }
                    }
                }
                this.yPos = finalYpos;
            }

            if ((Math.floor(this.xPos / 16) > 11 && Math.floor(this.xPos / 16) < 17) && Math.floor(this.yPos / 16) == 14 && this.mode == "dead") {
                this.moving = false;
            }
        }
    }

    calculateTargetCell(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection) {
        let targetCell = new cell(0, 0);
        if (this.mode == "chase") {

            if (this.ghostType == "blinky") {
                targetCell.setX(Math.floor(pacmanX / 16));
                targetCell.setY(Math.floor(pacmanY / 16));
            }
            if (this.ghostType == "pinky") {
                targetCell.setX(Math.floor(pacmanX / 16));
                targetCell.setY(Math.floor(pacmanY / 16));
                if (pacmanDirection == "up") {
                    targetCell.setY(targetCell.getY() - 4);
                }
                if (pacmanDirection == "down") {
                    targetCell.setY(targetCell.getY() + 5);
                }
                if (pacmanDirection == "left") {
                    targetCell.setX(targetCell.getX() - 4);
                }
                if (pacmanDirection == "right") {
                    targetCell.setX(targetCell.getX() + 5);
                }
            }
            if (this.ghostType == "inky") {
                targetCell.setX(Math.floor(pacmanX / 16));
                targetCell.setY(Math.floor(pacmanY / 16));
                if (pacmanDirection == "up") {
                    targetCell.setY(targetCell.getY() - 2);
                }
                if (pacmanDirection == "down") {
                    targetCell.setY(targetCell.getY() + 3);
                }
                if (pacmanDirection == "left") {
                    targetCell.setX(targetCell.getX() - 2);
                }
                if (pacmanDirection == "right") {
                    targetCell.setX(targetCell.getX() + 3);
                }
                targetCell.setX(targetCell.getX() - 1 * (Math.floor(blinkyX / 16) - targetCell.getX()));
                targetCell.setY(targetCell.getY() - 1 * (Math.floor(blinkyY / 16) - targetCell.getY()));
            }
            if (this.ghostType == "clyde") {
                targetCell.setX(Math.floor(pacmanX / 16));
                targetCell.setY(Math.floor(pacmanY / 16));
                if ((Math.floor(this.xPos / 16) - Math.floor(pacmanX / 16)) ** 2 + (Math.floor(this.yPos / 16) - Math.floor(pacmanY / 16)) ** 2 < 64) {
                    targetCell.setX(0);
                    targetCell.setY(31);

                }
            }
        }

        if (this.mode == "scatter") {
            if (this.ghostType == "clyde") {
                targetCell.setX(28);
                targetCell.setY(0);
            }
            if (this.ghostType == "inky") {
                targetCell.setX(0);
                targetCell.setY(0);
            }
            if (this.ghostType == "pinky") {
                targetCell.setX(28);
                targetCell.setY(31);
            }
            if (this.ghostType == "blinky") {
                targetCell.setX(0);
                targetCell.setY(31);
            }
        }
        if (this.mode == "dead") {
            targetCell.setX(12);
            targetCell.setY(14);
        }
        return (targetCell);
    }

    reverseDirection() {
        if (this.direction == "up") {
            this.direction = "down";

            if (this.checkDirectionClear("down") == false) {
                console.log("avert walking into wall");
                console.log(this.ghostType + " " + this.xPos + " " + this.yPos + " " + this.direction + " " + this.mode);
                this.direction = "up";
                console.log("now facing " + this.direction);
            }
            return 0
        }
        if (this.direction == "left") {
            this.direction = "right";

            if (this.checkDirectionClear("right") == false) {
                console.log("avert walking into wall");
                console.log(this.ghostType + " " + this.xPos + " " + this.yPos + " " + this.direction + " " + this.mode);
                this.direction = "left";
                console.log("now facing " + this.direction);
            }
            return 0
        }
        if (this.direction == "right") {
            this.direction = "left";

            if (this.checkDirectionClear("left") == false) {
                console.log("avert walking into wall");
                console.log(this.ghostType + " " + this.xPos + " " + this.yPos + " " + this.direction + " " + this.mode);
                this.direction = "right";
                console.log("now facing " + this.direction);
            }
            return 0
        }
        if (this.direction == "down") {
            this.direction = "up";

            if (this.checkDirectionClear("up") == false) {
                console.log("avert walking into wall");
                console.log(this.ghostType + " " + this.xPos + " " + this.yPos + " " + this.direction + " " + this.mode);
                this.direction = "down";
                console.log("now facing " + this.direction);
            }
            return 0
        }

    }

    getxPos() {
        return (this.xPos);
    }

    isMoving() {
        return (this.moving);
    }

    getyPos() {
        return (this.yPos);
    }

    isEnabled() {
        return (this.enabled);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    advanceFrame() {
        this.frame = this.frame + 1;
        if (this.frame == 2) {
            this.frame = 0
        }
    }

    getMode() {
        return (this.mode);
    }

    setMode(mode) {
        this.mode = mode;

    }

    setMoving(moving) {
        this.moving = moving;
    }

    setX(x) {
        this.xPos = x;
    }

    setY(y) {
        this.yPos = y;
    }

    toggleMovement() {
        if (this.moving == true) {
            this.moving = false;
        } else {
            this.moving = true;
        }
    }

    getImagePosition() {
        let offset = 0;
        if (this.ghostType == "clyde") {
            offset = 8;
        }
        if (this.ghostType == "inky") {
            offset = 16;
        }
        if (this.ghostType == "pinky") {
            offset = 24;
        }
        if (this.direction == "up") {
            offset = offset + 1;
        }
        if (this.direction == "left") {
            offset = offset + 2;
        }
        if (this.direction == "down") {
            offset = offset + 3;
        }
        if (this.frame == 1) {
            offset = offset + 4;
        }
        if (this.mode == "frightened") {
            if (this.frame == 1) {
                offset = 32;
            } else {
                offset = 33;
            }
        } if (this.mode == "dead") {
            offset = 34;
            if (this.direction == "up") {
                offset = offset + 1;
            }
            if (this.direction == "left") {
                offset = offset + 2;
            }
            if (this.direction == "down") {
                offset = offset + 3;
            }
        }
        return (offset);
    }

    getDirection() {
        return (this.direction)
    }

    resetPosition() {
        if (this.ghostType == "blinky") {
            this.xPos = 13 * 16;
            this.yPos = 11 * 16;
            this.direction = "left";
            this.mode = "chase";
        }
        if (this.ghostType == "pinky") {
            this.xPos = 14 * 16;
            this.yPos = 14 * 16;
            this.direction = "right";
            this.mode = "chase";
        }
        if (this.ghostType == "inky") {
            this.xPos = 12 * 16;
            this.yPos = 14 * 16;
            this.direction = "right";
            this.mode = "chase";
        }
        if (this.ghostType == "clyde") {
            this.xPos = 13 * 16;
            this.yPos = 14 * 16;
            this.direction = "left";
            this.mode = "chase";
        }
       }

    getColour() {
        return (this.colour);
    }

    getGhostType() {
        return (this.ghostType);
    }

    setDirection(dir) {
        this.direction = dir;
    }

    toggleMoving() {
        if (this.moving == false) {
            this.moving = true;
        } else {
            this.moving = false;
        }
    }

    snapToGrid() {
        this.xPos = Math.floor(this.xPos / 16) * 16;
        this.yPos = Math.floor(this.yPos / 16) * 16;
    }

    getMoving() {
        return this.moving;
    }

    getSpeed() {
        return this.speed;
    }

    checkForNewDirection(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection) { // is ghost at possible intersection?
        // if so then determine which direction are possible exits
        let hasChanged = false;

        let targetCell = new cell(0, 0);
        targetCell = this.calculateTargetCell(pacmanX, pacmanY, blinkyX, blinkyY, pacmanDirection);
       
        let u = true;
        let d = true;
        let l = true;
        let r = true;
        let minTargetVector = new targetVector("up", 0);
        let tempTargetVector = new targetVector("up", 0);
        let possibleDirections = [];

        if (this.checkDirectionClear("down") == false) {
            d = false;
        }
        if (this.checkDirectionClear("up") == false) {
            u = false;
        }
        if (this.checkDirectionClear("right") == false) {
            r = false;
        }
        if (this.checkDirectionClear("left") == false) {
            l = false;
        }

        if (this.direction == "up") {
            d = false;
        }
        if (this.direction == "down") {
            u = false;
        }
        if (this.direction == "left") {
            r = false;
        }
        if (this.direction == "right") {
            l = false;
        }

        if (this.mode != "frightened") {
            tempTargetVector = new targetVector("up", 0);  // create new object, otherwise reference to old one pushed to array meaning all will have the same value
            if (u == true) {
                tempTargetVector.setDirection("up");

                tempTargetVector.setDistance((Math.floor(this.xPos / 16) - targetCell.getX()) ** 2 + ((Math.floor(this.yPos / 16) - 1) - targetCell.getY()) ** 2);
                possibleDirections.push(tempTargetVector);

            }
            tempTargetVector = new targetVector("up", 0);
            if (d == true) {
                tempTargetVector.setDirection("down");
                tempTargetVector.setDistance((Math.floor(this.xPos / 16) - targetCell.getX()) ** 2 + ((Math.floor(this.yPos / 16) + 1) - targetCell.getY()) ** 2);
                possibleDirections.push(tempTargetVector);

            }
            tempTargetVector = new targetVector("up", 0);
            if (l == true) {
                tempTargetVector.setDirection("left");
                tempTargetVector.setDistance(((Math.floor(this.xPos / 16) - 1) - targetCell.getX()) ** 2 + ((Math.floor(this.yPos / 16)) - targetCell.getY()) ** 2);
                possibleDirections.push(tempTargetVector);
            }
            tempTargetVector = new targetVector("up", 0);
            if (r == true) {
                tempTargetVector.setDirection("right");
                tempTargetVector.setDistance(((Math.floor(this.xPos / 16) + 1) - targetCell.getX()) ** 2 + ((Math.floor(this.yPos / 16)) - targetCell.getY()) ** 2);
                possibleDirections.push(tempTargetVector);

            }

            if (d == false && u == false && l == false && r == false) {
                this.reverseDirection();
                hasChanged = true;
            } else {
                if (possibleDirections.length > 0) { // determine which exit has shortest distance to target cell

                    minTargetVector = possibleDirections[0];
                    possibleDirections.forEach((item) => {

                        if (item.getDistance() < minTargetVector.getDistance()) {
                            minTargetVector = item;

                        }
                    })

                    this.direction = minTargetVector.getDirection();
                    hasChanged = true;
                }
            }

        } else {

            if (d == false && u == false && l == false && r == false) {
                this.reverseDirection();
                hasChanged = true;
            } else {
                if (d == true) { possibleDirections.push("down") };
                if (u == true) { possibleDirections.push("up") };
                if (l == true) { possibleDirections.push("left") };
                if (r == true) { possibleDirections.push("right") };
                let newDir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                if (newDir == this.direction) {
                    hasChanged = false;
                } else {
                    this.direction = newDir;
                    hasChanged = true;
                }
            }
        }
        return (hasChanged);
    }
    // This checks if it is clear for a ghost to move in the current direction
    checkDirectionClear(direction) {
        const ghostCell = new cell(Math.floor(this.xPos / 16), Math.floor(this.yPos / 16));
        const y = ghostCell.getY();
        const x = ghostCell.getX();

        // Helper to validate a clear tile
        const isClear = (row, col) =>
            mazeMap[row]?.[col] === 0;

        switch (direction) {
            case "up":
                if (y > 0) {
                    return isClear(y - 1, x) && isClear(y - 1, x + 1);
                }
                break;

            case "down":
                if (y < 29) {
                    return isClear(y + 2, x) && isClear(y + 2, x + 1);
                }
                break;

            case "left":
                if (
                    x > 0 ||
                    (x === 1 && y === 14) // tunnel entry condition
                ) {
                    return isClear(y, x - 1) && isClear(y + 1, x - 1);
                }
                break;

            case "right":
                if (
                    x < 26 ||
                    (x < 27 && y === 14) // tunnel entry condition
                ) {
                    return isClear(y, x + 2) && isClear(y + 1, x + 2);
                }
                break;
        }

        return false;
    }
}