class DrawingBoard {
    constructor(canvasId, callback) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.callback = callback;
        this.isDrawing = false;
        this.init();
    }

    init() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        };
        window.addEventListener('resize', resize);
        resize();
        this.canvas.addEventListener('pointerdown', e => this.start(e));
        this.canvas.addEventListener('pointermove', e => this.draw(e));
        window.addEventListener('pointerup', () => this.isDrawing = false);
    }

    start(e) {
        this.isDrawing = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.offsetX, e.offsetY);
        this.callback({ type: 'start', x: e.offsetX/this.canvas.width, y: e.offsetY/this.canvas.height });
    }

    draw(e) {
        if (!this.isDrawing) return;
        const color = document.getElementById('colorPicker').value;
        const size = document.getElementById('sizePicker').value;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineTo(e.offsetX, e.offsetY);
        this.ctx.stroke();
        this.callback({ type: 'draw', x: e.offsetX/this.canvas.width, y: e.offsetY/this.canvas.height, color, width: size });
    }

    drawRemote(data) {
        const x = data.x * this.canvas.width;
        const y = data.y * this.canvas.height;
        if (data.type === 'start') {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        } else if (data.type === 'draw') {
            this.ctx.strokeStyle = data.color;
            this.ctx.lineWidth = data.width;
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        } else if (data.clear) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    clear(remote = false) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!remote) this.callback({ clear: true });
    }

    setLock(l) { this.canvas.style.pointerEvents = l ? 'none' : 'auto'; }
}
