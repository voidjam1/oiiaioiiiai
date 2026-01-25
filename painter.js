class DrawingBoard {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.history = [];
        this.isDrawing = false;
        this.init();
    }

    init() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // 监听 Pointer 事件（兼容手机/平板/电脑）
        this.canvas.addEventListener('pointerdown', (e) => this.start(e));
        this.canvas.addEventListener('pointermove', (e) => this.draw(e));
        window.addEventListener('pointerup', () => this.stop());
    }

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    start(e) {
        this.isDrawing = true;
        this.saveHistory();
        const pos = this.getPos(e);
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);
        this.ctx.strokeStyle = document.getElementById('colorPicker').value;
        this.ctx.lineWidth = document.getElementById('sizePicker').value;
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }

    stop() { this.isDrawing = false; }
    
    clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    
    saveHistory() {
        if (this.history.length > 10) this.history.shift();
        this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    }

    undo() {
        if (this.history.length > 0) {
            this.ctx.putImageData(this.history.pop(), 0, 0);
        }
    }

    setLock(locked) {
        document.getElementById('canvas-lock').style.display = locked ? 'flex' : 'none';
        this.canvas.style.pointerEvents = locked ? 'none' : 'auto';
    }

    download() {
        const a = document.createElement('a');
        a.href = this.canvas.toDataURL();
        a.download = 'gartic-masterpiece.png';
        a.click();
    }
}
