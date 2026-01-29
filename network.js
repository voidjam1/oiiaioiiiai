class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.heartbeat = null;
        this.myNickname = "玩家";
    }

    // 获取当前输入框的昵称
    getNickname() {
        const name = document.getElementById('my-nickname').value.trim();
        return name || (this.isHost ? "房主" : "朋友");
    }

    createRoom() {
        this.isHost = true;
        this.myNickname = this.getNickname();
        engine.setSelfName(this.myNickname); // 设置引擎里的名字

        this.peer = new Peer();
        
        document.getElementById('lobby-btns').style.display = 'none';
        document.getElementById('room-info-display').style.display = 'block';

        this.peer.on('open', id => {
            document.getElementById('my-room-id').innerText = id;
            engine.appendMsg('chat-list', '系统', `房间已创建，我是: ${this.myNickname}`, 'blue');
        });

        this.peer.on('connection', c => this.setupConnection(c));
    }

    joinRoom() {
        const id = document.getElementById('target-id').value.trim();
        if (!id) return alert("请输入房号");
        
        this.isHost = false;
        this.myNickname = this.getNickname();
        engine.setSelfName(this.myNickname);

        this.peer = new Peer();
        this.peer.on('open', () => {
            const c = this.peer.connect(id);
            this.setupConnection(c);
        });
    }

    setupConnection(conn) {
        this.conn = conn;
        
        this.conn.on('open', () => {
            document.getElementById('lobby-overlay').style.display = 'none';
            engine.appendMsg('chat-list', '系统', '连接建立！正在交换名片...', 'green');

            // 1. 发送握手包：把我的名字发给对方
            this.send({ cat: 'handshake', name: this.myNickname });

            // 心跳
            this.heartbeat = setInterval(() => {
                if (this.conn.open) this.conn.send({ cat: 'heartbeat' });
            }, 3000);
        });

        this.conn.on('data', data => {
            if (data.cat === 'heartbeat') return;
            
            // 2. 处理握手包
            if (data.cat === 'handshake') {
                engine.setOpponentName(data.name);
                engine.appendMsg('chat-list', '系统', `玩家【${data.name}】已加入！`, 'green');
                // 只有房主需要更新UI控制权
                if (this.isHost) engine.onPlayerJoined(true);
                else engine.onPlayerJoined(false);
                return;
            }

            engine.handlePacket(data);
        });

        this.conn.on('close', () => {
            clearInterval(this.heartbeat);
            engine.appendMsg('chat-list', '系统', '❌ 连接断开', 'red');
        });
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }
}

const network = new NetworkManager();
