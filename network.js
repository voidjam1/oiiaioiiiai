class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.myId = null;
    }

    // 1. 创建房间 (房主逻辑)
    createRoom() {
        this.isHost = true;
        this.peer = new Peer(); // 自动生成 ID
        
        this.peer.on('open', (id) => {
            this.myId = id;
            document.getElementById('my-room-id').innerText = id;
            document.getElementById('room-id-display').style.display = 'block';
            document.getElementById('waiting-msg').style.display = 'block';
            document.getElementById('join-panel').style.display = 'none';
        });

        // 等待别人连接
        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.setupConnection();
            alert("🎉 玩家已连接！游戏即将开始！");
            document.getElementById('lobby-overlay').style.display = 'none';
            // 房主只有连接成功后才能控制游戏
            engine.startGame(); 
        });
    }

    // 2. 加入房间 (玩家逻辑)
    joinRoom() {
        const targetId = document.getElementById('target-id').value.trim();
        if (!targetId) return alert("请输入房间号");
        
        this.isHost = false;
        this.peer = new Peer();
        
        this.peer.on('open', () => {
            this.conn = this.peer.connect(targetId);
            this.setupConnection();
        });
    }

    // 3. 通用：连接建立后的处理
    setupConnection() {
        // 接收数据
        this.conn.on('data', (data) => {
            this.handleData(data);
        });

        this.conn.on('open', () => {
            console.log("连接成功!");
            if (!this.isHost) {
                document.getElementById('lobby-overlay').style.display = 'none';
                document.getElementById('word-display').innerText = "等待房主选题...";
                // 玩家只能看，不能画 (锁定画布)
                board.setLock(true);
            }
        });
    }

    // 4. 发送数据 (封装)
    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    // 5. 路由：收到数据后分发给不同模块
    handleData(data) {
        // 同步绘画
        if (data.cat === 'paint') {
            board.drawRemote(data);
        } 
        // 同步游戏状态 (房主 -> 玩家)
        else if (data.cat === 'game') {
            if (data.type === 'start') {
                document.getElementById('word-display').innerText = "题目: ??? (猜猜看)";
                document.getElementById('timer').innerText = "正在作画";
                engine.appendMsg('system', '🔔 游戏开始！请看画猜词！', 'blue');
            } else if (data.type === 'end') {
                engine.appendMsg('system', `❌ 游戏结束，答案是：${data.ans}`, 'red');
            } else if (data.type === 'win') {
                engine.appendMsg('system', `🏆 恭喜对方猜中了！答案：${data.ans}`, 'green');
            }
        }
        // 同步聊天/猜词
        else if (data.cat === 'chat') {
            engine.appendMsg(data.type, '对方', data.msg);
            // 如果我是房主，我要负责判断对方猜得对不对
            if (this.isHost && data.type === 'guess') {
                engine.checkAnswer(data.msg);
            }
        }
    }
}
/**
 * network.js (增强版)
 */
class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.myId = null;
    }

    // --- 建立连接部分 (保持原有逻辑) ---
    createRoom() {
        this.isHost = true;
        this.peer = new Peer();
        this.peer.on('open', (id) => {
            this.myId = id;
            document.getElementById('my-room-id').innerText = id;
            document.getElementById('room-id-display').style.display = 'block';
        });
        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.setupConnection();
            document.getElementById('lobby-overlay').style.display = 'none';
        });
    }

    joinRoom() {
        const targetId = document.getElementById('target-id').value.trim();
        this.isHost = false;
        this.peer = new Peer();
        this.peer.on('open', () => {
            this.conn = this.peer.connect(targetId);
            this.setupConnection();
        });
    }

    setupConnection() {
        this.conn.on('open', () => {
            document.getElementById('lobby-overlay').style.display = 'none';
            console.log("P2P 连接已建立");
        });
        this.conn.on('data', (data) => this.handleData(data));
    }

    send(data) {
        if (this.conn && this.conn.open) this.conn.send(data);
    }

    // --- 【这是重点】升级后的数据分发中心 ---
    handleData(data) {
        switch (data.cat) {
            case 'paint':
                // 对方画一笔，我这里同步一笔
                board.drawRemote(data);
                break;

            case 'chat':
                // 收到对方的消息（聊天或猜谜）
                engine.appendMsg(data.type, '对方', data.msg);
                break;

            case 'game':
                // 核心：处理来自房主的“裁判指令”
                this.handleGameSignal(data);
                break;
        }
    }

    handleGameSignal(data) {
        if (data.type === 'newRound') {
            // 收到新回合：更新身份、题目、倒计时
            engine.handleNewRound(data);
        } 
        else if (data.type === 'tick') {
            // 同步房主的倒计时
            engine.updateTimerUI(data.time);
        }
        else if (data.type === 'correct') {
            // 对方判定猜对了，全员结束
            engine.handleGameOver(true, '对方');
        }
        else if (data.type === 'timeout') {
            // 对方判定超时，全员结束
            engine.handleGameOver(false);
        }
    }
}

const network = new NetworkManager();
