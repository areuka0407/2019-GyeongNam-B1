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
    index: musicList => {
        // 인기차트 => 일단 랜덤으로 뽑아냄 5개
        let $popularBox = document.querySelector("#popular");
        let _musicList = musicList.slice(0);
        for(let i = 0; i < 5; i++){ 
            let item = _musicList.splice( Math.floor(Math.random() * _musicList.length) , 1 )[0];
            let elem = document.createElement("div");
            elem.innerHTML = `<div class="album">
                                <div class="cover" style="background-image: url('images/covers/${item.albumImage}')">
                                    <button class="btn-play"><i class="fa fa-play"></i></button>
                                </div>
                                <div class="info">
                                    <b class="title">${item.name}</b>
                                    <small class="text-muted">${item.artist}</small>
                                </div>
                            </div>`;
            elem.firstChild.data = item;
            elem.querySelector(".btn-play").addEventListener("click", () => indexPlay(item));
            $popularBox.append(elem.firstElementChild);
        }

        // 카테고리 별로 정렬
        let $mainRow = document.querySelector("#main-row");
        musicList.forEach(item => {
            let exist = document.querySelector(".genre-list[data-genre='"+ item.genre +"']");
            let elem = document.createElement("div");
            if(!exist){
                elem.dataset.genre = item.genre;
                elem.classList.add("genre-list", "col-12", "py-3");
                elem.innerHTML = `<div class="section-title">
                                    <h5>${item.genre}</h5>
                                </div>
                                <div class="album-list">
                                    <div class="album">
                                        <div class="cover" style="background-image: url('images/covers/${item.albumImage}');">
                                            <button class="btn-play"><i class="fa fa-play"></i></button>
                                        </div>
                                        <div class="info">
                                            <b class="title">${item.name}</b>
                                            <small class="text-muted">${item.artist}</small>
                                        </div>
                                    </div>
                                </div>`;
                $mainRow.append(elem);
            }
            else {
                let $albumList = exist.querySelector(".album-list");
                if($albumList.childElementCount === 5) return;
                
                elem.classList.add("album");
                elem.innerHTML = `<div class="cover" style="background-image: url('images/covers/${item.albumImage}');">
                                        <button class="btn-play"><i class="fa fa-play"></i></button>
                                    </div>
                                    <div class="info">
                                        <b class="title">${item.name}</b>
                                        <small class="text-muted">${item.artist}</small>
                                    </div>`;
                $albumList.append(elem);
            }
            elem.querySelector(".btn-play").addEventListener("click", () => indexPlay(item));
            elem.data = item;
        });
        app.$loading.remove();

        function indexPlay(item){
            player.queue = [item];
            player.playIndex = 0;
            player.$audio.src = "/music/" + item.url;
            player.$audio.currentTime = 0;
        }
    },
    library: musicList => {
        console.log(app.$loading);
        app.$loading.remove();
    },
    queue: musicList => {
        console.log(app.$loading);
        app.$loading.remove();
    },
    playlist: musicList => {
        console.log(app.$loading);
        app.$loading.remove();
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

        this.event();
        this.loading();
    }

    event(){
        window.addEventListener("popstate", e => {
            this.route(e.state.path);
        });

        document.querySelectorAll(".link").forEach(item => {
            item.addEventListener("click", e => {
                let href = e.currentTarget.dataset.href;

                // history.pushState((Object)state, null, (String)pathname)
                // state: popstate 이벤트의 state로 전달될 데이터
                // pathName: 페이지 이동 없이 주소창이 해당 값으로 바뀜

                history.pushState({path: href}, null, href);
                this.route(href);
            });
        });
    }

    loading(){
        document.body.append(this.$loading);
        this.current_page = location.pathname !== "/" ? /\/(.+)\.html/.exec(location.pathname)[1] : "index";
        actions[this.current_page](this.musicList);
    }

    route(pathName){
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

        this.$process = document.querySelector("#process-bar");
        this.$volume = document.querySelector("#volume-bar");

        this.$repeatBtn = document.querySelector("#btn-repeat");
        this.$playBtn = document.querySelector("#btn-play");

        this.event();
        this.update();
        this.frame();
    }

    event(){
        this.$audio.addEventListener("loadedmetadata", () => {
            this.$audio.pause();
            this.canPlay = true;
            this.update();
            this.$playBtn.click();
        });
        this.$audio.addEventListener("ended", () => {
            switch(this.repeat){
                case "current":
                    this.$audio.currentTime = 0;
                    this.$playBtn.click();
                    break;
                case "queue":
                    this.playIndex = this.playIndex + 1 >= this.queue.length ? 0 : this.playIndex + 1;
                    this.update();

                    break;
                case "none":
                    break;
            }
        });


        this.$playBtn.addEventListener("click", (e) => {
            if(this.canPlay){
                this.$audio.paused ? this.$audio.play() : this.$audio.pause();
                classToggle(this.$audio.paused, e.target.firstElementChild, "fa-play")
                classToggle(!this.$audio.paused, e.target.firstElementChild, "fa-pause")
            }
        });

        this.$repeatBtn.addEventListener("click", e => {
            if(this.repeat === "queue") this.repeat = "none";
            else if(this.repeat === "none") this.repeat = "current";
            else if(this.repeat === "current") this.repeat = "queue";

            this.$repeatBtn.classList.value = "item mr-3 " + this.repeat;
        });

        this.$volume.addEventListener("input", e => {
            this.$audio.volume = this.$volume.value;
        });

        let $btnLyric = document.querySelector("#btn-lyric");
        $btnLyric.addEventListener("click", () => {
            this.lyric = !this.lyric;
            classToggle(this.lyric, $btnLyric, "active");
            classToggle(!this.lyric, this.$lyrics.querySelector(".lyrics"), "hidden");
        });

        this.$process.addEventListener("mousedown", e => {
            this.$process.down = true;
        });
        this.$process.addEventListener("input", e => {
            if(!this.canPlay) return;
            this.$audio.currentTime = this.$process.value;
            this.$audio.paused && this.$audio.play();
        });
        this.$process.addEventListener("mouseup", e => {
            this.$process.down = false;
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
            lyrics.forEach(l => {
                if(l === null) $l_box.innerHTML = `<p data-start="0> data-end="${item.duration}">가사가 등록되지 않은 노래입니다.</p>`;
                else $l_box.append(l);
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
            this.$process.max = this.$audio.duration;
            this.$process.step = 0.1;
            
        }
    }

    frame(){
        let {currentTime, duration} = this.$audio;
        this.$currentTime.innerText = currentTime.toClockTime();

        if(this.canPlay){
            if(!this.$process.down) this.$process.value = currentTime;
            this.$duration.innerText = duration.toClockTime();

            let l_item = this.l_data.find(x => x.startTime <= currentTime && currentTime <= x.endTime || x.startTime <= currentTime && x.endTime === 0);
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
        }
        else {
            this.$process.value = 0;
            this.$duration.innerText = "0:00";
        }

        requestAnimationFrame(() => {
            this.frame();
        });
    }

    addQueue(item){
        this.queue.unshift(item);
        this.playIndex = 0;
        this.$audio.src = "/music/"+item.url;
    }

    loadLyric(filename){
        return new Promise(res => {
            fetch("/lyrics/"+filename)
            .then(v => v.ok && v.text())
            .then(v => {
                if(!v) res([null]);
                let regexr = /(?<no>[0-9]+)\s*(?<start>[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\s*-->\s*(?<end>[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\s*(?<lyric>[^\r\n]+)/

                let result = [];
                while(regexr.test(v)){
                    let groups = regexr.exec(v).groups;
                    v = v.substr(v.indexOf(groups.lyric) + groups.lyric.length);

                    let elem = document.createElement("p");
                    elem.data = groups;
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