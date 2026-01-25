class GameEngine {
    constructor(board) {
        this.board = board;
        this.round = 0;
        this.currentWord = "";
        this.timer = null;
        this.allThemes = [];
        this.currentThemeIndex = 0;
    }

    initThemes() {
        try {
            const saved = localStorage.getItem('drawGuessDB');
            const parsed = saved ? JSON.parse(saved) : null;
            this.allThemes = (Array.isArray(parsed) && parsed.length > 0) ? parsed : [{title: "默认题库", words: ["猫", "西瓜", "手机"]}];
            
            const sel = document.getElementById('theme-selector');
            if(sel) {
                sel.innerHTML = this.allThemes.map((t, i) => `<option value="${i}">${t.title} (${t.words.length})</option>`).join('');
                sel.onchange = (e) => this.currentThemeIndex = e.target.selectedIndex;
            }
        } catch(e) {
            this.allThemes = [{title: "默认题库", words: ["猫", "西瓜"]}];
        }
    }

    startNewRound() {
        if (!network.isHost) return alert("只有房主能点开始哦！");
        const theme = this.allThemes[this.currentThemeIndex];
        const word = theme.words[Math.floor(Math.random() * theme.words.length)];
        this.round++;
        const config = {
            cat: 'game', type: 'newRound', word, round: this.round,
            drawer: (this.round % 2 !== 0) ? 'host' : 'guest',
            themeTitle: theme.title
        };
        this.handleNewRound(config);
        network.send(config);
        this.startTimer(60);
    }

    handleNewRound(data) {
        this.currentWord = data.word;
        const isMe = (network.isHost && data.drawer === 'host') || (!network.isHost && data.drawer === 'guest');
        this.board.clear(true);
        this.board.setLock(!isMe);
        document.getElementById('word-display').innerText = isMe ? `题目: ${data.word}` : `题目: ??? (${data.word.length}字)`;
        document.getElementById('painter-tools').style.display = isMe ? 'flex' : 'none';
        this.appendMsg('system', '🔔', `第 ${data.round} 局开始！主题：${data.themeTitle || '未知'}`, '#6c5ce7');
    }

    startTimer(s) {
        clearInterval(this.timer);
        let t = s;
        this.timer = setInterval(() => {
            t--;
            if(network.isHost) network.send({cat:'game', type:'tick', time:t});
            document.getElementById('timer').innerText = `⏱️ ${t}s`;
            if(t <= 0) this.handleGameOver(false);
        }, 1000);
    }

    send(type) {
        const input = document.getElementById(type + '-input');
        const val = input.value.trim();
        if(!val) return;
        this.appendMsg(type, '我', val);
        network.send({cat:'chat', type, msg:val});
        if(type === 'guess' && val === this.currentWord) {
            network.send({cat:'game', type:'win'});
            this.handleGameOver(true, '我');
        }
        input.value = '';
    }

    handleGameOver(win, winner) {
        clearInterval(this.timer);
        this.board.setLock(true);
        this.appendMsg('system', '🏁', `结束！答案是: ${this.currentWord}`, 'orange');
        if(win) this.appendMsg('system', '🏆', `${winner} 猜对了！`, 'green');
    }

    appendMsg(type, user, text, color) {
        const list = document.getElementById(type === 'chat' || type === 'system' ? 'chat-list' : 'guess-list');
        const div = document.createElement('div');
        div.style.color = color || '#333';
        div.style.marginBottom = '5px';
        div.innerHTML = `<strong>${user}:</strong> ${text}`;
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }
}
