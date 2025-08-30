class powerPill {
    row;
    column;
    active;
    frame;

    constructor(row, column) {
        this.row = row;
        this.column = column;
        this.active = true;
        this.frame = 0;
    }

    getRow() {
        return (this.row);
    }

    getColumn() {
        return (this.column);
    }

    setActive(b) {
        this.active = b;
    }

    getActive() {
        return (this.active)
    }

    advanceFrame() {
        this.frame += 1;
        if (this.frame == 4) {
            this.frame = 0;
        }
    }

    getFrame() {
        return (this.frame);
    }
}