class DrawingBoard {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.history = [];
        this.isLocked = false;
        this.init();
    }

    init() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.ctx.lineCap = 'round';
        this.saveState(); // 初始状态
    }

    // 核心功能：存入撤销栈
    saveState() {
        if (this.history.length > 20) this.history.shift();
        this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    }

    undo() {
        if (this.history.length > 1) {
            this.history.pop();
            this.ctx.putImageData(this.history[this.history.length - 1], 0, 0);
        }
    }

    lock(isLocked) {
        this.isLocked = isLocked;
        document.getElementById('canvas-overlay').style.display = isLocked ? 'flex' : 'none';
        this.canvas.style.pointerEvents = isLocked ? 'none' : 'auto';
    }

    download() {
        const link = document.createElement('a');
        link.download = `gartic_draw_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
}
