const ls = localStorage;
function ls_get(name){
    return ls.getItem(name) || false;
}
function ls_set(name, value){
    return ls.setItem(name, JSON.stringify(value));
}
function classToggle(value, target, className){
    if(value) target.classList.add(className)
    else target.classList.remove(className);
}
location.getValue = function(){  
    let v = this.search;
    let result = {};
    while(/(?<key>[^?&=]+)=(?<value>[^?&=]+)/ig.test(v)){
        let matches = /(?<key>[^?&=]+)=(?<value>[^?&=]+)/ig.exec(v);
        let {key, value} = matches.groups;
        result[key] = value;
        v = v.substr(v.indexOf(matches[0]) + matches[0].length);
    }
    return result;
}

String.prototype.toClockNumber = function(){
    if( /(?<hour>[0-9]{2}):(?<min>[0-9]{2}):(?<sec>[0-9]{2}),(?<ms>[0-9]{3})/.test(this) == false) return 0;

    let matches = /(?<hour>[0-9]{2}):(?<min>[0-9]{2}):(?<sec>[0-9]{2}),(?<ms>[0-9]{3})/.exec(this).groups;
    return parseInt(matches.hour) * 3600 + parseInt(matches.min) * 60 + parseInt(matches.sec) + parseFloat(`0.${matches.ms}`);
}

Number.prototype.toClockTime = function(){
    let min = parseInt(this / 60);
    let sec = parseInt(this % 60);
    if(sec < 10) sec = "0" + sec;

    return `${min}:${sec}`;
};

let app, player;

const actions = {
    index: () => {
        let musicList = app.musicList;
        let rows = [];
        let $mainRow = document.querySelector("#main-row");
        $mainRow.innerHTML = "";

        // 인기차트 => 일단 랜덤으로 뽑아냄 5개
        let $popularBox = document.createElement("div");
        $popularBox.classList.add("col-12", "py-3")
        $popularBox.innerHTML = `<div class="section-title pl-3">
                                        <h4 class="text-blue">인기 차트</h4>
                                    </div>
                                    <div id="popular" class="album-list">
                                    
                                    </div>`;
        
        let _musicList = musicList.slice(0);
        for(let i = 0; i < 5; i++){ 
            let item = _musicList.splice( Math.floor(Math.random() * _musicList.length) , 1 )[0];
            let elem = document.createElement("div");
            elem.innerHTML = `<div class="album has-context" data-context="openPlaylist nextPlay addQueue">
                                <div class="cover" style="background-image: url('images/covers/${item.albumImage}')">
                                    <button class="btn-play"><i class="fa fa-play"></i></button>
                                </div>
                                <div class="info">
                                    <b class="title">${item.name}</b>
                                    <small class="text-muted">${item.artist}</small>
                                </div>
                            </div>`;
            elem.firstChild.dataset.idx = item.idx;
            elem.querySelector(".btn-play").addEventListener("click", () => indexPlay(item));
            $popularBox.querySelector("#popular").append(elem.firstElementChild);
        }
        rows.push($popularBox);

        // 카테고리 별로 정렬
        musicList.forEach(item => {
            let exist = rows.find(x => x.dataset.genre === item.genre);
            let elem = document.createElement("div");
            if(!exist){
                elem.dataset.genre = item.genre;
                elem.classList.add("genre-list", "col-12", "py-3");
                elem.innerHTML = `<div class="section-title">
                                    <h5>${item.genre}</h5>
                                </div>
                                <div class="album-list wrap">
                                    <div class="album has-context" data-context="openPlaylist nextPlay addQueue" data-idx="${item.idx}">
                                        <div class="cover" style="background-image: url('images/covers/${item.albumImage}');">
                                            <button class="btn-play"><i class="fa fa-play"></i></button>
                                        </div>
                                        <div class="info">
                                            <b class="title">${item.name}</b>
                                            <small class="text-muted">${item.artist}</small>
                                        </div>
                                    </div>
                                </div>`;
                rows.push(elem);
            }
            else {
                let $albumList = exist.querySelector(".album-list");
                elem.classList.add("album", "has-context");
                elem.dataset.context = "openPlaylist nextPlay addQueue";

                elem.innerHTML = `<div class="cover" style="background-image: url('images/covers/${item.albumImage}');">
                                        <button class="btn-play"><i class="fa fa-play"></i></button>
                                    </div>
                                    <div class="info">
                                        <b class="title">${item.name}</b>
                                        <small class="text-muted">${item.artist}</small>
                                    </div>`;
                $albumList.append(elem);
                elem.dataset.idx = item.idx;
            }
            elem.querySelector(".btn-play").addEventListener("click", () => indexPlay(item));
        });

        rows.forEach((x, i) => {
            $mainRow.append(x);
            if(i !== rows.length - 1){
                let split = document.createElement("hr");
                split.classList.add("col");
                $mainRow.append(split);
            }
        });

        setTimeout(() => {
            app.$loading.remove();
        }, 500);

        function indexPlay(item){
            player.queue = [item];
            player.playIndex = 0;
            player.$audio.src = "/music/" + item.url;
            player.$audio.currentTime = 0;
        }
    },
    library: () => {
        // 최근 재생한 곡
        let $history = document.querySelector("#history-list");
        $history.innerHTML = "";

        if(player.history.length === 0) $history.innerHTML = "<div>아직 재생된 곡이 없습니다.</div>";
        player.history.forEach(h => {
            let elem = document.createElement("div");
            elem.innerHTML = `<div class="album has-context" data-context="removeHistory openPlaylist playNext addQueue">
                                <div class="cover" style="background-image: url('images/covers/${h.albumImage}');">
                                    <button class="btn-play"><i class="fa fa-play"></i></button>
                                </div>
                                <div class="info">
                                    <b class="title">${h.name}</b>
                                    <small class="text-muted">${h.artist}</small>
                                </div>
                            </div>`;
            $history.append(elem.firstChild);
        });
        
        // 플레이리스트
        let $container = document.querySelector("#play-list");
        $container.innerHTML = "";

        if(player.playList.length === 0) $container.innerHTML = `<div>아직 추가된 재생목록이 없습니다.</div>`;
        player.playList.forEach(playList => {
            let firstItem = playList.list.length === 0 ? null : app.musicList.find(x => x.idx == playList.list[0]);

            let elem = document.createElement("div");
            elem.classList.add("album", "link", "has-context");
            elem.dataset.context = elem.dataset.lcontext = "setPlaylist openPlaylist nextPlay addQueue removePlaylist";
            elem.dataset.ldx = playList.idx;
            elem.dataset.href = "playlist.html?playlist="+playList.idx;
            elem.innerHTML = `<div class="cover" ${firstItem ? "style=\"background-image: url('/images/covers/"+ firstItem.albumImage +"')\"": ""}></div>
                            <div class="info">
                                <b class="title">${playList.name}</b>
                                <small class="text-muted">노래 ${playList.list.length}곡</small>
                            </div>`;
            $container.append(elem);
        });

        setTimeout(() => {
            app.$loading.remove();
        }, 500);
    },
    queue: () => {
        let queue = player.queue;
        let $container = document.querySelector("#queue-list");
        $container.innerHTML = "";

        if(queue.length === 0) $container.innerHTML = "<div class='ml-3'>재생중인 음악이 없습니다.</div>";
        queue.forEach((q, i) => {
            let elem = document.createElement("div");
            elem.innerHTML = `<div class="album has-context ${player.playIndex === i ? "active" : ""}" data-idx="${q.idx}" data-context="openPlaylist removeQueue">
                                <div class="cover" style="background-image: url('images/covers/${q.albumImage}');">
                                    <button class="btn-play"><i class="fa fa-play"></i></button>
                                </div>
                                <div class="info">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <b class="title">${q.name}</b>
                                        <small class="text-muted mt-2">${q.duration.toClockTime()}</small>
                                    </div>
                                    <small class="text-muted artist">${q.artist}</small>
                                    <small class="text-muted album-name">${q.albumName}</small>
                                </div>
                            </div>`;
            elem.firstChild.addEventListener("click", e => {   
                                    console.log("click");
                                    player.playIndex = i;
                                    player.$audio.src = "/music/" + q.url;
                                    player.$audio.currentTime = 0;
                                });
                                $container.append(elem.firstChild);
                                $container
                            });

                            setTimeout(() => {
                                app.$loading.remove();
                            }, 500);
    },
    playlist: () => {
        let search = location.getValue();
        let playList = player.playList.find(({idx}) => idx == search.playlist);
        if(!playList){
            alert("해당 플레이리스트는 존재하지 않습니다.");
            history.pushState({path: "index.html"}, null, "index.html");
            app.route("index.html");
        }
        
        document.querySelector("#btn-playall").addEventListener("click", () => player.setPlaylist({listIdx: playList.idx}));

        let $container = document.querySelector("#playlist");
        $container.querySelector(".list-name").innerText = playList.name;
        $container.querySelector(".list-length").innerText = playList.list.length;

        let $list = $container.querySelector(".album-list");
        $list.innerHTML = playList.list.length === 0 ? "<div>플레이리스트에 추가된 음악이 없습니다.</div>" : "";
        playList.list.forEach(itemIdx => {
            let item = app.musicList.find(({idx}) => itemIdx == idx);
            let elem = document.createElement("div") ;
            elem.classList.add("album", "has-context");
            elem.dataset.context = "openPlaylist nextPlay addQueue removePlayItem";
            elem.dataset.lcontext = "removePlayItem";
            elem.dataset.idx = itemIdx;
            elem.dataset.ldx = playList.idx;
            elem.innerHTML = `<div class="cover" style="background-image: url('images/covers/${item.albumImage}');">
                                    <button class="btn-play"><i class="fa fa-play"></i></button>
                                </div>
                                <div class="info">
                                    <b class="title">${item.name}</b>
                                    <small class="text-muted">${item.artist}</small>
                                    <button class="btn btn-light border mt-4" style="width: 120px;">대기열에 추가</button>
                                </div>`;
            elem.querySelector(".btn-light").addEventListener("click", () => player.addQueue({data: item}));
            $list.append(elem);
        });

        setTimeout(() => {
            app.$loading.remove();
        }, 500);
    }
};


class App {
    constructor(){
        this.init();
    }
    
    async init(){
        this.$container = document.querySelector("#wrap");
        this.$loading = document.createElement("div");
        this.$loading.id = "loading";
        this.$loading.innerHTML = "<div class='circle'></div>";
        document.body.append(this.$loading);

        this.musicList = await this.loadMusic();
        player = new Player();

        this.loading();
        this.event();
    }

    event(){
        //페이지 이동 이벤트
        window.addEventListener("popstate", e => {
            this.route(e.state.path);
        });

        // 모든 컨텍스트 창 삭제
        document.body.addEventListener("mouseup", e => {
            let exist = document.querySelector(".context-menu");
            exist && exist.remove();
        });
    }

    update(){
        
    }

    loading(){
        document.body.append(this.$loading);
        this.current_page = location.pathname !== "/" ? /\/(.+)\.html/.exec(location.pathname)[1] : "index";
        actions[this.current_page]();

        // 컨텍스트 추가
        document.querySelectorAll(".has-context").forEach(item => {
            item.addEventListener("contextmenu", e => {
                e.preventDefault();
                this.openContext({e, item});
            });
        });

        // 링크 추가
        document.querySelectorAll(".link").forEach(item => {
            item.dataset.event !== "true" && item.addEventListener("click", e => {
                                                let href = e.currentTarget.dataset.href;

                                                // history.pushState((Object)state, null, (String)pathname)
                                                // state: popstate 이벤트의 state로 전달될 데이터
                                                // pathName: 페이지 이동 없이 주소창이 해당 값으로 바뀜

                                                history.pushState({path: href}, null, href);
                                                this.route(href);
                                            });
            item.dataset.event = true;
        });
    }

    route(pathName){
        // 모든 컨텍스트 창 삭제
        let exist;
        exist = document.querySelector(".context-menu");
        exist && exist.remove();
        exist = document.querySelector(".playlist-context");
        exist && exist.remove();

        fetch(pathName)
        .then(v => v.text())
        .then(v => {
            let exist = document.querySelector(".contents");

            let elem = document.createElement("div");
            elem.innerHTML = /(<div class="contents[^]*<\/div>)/.exec(v);
            this.$container.insertBefore(elem.firstChild, exist);
            exist.remove();
            
            this.loading();
        });
    }    
    
    openContext({e, item}){
        // 콘텍스트 이름
        const menuNames = {
            "nextPlay": "다음 곡으로 재생",
            "setPlaylist": "플레이리스트 재생",
            "openPlaylist": "플레이리스트에 추가",
            "removePlayItem": "플레이리스트에서 삭제",
            "removePlaylist": "플레이리스트 삭제",
            "addQueue": "대기열에 추가",
            "removeQueue" : "대기열에서 삭제"
        };

        // 일반 콘텍스트 삭제
        let exist = document.querySelector(".context-menu");
        exist && exist.remove();
        // 재생목록 콘텍스트 삭제
        exist = document.querySelector(".playlist-context");
        exist && exist.remove();

        let data = this.musicList.find(x => x.idx == item.dataset.idx);
        let listIdx = e.currentTarget.dataset.lcontext ? item.dataset.ldx : null; 
        
        let menuList = e.currentTarget.dataset.context.split(" ");
        let lmenuList = e.currentTarget.dataset.lcontext ? e.currentTarget.dataset.lcontext.split(" ") : [];
        let elem = document.createElement("div");
        elem.classList.add("context-menu");
        elem.style.left = e.pageX + "px";
        elem.style.top = e.pageY + "px";
        
        menuList.forEach(menu => {
            let menuElem = document.createElement("div");
            menuElem.classList.add("item");
            menuElem.addEventListener("mousedown", event => lmenuList.includes(menu) ? player[menu]({event, data, listIdx}) : player[menu]({event, data}));
            menuElem.innerText = menuNames[menu];
            elem.append(menuElem);
        });

        document.body.append(elem);
    }

    loadMusic(){
        return new Promise(res => {
            let data = ls_get("data");
            if(data) res(JSON.parse(data));
            else {
                fetch("/json/music_list.json")
                .then(data => data.json())
                .then(async data => {
                    this.musicList = await Promise.all(data.map(async x => {
                                        x.duration = await this.getDuration(x.url);
                                        return x;
                                    }));
                    ls_set("data", data);
                    res(data); 
                });
            }
        });
    }

    getDuration(filename){
        return new Promise(res => {
            fetch("/music/"+filename)
            .then(data => data.arrayBuffer())
            .then(data => {
                new AudioContext().decodeAudioData(data).then(value => res(value.duration));
            });
        });
    }

}

class Player {
    constructor(){
        this.playIndex = -1;
        this.history = [];
        this.playList = [];
        this.playListAi = 0;
        this.queue = [];

        this.$audio = document.createElement("audio");
        this.$audio.volume = 0.5;
        this.canPlay = false;
        this.lyric = false;
        this.l_data = [];
        this.repeat = "queue";

        this.$info = document.querySelector("#play-area .info")
        this.$lyrics = document.querySelector("#lyric");

        this.$currentTime = document.querySelector("#current-time");
        this.$duration = document.querySelector("#duration");

        this.$i_process = document.querySelector("#process-bar input");

        this.$volume = document.querySelector("#volume-bar");
        this.$i_volume = this.$volume.querySelector("input");

        this.$repeatBtn = document.querySelector("#btn-repeat");
        this.$playBtn = document.querySelector("#btn-play");

        this.event();
        this.update();
        this.frame();
    }

    event(){
        // 오디오 이벤트
        this.$audio.addEventListener("loadedmetadata", () => {
            console.log("loadmetadata", this.$audio.src);
            
            let currentItem = this.queue[this.playIndex];
            let idx = this.history.unshift(currentItem);
            if(idx === 6) this.history.pop();

            this.$audio.pause();
            this.$audio.currentTime = 0;
            this.canPlay = true;
            this.update();
            this.$playBtn.click();

            app.current_page !== "index" && app.loading();
        });
        this.$audio.addEventListener("ended", () => {
            switch(this.repeat){
                case "current":
                    this.$audio.currentTime = 0;
                    this.$playBtn.click();
                    break;
                case "queue":
                    this.next();
                    break;
                case "none":
                    break;
            }
        });

        // 재생/일시정지 버튼
        this.$playBtn.addEventListener("click", (e) => {
            if(this.canPlay){
                this.$audio.paused ? this.$audio.play() : this.$audio.pause();
                classToggle(this.$audio.paused, e.target.firstElementChild, "fa-play")
                classToggle(!this.$audio.paused, e.target.firstElementChild, "fa-pause")
            }
        });

        // 반복 버튼
        this.$repeatBtn.addEventListener("click", e => {
            if(this.repeat === "queue") this.repeat = "none";
            else if(this.repeat === "none") this.repeat = "current";
            else if(this.repeat === "current") this.repeat = "queue";

            this.$repeatBtn.classList.value = "item mr-3 " + this.repeat;
        });

        //볼륨
        let volumeTime;
        this.$i_volume.addEventListener("input", e => {
            this.$audio.volume = this.$i_volume.value;
            this.$volume.dataset.preview = parseInt(100 * this.$i_volume.value) + "%";

            if(volumeTime) clearTimeout(volumeTime);
            volumeTime = setTimeout(() => {
                this.$volume.dataset.preview = "";
            }, 500);
        });

        // 가사 보여주기
        let $btnLyric = document.querySelector("#btn-lyric");
        $btnLyric.addEventListener("click", () => {
            this.lyric = !this.lyric;
            classToggle(this.lyric, $btnLyric, "active");
            classToggle(!this.lyric, this.$lyrics.querySelector(".lyrics"), "hidden");
        });

        // 프로세스 바
        this.$i_process.addEventListener("mousedown", e => {
            this.$i_process.down = true;
        });
        this.$i_process.addEventListener("input", e => {
            if(!this.canPlay) return;
            this.$audio.currentTime = this.$i_process.value;
            this.$audio.paused && this.$audio.play();
        });
        this.$i_process.addEventListener("mouseup", e => {
            this.$i_process.down = false;
        });


        // 이전 버튼
        document.querySelector("#btn-prev").addEventListener("click", e => {
            if(!this.canPlay) return;
            if(this.$audio.currentTime >= 5){
                this.$audio.currentTime = 0;
            }
            else {
                this.prev();   
            }
        });

        // 다음 버튼
        document.querySelector("#btn-next").addEventListener("click", e => {
            if(!this.canPlay) return;
            this.next();
        });
    }

    async update(){
        this.$repeatBtn.classList.value = "item mr-3";
        this.$repeatBtn.classList.add(this.repeat);
        

        if(this.canPlay === false){
            this.$info.querySelector(".image").style.backgroundImage = "";
            this.$info.querySelector(".title").innerText = "재생 중인 음악이 없습니다.";
            this.$info.querySelector(".artist").innerText =
                this.$info.querySelector(".duration").innerText = "";

            this.$lyrics.querySelector(".cover-image").style.backgroundImage = "";
            this.$lyrics.querySelector(".lyrics").classList.add("hidden");
            this.$lyrics.querySelector(".title").innerText = "가사가 없습니다.";
            this.$lyrics.querySelector(".artist").innerText = "";
            this.$lyrics.querySelector(".lyrics").innerHTML = "";
        }
        else {
            let item = this.queue[this.playIndex];

            // 가사 관리
            let lyrics = await this.loadLyric(item.lyrics);
            let $l_box = this.$lyrics.querySelector(".lyrics");
            $l_box.innerHTML = "";
            if(lyrics.length === 0) $l_box.innerHTML = `<p data-start="0> data-end="${item.duration}">가사가 등록되지 않은 노래입니다.</p>`;
            lyrics.forEach(l => {
                $l_box.append(l);
            });
            this.l_data = lyrics;

            // 제목, 아티스트 등 관리
            this.$info.querySelector(".image").style.backgroundImage = `url('/images/covers/${item.albumImage}')`;
            this.$info.querySelector(".title").innerText = item.name;
            this.$info.querySelector(".artist").innerText = item.artist;
            this.$info.querySelector(".duration").innerText = "";

            this.$lyrics.querySelector(".cover-image").style.backgroundImage = `url('/images/covers/${item.albumImage}')`;

            this.$lyrics.querySelector(".title").innerText = item.name;
            this.$lyrics.querySelector(".artist").innerText = item.artist;

            // 러닝 타임
            this.$i_process.max = this.$audio.duration;
            this.$i_process.step = 0.1;
        }
    }

    frame(){
        let {currentTime, duration} = this.$audio;
        this.$currentTime.innerText = currentTime.toClockTime();

        if(this.canPlay){
            if(!this.$i_process.down) this.$i_process.value = currentTime;
            this.$duration.innerText = duration.toClockTime();

            try {
                let l_item = this.l_data.find(x => x !== null && x.startTime <= currentTime && currentTime <= x.endTime || x.startTime <= currentTime && x.endTime === 0);
                if(l_item){
                    if(!l_item.classList.contains("active")){
                        let exist = this.$lyrics.querySelector("p.active");
                        exist && exist.classList.remove("active");
    
                        l_item.classList.add("active");
                        
                        let half = this.$lyrics.offsetHeight / 2 ;
                        let top = l_item.offsetTop < half ? 0 : l_item.offsetTop - half;
                        this.$lyrics.querySelector(".lyrics").scrollTo(0, top);
                    }
                }
                else {
                    let exist = this.$lyrics.querySelector("p.active");
                    exist && exist.classList.remove("active");
                }
            } catch {}
        }
        else {
            this.$i_process.value = 0;
            this.$duration.innerText = "0:00";
        }

        requestAnimationFrame(() => {
            this.frame();
        });
    }

    openPlaylist({event, data, listIdx}){
        let list = listIdx ? this.playList.find(({idx}) => idx == listIdx).list : [];
        console.log(list);
        const createItem = (idx, name, checked = false) => {
            let item = document.createElement("div");
            item.classList.add("item");
            item.dataset.idx = idx;
            item.innerHTML = `<input type="checkbox" id="checkbox-${idx}"><label for="checkbox-${idx}" class="name">${name}</label>`;
            
            let checkbox = item.querySelector("input");
            checkbox.checked = checked;
            
            // 체크박스 이벤트
            data = listIdx ? list : data;
            checkbox.addEventListener("change", e => e.currentTarget.checked ? this.addPlayItem({listIdx: idx, data}) : this.removePlayItem({listIdx: idx, data}));
            return item;
        }

        let exist = document.querySelector(".playlist-context");
        exist && exist.remove();

        let elem = document.createElement("div");
        elem.classList.add("playlist-context");
        elem.innerHTML = `<div class="buttons">
                            <button class="btn-add">새 재생목록</button>
                            <button class="btn-close">닫기</button>
                        </div>`;
        this.playList.forEach(playItem => {
            // checkbox 체크 표시 설정
            console.log(playItem);
             let {idx, name} = playItem;
             let checked = listIdx ? list.every(x => playItem.list.includes(x)) : playItem.list.some(v => v == data.idx);
             elem.prepend(createItem(idx, name, checked));
        });
        elem.style.left = event.pageX + "px";
        elem.style.top = event.pageY + "px";
         
        elem.querySelector(".btn-add").addEventListener("click", () => {
            let idx = ++ this.playListAi;
            let name = prompt("새 재생목록의 이름을 설정하세요.");
            name = name === "" ? "재생목록 " + idx : name;
            if(name !== null){
                this.playList.push({idx, name, list: []});
                elem.prepend(createItem(idx, name));
            } else idx--;
        });

        elem.querySelector(".btn-close").addEventListener("click", () => {
            elem.remove();
        });
        document.body.append(elem);
    }

    setPlaylist({listIdx}){
        let list = this.playList.find(({idx}) => idx == listIdx).list.map(idx => app.musicList.find(x => x.idx == idx));
        this.queue = list;
        this.playIndex = 0;
        this.$audio.src = "/music/" + this.queue[0].url;
    }

    addPlayItem = ({listIdx, data}) => {
        let playList = this.playList.find(x => x.idx == listIdx);
        data = (Array.isArray(data) ? data : [data.idx]).filter(x => !playList.list.includes(x));
        data.forEach(x => {
            playList.list.push(x);
        });

        app.current_page !== "index" && app.loading();
    }

    removePlayItem = ({listIdx, data}) => {
        let playList = this.playList.find(x => x.idx == listIdx);

        if(Array.isArray(data)){
            data.filter(i => playList.list.includes(i)).forEach(x => {
                let dataIdx = playList.list.findIndex(x => x == data.idx);    
                playList.list.splice(dataIdx, 1);
            });
        }
        else {
            let dataIdx = playList.list.findIndex(x => x == data.idx);
            if(dataIdx < 0) return alert("재생목록에 해당 음악이 없습니다.");
            playList.list.splice(dataIdx, 1);
        }
        
        app.current_page !== "index" && app.loading();
    }

    removePlaylist = ({listIdx}) => {
        let idx = this.playList.findIndex(x => x.idx == listIdx);
        this.playList.splice(idx, 1);
        app.loading();
    }

    next = () => {
        this.playIndex = this.playIndex + 1 >= this.queue.length ? 0 : this.playIndex + 1;
        this.$audio.src = "/music/" + this.queue[this.playIndex].url;
    }

    prev = () => {
        this.playIndex = this.playIndex - 1 < 0 ? 0 : this.playIndex - 1;
        this.$audio.src = "/music/" + this.queue[this.playIndex].url;
        this.$audio.currentTime = 0;
    }

    nextPlay({listIdx, data}){
        // 재생 목록인 경우
        if(listIdx) {
            let list = this.playList.find(({idx}) => idx == listIdx).list.map(idx => app.musicList.find(x => x.idx == idx));
            this.queue.splice(this.playIndex + 1, 0, ...list);
        }
        // 음악인 경우
        else this.queue.splice(this.playIndex + 1, 0, data);

        console.log(this.queue);
        if(this.playIndex < 0){
            this.playIndex = 0;
            this.$audio.src = "/music/" + this.queue[this.playIndex].url;
        }
    };

    addQueue({data, listIdx}){
        //재생목록인 경우
        if(listIdx){    
            let list = this.playList.find(({idx}) => idx == listIdx).list.map(idx => app.musicList.find(x => x.idx == idx));
            this.queue.push(...list);
        } 
        // 음악인 경우
        else this.queue.push(data);

        if(this.playIndex < 0){
            this.playIndex = 0;
            this.$audio.src = "/music/" + this.queue[0].url;    
        }
    }

    removeQueue = ({data}) => {
        let idx = this.queue.findIndex(x => x === data);
        this.queue.splice(idx, 1);

        if(idx !== this.playIndex) {
            idx < this.playIndex && this.playIndex--;
            app.loading();
        }
        // 현재 재생중인 음악을 지울 때
        else {
            console.log(this.playIndex, this.queue.length);
            if(this.queue.length === 0){   // 큐의 값이 없을 경우
                this.canPlay = false;
                this.$audio.src = "";
                app.loading();
                this.update();
            }   
            else { // 그 외
                if(this.playIndex === this.queue.length) this.playIndex = 0;
                this.$audio.src = "/music/" + this.queue[this.playIndex].url;
            }

            
        }
        
        console.log("removeQueue", this.queue);
    };

    loadLyric(filename){
        return new Promise(res => {
            fetch("/lyrics/"+filename)
            .then(v => v.ok && v.text())
            .then(v => {
                if(!v) res([]);
                let regexr = /(?<no>[0-9]+)\s*(?<start>[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\s*-->\s*(?<end>[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\s*(?<lyric>[^\r\n]+)/

                let result = [];
                while(regexr.test(v)){
                    let groups = regexr.exec(v).groups;
                    v = v.substr(v.indexOf(groups.lyric) + groups.lyric.length);

                    let elem = document.createElement("p");
                    elem.startTime = groups.start.toClockNumber();
                    elem.endTime = groups.end.toClockNumber();
                    elem.innerText = groups.lyric;
                    result.push(elem);
                }
                res(result);
            });
        });
    }
}


window.addEventListener("load", () => {
    app = new App();
});