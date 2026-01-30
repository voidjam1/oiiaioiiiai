class DrawingBoard {
    constructor(canvasId, onDrawCallback) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.onDraw = onDrawCallback;
        
        this.isDrawing = false;
        this.isLocked = true; // 默认锁定，直到游戏开始且轮到自己
        this.lastX = 0; 
        this.lastY = 0;
        
        // 绑定工具
        this.colorPicker = document.getElementById('colorPicker');
        this.sizePicker = document.getElementById('sizePicker');

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 事件监听
        this.canvas.addEventListener('mousedown', e => this.start(e));
        this.canvas.addEventListener('mousemove', e => this.move(e));
        this.canvas.addEventListener('mouseup', () => this.stop());
        this.canvas.addEventListener('mouseout', () => this.stop());
        
        this.canvas.addEventListener('touchstart', e => this.start(e.touches[0]));
        this.canvas.addEventListener('touchmove', e => { e.preventDefault(); this.move(e.touches[0]); });
        this.canvas.addEventListener('touchend', () => this.stop());
    }

    resize() {
        // 只有当 canvas 可见时 resize 才有意义
        if (this.canvas.offsetWidth > 0) {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
        }
    }

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / this.canvas.width,
            y: (e.clientY - rect.top) / this.canvas.height
        };
    }

    start(e) {
        if (this.isLocked) return;
        this.isDrawing = true;
        const pos = this.getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // 发送起点 (防止画点时不显示)
        this.onDraw({
            type: 'start', x: pos.x, y: pos.y,
            color: this.colorPicker.value,
            size: this.sizePicker.value
        });
    }

    move(e) {
        if (!this.isDrawing || this.isLocked) return;
        const pos = this.getPos(e);
        
        this.drawLine(this.lastX, this.lastY, pos.x, pos.y, this.colorPicker.value, this.sizePicker.value);
        
        this.onDraw({
            type: 'move', x: pos.x, y: pos.y,
            lastX: this.lastX, lastY: this.lastY,
            color: this.colorPicker.value,
            size: this.sizePicker.value
        });
        
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    stop() {
        this.isDrawing = false;
    }

    // 画线核心
    drawLine(x1, y1, x2, y2, color, size) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1 * w, y1 * h);
        this.ctx.lineTo(x2 * w, y2 * h);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }

    clear(remote = false) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!remote && !this.isLocked) {
            this.onDraw({ type: 'clear' });
        }
    }

    setLock(locked) {
        this.isLocked = locked;
        this.canvas.style.cursor = locked ? 'not-allowed' : 'crosshair';
    }

    // 接收远程数据
    drawRemote(data) {
        if (data.type === 'move') {
            this.drawLine(data.lastX, data.lastY, data.x, data.y, data.color, data.size);
        } else if (data.type === 'clear') {
            this.clear(true);
        } else if (data.type === 'start') {
            // 收到起点数据，仅重置状态，不画线
        }
    }
}
