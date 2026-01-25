class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.heartbeat = null;
    }

    createRoom() {
        this.isHost = true;
        this.peer = new Peer();
        this.peer.on('open', id => {
            document.getElementById('my-room-id').innerText = id;
            document.getElementById('room-id-display').style.display = 'block';
            document.getElementById('current-room-id').innerText = id;
            
            setTimeout(() => {
                document.getElementById('lobby-overlay').style.display = 'none';
                engine.appendMsg('system', '🏠', '房间创建成功，等待好友...', '#6c5ce7');
            }, 2000);
        });
        this.peer.on('connection', c => this.handleConnect(c));
    }

    joinRoom() {
        const id = document.getElementById('target-id').value.trim();
        if (!id) return alert("请输入房号");
        this.isHost = false;
        this.peer = new Peer();
        this.peer.on('open', () => {
            const c = this.peer.connect(id);
            this.handleConnect(c);
        });
    }

    handleConnect(c) {
        this.conn = c;
        this.conn.on('open', () => {
            document.getElementById('lobby-overlay').style.display = 'none';
            document.getElementById('current-room-id').innerText = this.conn.peer;
            
            // 心跳保活
            this.heartbeat = setInterval(() => {
                if(this.conn.open) this.conn.send({cat:'heartbeat'});
            }, 4000);

            engine.appendMsg('system', '✅', '连接成功！游戏可以开始了', 'green');
        });
        this.conn.on('data', data => {
            if(data.cat === 'heartbeat') return;
            this.handle(data);
        });
        this.conn.on('close', () => {
            clearInterval(this.heartbeat);
            engine.appendMsg('system', '❌', '连接已断开，请刷新', 'red');
        });
    }

    send(data) {
        if (this.conn && this.conn.open) this.conn.send(data);
    }

    handle(data) {
        if (data.cat === 'paint') board.drawRemote(data);
        else if (data.cat === 'chat') engine.appendMsg(data.type, '对方', data.msg);
        else if (data.cat === 'game') {
            if (data.type === 'newRound') engine.handleNewRound(data);
            if (data.type === 'win') engine.handleGameOver(true, '对方');
            if (data.type === 'tick') document.getElementById('timer').innerText = `⏱️ ${data.time}s`;
        }
    }
}
const network = new NetworkManager();
