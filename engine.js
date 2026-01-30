class GameEngine {
    constructor(board) {
        this.board = board;
        this.themes = [];
        this.currentTheme = [];
        this.scores = { host: 0, guest: 0 };
        this.settings = { maxScore: 30, timeLimit: 60 };
        
        this.hostName = "房主";
        this.guestName = "等待中...";
        this.myRole = ""; 
        
        this.round = 0;
        this.currentWord = "";
        this.drawer = ""; 
        this.timerInterval = null;
        this.isMyTurn = false;
        this.gameState = 'idle'; 
    }

    setSelfName(name) {
        this.myRole = network.isHost ? 'host' : 'guest';
        if (network.isHost) this.hostName = name;
        else this.guestName = name;
        this.updateScoreBoard();
    }

    setOpponentName(name) {
        if (network.isHost) this.guestName = name;
        else this.hostName = name;
        this.updateScoreBoard();
    }

    initThemes() {
        try {
            const saved = localStorage.getItem('drawGuessDB');
            const defaultThemes = [{title: "默认", words: ["苹果", "猫", "房子", "飞机", "电脑"]}];
            this.themes = saved ? JSON.parse(saved) : defaultThemes;
            if (!this.themes.length) this.themes = defaultThemes;
        } catch (e) { this.themes = [{title: "默认", words: ["错误"]}]; }

        const sel = document.getElementById('theme-selector');
        if (sel) sel.innerHTML = this.themes.map((t, i) => `<option value="${i}">${t.title}</option>`).join('');
    }

    onPlayerJoined(isHost) {
        const hc = document.getElementById('host-controls');
        const gc = document.getElementById('guest-controls');
        if (hc) hc.style.display = isHost ? 'block' : 'none';
        if (gc) gc.style.display = isHost ? 'none' : 'block';
        this.updateScoreBoard();
    }

    // --- 游戏流程 ---

    startGame() {
        if (!network.isHost) return;
        const themeIdx = document.getElementById('theme-selector').value;
        this.currentTheme = this.themes[themeIdx]?.words || ["错误"];
        this.settings.maxScore = parseInt(document.getElementById('max-score').value) || 30;
        this.settings.timeLimit = parseInt(document.getElementById('time-limit').value) || 60;
        this.scores = { host: 0, guest: 0 };
        this.round = 0;

        const config = { 
            cat: 'game', type: 'start', 
            settings: this.settings, scores: this.scores,
            hostName: this.hostName 
        };
        
        network.send(config);
        this.handlePacket(config); // 房主本地先执行
        setTimeout(() => this.nextRound(), 1000);
    }

    nextRound() {
        if (!network.isHost) return;
        
        if (this.scores.host >= this.settings.maxScore || this.scores.guest >= this.settings.maxScore) {
            const winner = this.scores.host >= this.settings.maxScore ? this.hostName : this.guestName;
            const endData = { cat: 'game', type: 'gameOver', winner };
            network.send(endData);
            this.handlePacket(endData);
            return;
        }

        this.round++;
        this.drawer = (this.round % 2 !== 0) ? 'host' : 'guest';
        const word = this.currentTheme[Math.floor(Math.random() * this.currentTheme.length)];

        const roundData = { cat: 'game', type: 'newRound', word, drawer: this.drawer, round: this.round };
        network.send(roundData);
        this.handlePacket(roundData);
    }

    // --- 数据处理核心 ---

    handlePacket(data) {
        // 1. 绘图同步 (最频繁)
        if (data.cat === 'paint') {
            this.board.drawRemote(data);
            return;
        }

        // 2. 聊天与猜题分流
        if (data.cat === 'chat') {
            const listId = data.type === 'guess' ? 'guess-list' : 'chat-list';
            const color = data.type === 'guess' ? '#d35400' : '#2d3436';
            this.appendMsg(listId, data.user, data.msg, color);
            return;
        }

        // 3. 游戏逻辑
        if (data.cat === 'game') {
            // 特殊：客人向房主请求结算
            if (network.isHost && data.type === 'roundEnd' && data.reason === 'correct') {
                this.resolveRound(data);
                return;
            }
            this.handleGameLogic(data);
        }
    }

    handleGameLogic(data) {
        switch (data.type) {
            case 'start':
                this.scores = data.scores;
                this.settings = data.settings;
                if (data.hostName) this.hostName = data.hostName;
                this.updateScoreBoard();
                this.appendMsg('chat-list', '系统', `🎮 游戏开始！目标分数: ${this.settings.maxScore}`, 'green');
                break;

            case 'newRound':
                this.gameState = 'playing';
                this.currentWord = data.word;
                this.drawer = data.drawer;
                this.isMyTurn = (network.isHost && this.drawer === 'host') || (!network.isHost && this.drawer === 'guest');

                document.getElementById('round-overlay').style.display = 'none';
                this.board.clear(true);
                this.board.setLock(!this.isMyTurn);
                
                document.getElementById('painter-tools').style.display = this.isMyTurn ? 'flex' : 'none';
                document.getElementById('game-status').innerText = this.isMyTurn ? `题目: ${data.word}` : `猜词: ${data.word.length} 个字`;
                
                // 仅房主启动倒计时
                if (network.isHost) this.startTimer(this.settings.timeLimit);
                break;

            case 'tick':
                document.getElementById('timer').innerText = `⏱️ ${data.time}`;
                break;

            case 'roundEnd':
                this.endRoundUI(data);
                break;

            case 'gameOver':
                this.gameState = 'end';
                clearInterval(this.timerInterval);
                const overlay = document.getElementById('round-overlay');
                overlay.style.display = 'flex';
                document.getElementById('round-msg').innerText = "🏆 最终冠军";
                document.getElementById('round-word').innerText = data.winner;
                document.getElementById('next-round-btn').style.display = 'none';
                break;
        }
    }

    // --- 输入处理 ---

    sendChat() {
        const input = document.getElementById('chat-input');
        const val = input.value.trim();
        if (!val) return;
        const name = network.isHost ? this.hostName : this.guestName;
        const data = { cat: 'chat', type: 'talk', user: name, msg: val };
        network.send(data);
        this.handlePacket(data); 
        input.value = '';
    }

    sendGuess() {
        if (this.isMyTurn) return;
        if (this.gameState !== 'playing') return;

        const input = document.getElementById('guess-input');
        const val = input.value.trim();
        if (!val) return;

        const name = network.isHost ? this.hostName : this.guestName;

        if (val === this.currentWord) {
            // 猜对了，通知房主
            const winData = { cat: 'game', type: 'roundEnd', reason: 'correct', winnerName: name };
            if (network.isHost) {
                this.resolveRound(winData);
            } else {
                network.send(winData);
                this.appendMsg('guess-list', '我', val, '#27ae60'); 
            }
        } else {
            // 猜错了，作为普通猜测广播
            const data = { cat: 'chat', type: 'guess', user: name, msg: val };
            network.send(data);
            this.handlePacket(data);
        }
        input.value = '';
    }

    // --- 房主专用结算 ---

    resolveRound(data) {
        if (!network.isHost || this.gameState !== 'playing') return;
        clearInterval(this.timerInterval);
        
        let msg = "";
        if (data.reason === 'correct') {
            // 画画的人和猜对的人各加10分
            this.scores.host += 10;
            this.scores.guest += 10;
            msg = `🎉 ${data.winnerName} 猜对了！`;
        } else if (data.reason === 'timeout') {
            msg = "⏰ 时间耗尽";
        } else if (data.reason === 'skip') {
            msg = "⏭️ 画手跳过了题目";
        }

        const endData = {
            cat: 'game', type: 'roundEnd',
            scores: this.scores,
            word: this.currentWord,
            msg: msg
        };
        network.send(endData);
        this.handlePacket(endData);
    }

    endRoundUI(data) {
        this.gameState = 'intermission';
        clearInterval(this.timerInterval);
        this.scores = data.scores;
        this.updateScoreBoard();

        document.getElementById('round-overlay').style.display = 'flex';
        document.getElementById('round-msg').innerText = data.msg;
        document.getElementById('round-word').innerText = data.word;
        
        if (network.isHost) {
            document.getElementById('next-round-btn').style.display = 'block';
        }

        // 双频道通知
        const sysMsg = `${data.msg} (答案: ${data.word})`;
        this.appendMsg('guess-list', '系统', sysMsg, '#27ae60');
        this.appendMsg('chat-list', '📢', sysMsg, '#636e72');
    }

    endRound(isTimeout) {
        if (!this.isMyTurn) return;
        const reason = isTimeout ? 'timeout' : 'skip';
        if (network.isHost) this.resolveRound({reason});
        else network.send({cat: 'game', type: 'roundEnd', reason});
    }

    startTimer(s) {
        clearInterval(this.timerInterval);
        let t = s;
        this.timerInterval = setInterval(() => {
            t--;
            const tickData = {cat:'game', type:'tick', time:t};
            network.send(tickData);
            this.handleGameLogic(tickData); // 本地更新
            if (t <= 0) this.resolveRound({reason: 'timeout'});
        }, 1000);
    }

    updateScoreBoard() {
        const hN = document.getElementById('name-host');
        const hS = document.getElementById('score-host');
        const gN = document.getElementById('name-guest');
        const gS = document.getElementById('score-guest');
        if(hN) hN.innerText = this.hostName;
        if(hS) hS.innerText = this.scores.host;
        if(gN) gN.innerText = this.guestName;
        if(gS) gS.innerText = this.scores.guest;
    }

    appendMsg(listId, user, text, color) {
        const list = document.getElementById(listId);
        if (!list) return;
        const div = document.createElement('div');
        div.className = 'msg-item';
        div.style.color = color;
        div.innerHTML = `<strong>${user}:</strong> ${text}`;
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }

    saveImage() {
        const link = document.createElement('a');
        const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
        link.download = `Gartic-${this.currentWord}-${timestamp}.png`;
        link.href = this.board.canvas.toDataURL();
        link.click();
    }
}
