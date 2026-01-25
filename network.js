class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
    }

    createRoom() {
        this.isHost = true;
        this.peer = new Peer();
        this.peer.on('open', id => {
            document.getElementById('my-room-id').innerText = id;
            document.getElementById('room-id-display').style.display = 'block';
        });
        this.peer.on('connection', c => {
            this.conn = c;
            this.setup();
        });
    }

    joinRoom() {
        const id = document.getElementById('target-id').value;
        this.peer = new Peer();
        this.peer.on('open', () => {
            this.conn = this.peer.connect(id);
            this.setup();
        });
    }

    setup() {
        this.conn.on('open', () => {
            document.getElementById('lobby-overlay').style.display = 'none';
            if (this.isHost) engine.startNewRound(); // 房主连上后自动开始第一局
        });
        this.conn.on('data', data => this.handle(data));
    }

    send(data) { if (this.conn) this.conn.send(data); }

    handle(data) {
        if (data.cat === 'paint') board.drawRemote(data);
        else if (data.cat === 'chat') engine.appendMsg(data.type, '对方', data.msg);
        else if (data.cat === 'game') {
            if (data.type === 'newRound') engine.handleNewRound(data);
            if (data.type === 'correct') engine.handleGameOver(true, '对方');
        }
    }
}
const network = new NetworkManager();
