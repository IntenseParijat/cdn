(function () {
    "use strict";
    const HTML = "<div class=\"cyber-player\" id=\"player\">\n\n  <div class=\"glow\"></div>\n\n  <div class=\"top-row\">\n    \n    <button id=\"prevBtn\">\n\n    <svg viewbox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"white\">\n    <path d=\"M6 6h2v12H6zm3.5 6L18 18V6z\"/>\n    </path></svg>\n\n    </button>\n\n    <button id=\"playBtn\">\n\n    <svg id=\"playIcon\" viewbox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"white\">\n    <path d=\"M8 5v14l11-7z\"/>\n    </path></svg>\n\n    </button>\n\n    <button id=\"nextBtn\">\n\n    <svg viewbox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"white\">\n    <path d=\"M16 6h2v12h-2zM6 18l8.5-6L6 6z\"/>\n    </path></svg>\n\n    </button>\n\n  </div>\n\n  <div class=\"track-info\">\n\n    <div class=\"track-title\" id=\"trackTitle\">\n        LOADING...\n    </div>\n\n    <div class=\"track-artist\" id=\"trackArtist\">\n    </div>\n\n  </div>\n\n  <div class=\"equalizer\">\n    <span></span>\n    <span></span>\n    <span></span>\n    <span></span>\n    <span></span>\n  </div>\n\n  <div class=\"seekbar-container\">\n\n    <input type=\"range\" id=\"seekbar\" value=\"0\" />\n    \n    <button id=\"modeBtn\" class=\"mode-btn\">\n    \n    <svg id=\"modeIcon\" viewbox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"white\">\n    <path d=\"M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z\"/>\n    </path></svg>\n    \n    </button>\n    \n    </div>\n\n  <div class=\"volume-container\">\n\n    <button id=\"muteBtn\">\n    \n    <svg viewbox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"white\">\n    <path d=\"M3 9v6h4l5 5V4L7 9H3z\"/>\n    </path></svg>\n    \n    </button>\n    \n    <input type=\"range\" id=\"volumeBar\" min=\"0\" max=\"1\" step=\"0.01\" value=\"1\" />\n    \n    </div>\n\n  <audio id=\"audio\"></audio>\n\n</div>";

    const CSS = ".cyber-player{\n  box-sizing:border-box;\n  position:relative;\n  width:100%;\n  max-width:360px;\n  padding:20px;\n  border-radius:20px;\n  background:\n    linear-gradient(\n      145deg,\n      rgba(20,20,20,0.95),\n      rgba(35,35,35,0.85)\n    );\n  border:1px solid rgba(255,115,87,0.25);\n  box-shadow:\n    0 0 25px rgba(255,115,87,0.12),\n    inset 0 0 25px rgba(255,255,255,0.03);\n  overflow:hidden;\n  backdrop-filter:blur(18px);\n  z-index:9999;\n  pointer-events:auto;\n}\n\n.glow{\n  position:absolute;\n  inset:0;\n  background:\n    radial-gradient(\n      circle at center,\n      rgba(255,115,87,0.12),\n      transparent 70%\n    );\n  opacity:0;\n  transition:0.5s;\n  pointer-events:none;\n}\n\n.cyber-player.playing .glow{\n  opacity:1;\n}\n\n.top-row{\n  display:flex;\n  justify-content:center;\n  gap:16px;\n  margin-bottom:16px;\n}\n\n.top-row button{\n  width:58px;\n  height:58px;\n  border:none;\n  border-radius:50%;\n  cursor:pointer !important;\n  display:flex;\n  align-items:center;\n  justify-content:center;\n  color:white;\n  background:\n    linear-gradient(\n      145deg,\n      #ff7357,\n      #ff512f\n    );\n  box-shadow:\n    0 0 18px rgba(255,115,87,0.4);\n  transition:0.25s;\n  position:relative;\n  z-index:10000;\n  pointer-events:auto;\n}\n\n.top-row button:hover{\n  transform:scale(1.08);\n  box-shadow:\n    0 0 25px rgba(255,115,87,0.8);\n}\n\n.track-info{\n  width:100%;\n  text-align:center;\n  margin-bottom:18px;\n  display:flex;\n  flex-direction:column;\n  align-items:center;\n}\n\n.track-title{\n  color:#ffffff;\n  font-family:'Orbitron',sans-serif;\n  font-size:12px;\n  letter-spacing:1.5px;\n  text-transform:uppercase;\n  line-height:1.4;\n  word-break:break-word;\n  overflow-wrap:anywhere;\n}\n\n.track-artist{\n  margin-top:4px;\n  color:rgba(255,255,255,.55);\n  font-family:'Orbitron',sans-serif;\n  font-size:10px;\n  letter-spacing:1px;\n  text-transform:uppercase;\n  line-height:1.3;\n  word-break:break-word;\n  overflow-wrap:anywhere;\n}\n\n.equalizer{\n  display:flex;\n  justify-content:center;\n  align-items:flex-end;\n  gap:5px;\n  height:34px;\n  margin-bottom:18px;\n}\n\n.equalizer span{\n  width:5px;\n  border-radius:20px;\n  background:#ff7357;\n  box-shadow:\n    0 0 12px rgba(255,115,87,0.8);\n  animation:eq 1s infinite ease-in-out;\n  animation-play-state:paused;\n}\n\n.cyber-player.playing .equalizer span{\n  animation-play-state:running;\n}\n\n.equalizer span:nth-child(1){animation-delay:0s;}\n.equalizer span:nth-child(2){animation-delay:0.15s;}\n.equalizer span:nth-child(3){animation-delay:0.3s;}\n.equalizer span:nth-child(4){animation-delay:0.45s;}\n.equalizer span:nth-child(5){animation-delay:0.6s;}\n\n@keyframes eq{\n  0%,100%{\n    height:10px;\n  }\n  50%{\n    height:34px;\n  }\n}\n\n.seekbar-container{\n  display:flex;\n  align-items:center;\n  gap:10px;\n  width:100%;\n}\n\n#seekbar{\n  flex:1;\n  accent-color:#ff7357;\n  cursor:pointer;\n}\n\n.volume-container{\n  display:flex;\n  align-items:center;\n  gap:12px;\n  margin-top:14px;\n  width:100%;\n}\n\n#muteBtn{\n  width:38px;\n  height:38px;\n  border:none;\n  border-radius:50%;\n  cursor:pointer;\n  display:flex;\n  align-items:center;\n  justify-content:center;\n  background:\n    linear-gradient(\n      145deg,\n      #ff7357,\n      #ff512f\n    );\n  box-shadow:\n    0 0 12px rgba(255,115,87,0.4);\n  transition:0.25s;\n}\n\n#muteBtn:hover{\n  transform:scale(1.08);\n  box-shadow:\n    0 0 18px rgba(255,115,87,0.8);\n}\n\n#volumeBar{\n  flex:1;\n  accent-color:#ff7357;\n  cursor:pointer;\n}\n\n.mode-btn{\n  width:38px;\n  height:38px;\n  min-width:38px;\n  border:none;\n  border-radius:50%;\n  cursor:pointer;\n  display:flex;\n  align-items:center;\n  justify-content:center;\n  background:\n    linear-gradient(\n      145deg,\n      #ff7357,\n      #ff512f\n    );\n  box-shadow:\n    0 0 12px rgba(255,115,87,0.4);\n  transition:0.25s;\n}\n\n.mode-btn:hover{\n  transform:scale(1.08);\n  box-shadow:\n    0 0 18px rgba(255,115,87,0.8);\n}\n\naudio{\n  display:none;\n}\n\n#parijat-player-root{\n  position:fixed;\n  top:85px;\n  right:32px;\n  left:auto;\n  width:360px;\n  max-width:calc(100vw - 24px);\n  z-index:2147483000;\n  margin:0;\n  padding:0;\n  box-sizing:border-box;\n  cursor:grab;\n  user-select:none;\n  -webkit-user-select:none;\n  touch-action:none;\n}\n\n#parijat-player-root.dragging{\n  cursor:grabbing;\n}\n\n#parijat-player-root .parijat-minimize{\n  position:absolute;\n  top:7px;\n  right:7px;\n  z-index:10001;\n  width:28px;\n  height:28px;\n  padding:0;\n  border:1px solid rgba(255,255,255,.12);\n  border-radius:50%;\n  background:rgba(20,20,20,.72);\n  color:#fff;\n  font:700 18px/1 Arial,sans-serif;\n  display:flex;\n  align-items:center;\n  justify-content:center;\n  cursor:pointer;\n}\n\n#parijat-player-root .parijat-bubble{\n  display:none;\n  width:58px;\n  height:58px;\n  padding:0;\n  border:1px solid rgba(255,115,87,.4);\n  border-radius:50%;\n  background:linear-gradient(145deg,#1f1f1f,#121212);\n  color:#fff;\n  font-size:28px;\n  line-height:1;\n  align-items:center;\n  justify-content:center;\n  position:relative;\n  box-sizing:border-box;\n  cursor:grab;\n  touch-action:none;\n  box-shadow:\n    0 0 20px rgba(255,115,87,.18),\n    inset 0 0 20px rgba(255,255,255,.03);\n}\n\n#parijat-player-root.minimized{\n  width:58px;\n  height:58px;\n}\n\n#parijat-player-root.minimized #player{\n  display:none;\n}\n\n#parijat-player-root.minimized .parijat-minimize{\n  display:none;\n}\n\n#parijat-player-root.minimized .parijat-bubble{\n  display:flex;\n}\n\n#parijat-player-root.minimized .parijat-bubble::after{\n  content:\"\";\n  display:none;\n  position:absolute;\n  inset:-5px;\n  border-radius:50%;\n  background:\n    conic-gradient(\n      from 0deg,\n      transparent 0deg,\n      transparent 50deg,\n      #ff7357 95deg,\n      #ff7357 145deg,\n      transparent 190deg,\n      transparent 360deg\n    );\n  -webkit-mask:\n    radial-gradient(\n      farthest-side,\n      transparent calc(100% - 2px),\n      #000 calc(100% - 2px)\n    );\n  mask:\n    radial-gradient(\n      farthest-side,\n      transparent calc(100% - 2px),\n      #000 calc(100% - 2px)\n    );\n  animation:parijat-ring 1s linear infinite;\n  pointer-events:none;\n}\n\n#parijat-player-root.minimized .parijat-bubble.playing::after{\n  display:block;\n}\n\n#parijat-player-root .equalizer.loading span{\n  background:#8b7cff;\n  box-shadow:0 0 12px rgba(139,124,255,.95);\n}\n\n#parijat-player-root .equalizer.loaded span{\n  background:#ff7357;\n  box-shadow:0 0 12px rgba(255,115,87,.8);\n}\n\n@keyframes parijat-ring{\n  from{\n    transform:rotate(0deg);\n  }\n  to{\n    transform:rotate(360deg);\n  }\n}\n\n@media(max-width:1619px){\n  #parijat-player-root{\n    position:relative!important;\n    top:auto!important;\n    right:auto!important;\n    bottom:auto!important;\n    left:auto!important;\n    width:100%!important;\n    max-width:none!important;\n    margin:0!important;\n    padding:0!important;\n    z-index:auto!important;\n    cursor:default!important;\n    touch-action:auto!important;\n  }\n\n  #parijat-player-root .cyber-player{\n    width:calc(100% - 32px);\n    max-width:360px;\n    margin:20px auto;\n  }\n\n  #parijat-player-root .parijat-minimize,\n  #parijat-player-root .parijat-bubble{\n    display:none!important;\n  }\n}\n";

    const PLAYLIST_URL = "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";
    const BREAKPOINT = 1619;
    const PRELOAD_SECONDS = 15;
    const MARGIN = 16;

    const KEY = {
        track: "cyberPlayerTrack",
        src: "cyberPlayerTrackSrc",
        time: "cyberPlayerTime",
        volume: "cyberPlayerVolume",
        muted: "cyberPlayerMuted",
        playing: "cyberPlayerPlaying",
        mode: "cyberPlayerMode",
        display: "cyberPlayerDisplay",
        left: "cyberPlayerLeft",
        top: "cyberPlayerTop",
        bubbleLeft: "cyberPlayerBubbleLeft",
        bubbleTop: "cyberPlayerBubbleTop",
        playlist: "cyberPlayerPlaylist"
    };

    let tracks = [];
    let currentTrack = 0;
    let playMode = 0;
    let shouldPlay = false;
    let displayMode = "expanded";
    let restoring = false;
    let preloadedIndex = -1;
    let queuedNextIndex = -1;
    let loadToken = 0;

    let root = null;
    let player = null;
    let audio = null;
    let preloader = null;
    let playBtn = null;
    let nextBtn = null;
    let prevBtn = null;
    let seekbar = null;
    let trackTitle = null;
    let trackArtist = null;
    let volumeBar = null;
    let muteBtn = null;
    let modeBtn = null;
    let equalizer = null;
    let minimizeBtn = null;
    let bubble = null;

    let drag = null;

    const originalTitle = document.title;

    function isMobile() {
        return window.innerWidth < BREAKPOINT;
    }

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(
                value,
                max
            )
        );
    }

    function num(key, fallback) {
        const value = Number(
            localStorage.getItem(key)
        );

        return Number.isFinite(value)
            ? value
            : fallback;
    }

    function saveState(force = false) {
        if (
            !audio ||
            (!force && restoring)
        ) {
            return;
        }

        try {
            localStorage.setItem(
                KEY.track,
                String(currentTrack)
            );

            localStorage.setItem(
                KEY.src,
                tracks[currentTrack]?.src ||
                audio.currentSrc ||
                audio.src ||
                ""
            );

            localStorage.setItem(
                KEY.time,
                String(
                    audio.currentTime || 0
                )
            );

            localStorage.setItem(
                KEY.volume,
                String(audio.volume)
            );

            localStorage.setItem(
                KEY.muted,
                String(audio.muted)
            );

            localStorage.setItem(
                KEY.playing,
                String(shouldPlay)
            );

            localStorage.setItem(
                KEY.mode,
                String(playMode)
            );

            localStorage.setItem(
                KEY.display,
                String(displayMode)
            );
        } catch (e) { }
    }

    function saveExpandedPosition() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        localStorage.setItem(
            KEY.left,
            String(
                Math.round(rect.left)
            )
        );

        localStorage.setItem(
            KEY.top,
            String(
                Math.round(rect.top)
            )
        );
    }

    function saveBubblePosition() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        localStorage.setItem(
            KEY.bubbleLeft,
            String(
                Math.round(rect.left)
            )
        );

        localStorage.setItem(
            KEY.bubbleTop,
            String(
                Math.round(rect.top)
            )
        );
    }

    function setPosition(
        left,
        top,
        width,
        height
    ) {
        const maxLeft =
            Math.max(
                MARGIN,
                window.innerWidth -
                width -
                MARGIN
            );

        const maxTop =
            Math.max(
                MARGIN,
                window.innerHeight -
                height -
                MARGIN
            );

        root.style.left =
            clamp(
                left,
                MARGIN,
                maxLeft
            ) + "px";

        root.style.top =
            clamp(
                top,
                MARGIN,
                maxTop
            ) + "px";

        root.style.right =
            "auto";
    }

    function updateTitle() {
        const name =
            trackTitle.textContent.trim();

        if (
            !name ||
            name === "LOADING..." ||
            name === "PLAYLIST EMPTY" ||
            name === "FAILED TO LOAD PLAYLIST"
        ) {
            document.title =
                originalTitle;

            return;
        }

        document.title =
            name +
            " • About Parijat";
    }

    function updatePlayUI(
        playing
    ) {
        playBtn.innerHTML =
            playing
                ? `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">

          <path
            d="M6 5h4v14H6zm8 0h4v14h-4z"/>
        </svg>
      `
                : `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">

          <path
            d="M8 5v14l11-7z"/>
        </svg>
      `;

        player.classList.toggle(
            "playing",
            playing
        );

        bubble.classList.toggle(
            "playing",
            playing
        );
    }

    function updateMute() {
        muteBtn.innerHTML =
            audio.muted ||
                audio.volume === 0
                ? `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M16.5 12L19 14.5L17.5 16L15 13.5L12.5 16L11 14.5L13.5 12L11 9.5L12.5 8L15 10.5L17.5 8L19 9.5zM3 9v6h4l5 5V4L7 9H3z"/>
        </svg>
      `
                : `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M3 9v6h4l5 5V4L7 9H3z"/>
        </svg>
      `;
    }

    function updateMode() {

        if (
            playMode === 0
        ) {

            modeBtn.innerHTML =
                `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white">

            <path
              d="M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z"/>
          </svg>
        `;

        } else if (
            playMode === 1
        ) {

            modeBtn.innerHTML =
                `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white">

            <path
              d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.76L14.76 17.17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L5.17 21.24L3.76 19.83L9.29 14.29L10.71 15.71L6.41 20H4Z"/>
          </svg>
        `;

        } else {

            modeBtn.innerHTML =
                `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white">

            <path
              d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z"/>

            <circle
              cx="7"
              cy="18"
              r="4"
              fill="white"/>

            <text
              x="7"
              y="20"
              text-anchor="middle"
              font-size="5"
              fill="#ff512f"
              font-family="Arial"
              font-weight="bold">
              1
            </text>

          </svg>
        `;
        }
    }

    function setEqualizerColor(
        state
    ) {
        equalizer.classList.toggle(
            "loading",
            state === "loading"
        );

        equalizer.classList.toggle(
            "loaded",
            state === "loaded"
        );
    }

    function createPlayer() {

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "parijat-player-style";

        style.textContent =
            CSS;

        document.head.appendChild(
            style
        );

        root =
            document.createElement(
                "div"
            );

        root.id =
            "parijat-player-root";

        root.innerHTML =
            HTML;

        document.body.appendChild(
            root
        );

        player =
            root.querySelector(
                "#player"
            );

        audio =
            root.querySelector(
                "#audio"
            );

        prevBtn =
            root.querySelector(
                "#prevBtn"
            );

        playBtn =
            root.querySelector(
                "#playBtn"
            );

        nextBtn =
            root.querySelector(
                "#nextBtn"
            );

        seekbar =
            root.querySelector(
                "#seekbar"
            );

        trackTitle =
            root.querySelector(
                "#trackTitle"
            );

        trackArtist =
            root.querySelector(
                "#trackArtist"
            );

        volumeBar =
            root.querySelector(
                "#volumeBar"
            );

        muteBtn =
            root.querySelector(
                "#muteBtn"
            );

        modeBtn =
            root.querySelector(
                "#modeBtn"
            );

        equalizer =
            root.querySelector(
                ".equalizer"
            );

        preloader =
            document.createElement(
                "audio"
            );

        preloader.preload =
            "auto";

        preloader.style.display =
            "none";

        root.appendChild(
            preloader
        );

        minimizeBtn =
            document.createElement(
                "button"
            );

        minimizeBtn.type =
            "button";

        minimizeBtn.className =
            "parijat-minimize";

        minimizeBtn.textContent =
            "−";

        bubble =
            document.createElement(
                "button"
            );

        bubble.type =
            "button";

        bubble.className =
            "parijat-bubble";

        bubble.textContent =
            "🎵";

        root.appendChild(
            minimizeBtn
        );

        root.appendChild(
            bubble
        );
    }

    function moveContainer() {

        const sidebar =
            document.querySelector(
                ".sidebar-container"
            );

        if (
            isMobile()
        ) {

            if (
                sidebar &&
                root.parentElement !==
                sidebar
            ) {
                sidebar.appendChild(
                    root
                );
            }

            root.classList.remove(
                "minimized"
            );

            root.style.position =
                "relative";

            root.style.left =
                "auto";

            root.style.top =
                "auto";

            root.style.right =
                "auto";

            root.style.width =
                "100%";

            root.style.maxWidth =
                "none";

            root.style.zIndex =
                "auto";

            root.style.cursor =
                "default";

            displayMode =
                "expanded";

        } else {

            if (
                root.parentElement !==
                document.body
            ) {
                document.body.appendChild(
                    root
                );
            }

            root.style.position =
                "fixed";

            root.style.width =
                "360px";

            root.style.maxWidth =
                "calc(100vw - 24px)";

            root.style.zIndex =
                "2147483000";

            root.style.cursor =
                "grab";
        }
    }

    function restoreExpandedPosition() {

        if (
            isMobile()
        ) {
            return;
        }

        const left =
            Number(
                localStorage.getItem(
                    KEY.left
                )
            );

        const top =
            Number(
                localStorage.getItem(
                    KEY.top
                )
            );

        if (
            Number.isFinite(left) &&
            Number.isFinite(top)
        ) {

            root.style.left =
                left + "px";

            root.style.top =
                top + "px";

            root.style.right =
                "auto";

            clampCurrent();

        } else {

            root.style.left =
                "auto";

            root.style.top =
                "85px";

            root.style.right =
                "32px";
        }
    }

    function restoreBubblePosition() {

        if (
            isMobile()
        ) {
            return;
        }

        const left =
            Number(
                localStorage.getItem(
                    KEY.bubbleLeft
                )
            );

        const top =
            Number(
                localStorage.getItem(
                    KEY.bubbleTop
                )
            );

        if (
            Number.isFinite(left) &&
            Number.isFinite(top)
        ) {

            setPosition(
                left,
                top,
                58,
                58
            );

        } else {

            restoreExpandedPosition();
        }
    }

    function clampCurrent() {

        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        setPosition(
            rect.left,
            rect.top,
            rect.width,
            rect.height
        );
    }

    function syncDisplay() {

        moveContainer();

        if (
            isMobile()
        ) {
            return;
        }

        if (
            displayMode ===
            "minimized"
        ) {

            root.classList.add(
                "minimized"
            );

            root.style.width =
                "58px";

            root.style.maxWidth =
                "58px";

            restoreBubblePosition();

        } else {

            root.classList.remove(
                "minimized"
            );

            root.style.width =
                "360px";

            root.style.maxWidth =
                "calc(100vw - 24px)";

            restoreExpandedPosition();
        }

        updateBubbleState();
    }

    function minimizePlayer() {

        if (
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        const bubbleLeft =
            rect.right - 58;

        const bubbleTop =
            rect.top;

        localStorage.setItem(
            KEY.bubbleLeft,
            String(
                Math.round(
                    bubbleLeft
                )
            )
        );

        localStorage.setItem(
            KEY.bubbleTop,
            String(
                Math.round(
                    bubbleTop
                )
            )
        );

        displayMode =
            "minimized";

        root.classList.add(
            "minimized"
        );

        root.style.width =
            "58px";

        root.style.maxWidth =
            "58px";

        restoreBubblePosition();

        saveState(true);
    }

    function maximizePlayer() {

        if (
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        const left =
            rect.left;

        const top =
            rect.top;

        root.classList.remove(
            "minimized"
        );

        root.style.width =
            "360px";

        root.style.maxWidth =
            "calc(100vw - 24px)";


        root.style.visibility =
            "hidden";

        root.style.left =
            left + "px";

        root.style.top =
            top + "px";

        root.style.right =
            "auto";

        requestAnimationFrame(
            function () {

                const expanded =
                    root.getBoundingClientRect();

                setPosition(
                    left,
                    top,
                    expanded.width,
                    expanded.height
                );

                root.style.visibility =
                    "visible";

                displayMode =
                    "expanded";

                saveExpandedPosition();

                saveState(true);
            }
        );
    }

    function updateBubbleState() {

        if (
            !bubble
        ) {
            return;
        }

        bubble.classList.toggle(
            "playing",
            !audio.paused
        );
    }

    function loadTrack(
        index,
        restoreTime
    ) {

        if (
            !tracks.length
        ) {
            return;
        }

        currentTrack =
            clamp(
                index,
                0,
                tracks.length - 1
            );

        const track =
            tracks[currentTrack];

        const token =
            ++loadToken;

        setEqualizerColor(
            "loading"
        );

        trackTitle.textContent =
            (
                track.title ||
                "UNTITLED"
            ).toUpperCase();

        trackArtist.textContent =
            track.artist ||
            "";

        updateTitle();

        seekbar.value =
            "0";

        restoring =
            !!restoreTime;

        if (
            !restoreTime
        ) {
            audio.pause();
        }

        audio.src =
            track.src;

        audio.load();

        if (
            restoreTime
        ) {

            const savedTime =
                Math.max(
                    0,
                    num(
                        KEY.time,
                        0
                    )
                );

            const restore =
                function () {

                    if (
                        token !==
                        loadToken
                    ) {
                        return;
                    }

                    if (
                        !Number.isFinite(
                            audio.duration
                        ) ||
                        audio.duration <= 0
                    ) {
                        return;
                    }

                    audio.currentTime =
                        Math.min(
                            savedTime,
                            Math.max(
                                0,
                                audio.duration -
                                0.01
                            )
                        );

                    seekbar.value =
                        String(
                            (
                                audio.currentTime /
                                audio.duration
                            ) * 100
                        );

                    restoring =
                        false;
                };

            if (
                audio.readyState >= 1
            ) {
                restore();
            } else {

                audio.addEventListener(
                    "loadedmetadata",
                    restore,
                    {
                        once: true
                    }
                );
            }
        }
    }

    function chooseNextTrack() {

        if (
            !tracks.length
        ) {
            return -1;
        }

        if (
            playMode === 1 &&
            tracks.length > 1
        ) {

            let next =
                currentTrack;

            while (
                next ===
                currentTrack
            ) {

                next =
                    Math.floor(
                        Math.random() *
                        tracks.length
                    );
            }

            return next;
        }

        return (
            currentTrack + 1
        ) %
            tracks.length;
    }

    function preloadNextTrack() {

        if (
            !tracks.length ||
            !preloader ||
            playMode === 2
        ) {
            return;
        }

        if (
            queuedNextIndex < 0 ||
            queuedNextIndex ===
            currentTrack
        ) {

            queuedNextIndex =
                chooseNextTrack();
        }

        if (
            queuedNextIndex < 0 ||
            queuedNextIndex ===
            currentTrack ||
            preloadedIndex ===
            queuedNextIndex
        ) {
            return;
        }

        const next =
            tracks[
            queuedNextIndex
            ];

        if (
            !next ||
            !next.src
        ) {
            return;
        }

        preloadedIndex =
            queuedNextIndex;

        preloader.src =
            next.src;

        preloader.load();
    }

    function normalizePlaylist(
        data
    ) {

        if (
            !Array.isArray(data)
        ) {
            throw new Error(
                "Invalid playlist"
            );
        }

        return data
            .map(
                function (track) {

                    return {
                        title:
                            String(
                                track?.title ||
                                "UNTITLED"
                            ),

                        artist:
                            String(
                                track?.artist ||
                                ""
                            ),

                        src:
                            String(
                                track?.src ||
                                ""
                            )
                    };
                }
            )
            .filter(
                function (track) {
                    return !!track.src;
                }
            );
    }

    function getCachedPlaylist() {

        try {

            const cached =
                JSON.parse(
                    localStorage.getItem(
                        KEY.playlist
                    ) ||
                    "null"
                );

            return (
                Array.isArray(cached) &&
                cached.length
            )
                ? cached
                : null;

        } catch (e) {

            return null;
        }
    }

    function findSavedTrack() {

        const savedSrc =
            localStorage.getItem(
                KEY.src
            );

        if (
            savedSrc
        ) {

            const found =
                tracks.findIndex(
                    function (track) {
                        return (
                            track.src ===
                            savedSrc
                        );
                    }
                );

            if (
                found >= 0
            ) {
                return found;
            }
        }

        return clamp(
            num(
                KEY.track,
                0
            ),
            0,
            tracks.length - 1
        );
    }

    function initializePlaylist() {

        if (
            !tracks.length
        ) {
            return;
        }

        currentTrack =
            findSavedTrack();

        loadTrack(
            currentTrack,
            true
        );

        preloadNextTrack();
    }

    async function loadPlaylist() {

        const cached =
            getCachedPlaylist();

        if (
            cached
        ) {

            tracks =
                cached;

            initializePlaylist();
        }

        try {

            const response =
                await fetch(
                    PLAYLIST_URL,
                    {
                        cache:
                            "no-store"
                    }
                );

            if (
                !response.ok
            ) {
                throw new Error(
                    "HTTP " +
                    response.status
                );
            }

            const data =
                await response.json();

            const fresh =
                normalizePlaylist(
                    data
                );

            if (
                !fresh.length
            ) {
                throw new Error(
                    "Playlist empty"
                );
            }

            localStorage.setItem(
                KEY.playlist,
                JSON.stringify(
                    fresh
                )
            );

            const currentSrc =
                tracks[currentTrack]?.src ||
                localStorage.getItem(
                    KEY.src
                ) ||
                "";

            tracks =
                fresh;

            const matchingIndex =
                currentSrc
                    ? tracks.findIndex(
                        function (track) {
                            return (
                                track.src ===
                                currentSrc
                            );
                        }
                    )
                    : -1;

            if (
                matchingIndex >= 0
            ) {
                currentTrack =
                    matchingIndex;
            }

            if (
                !cached
            ) {

                initializePlaylist();

            } else {

                if (
                    tracks[currentTrack]
                ) {

                    trackTitle.textContent =
                        (
                            tracks[currentTrack].title ||
                            "UNTITLED"
                        ).toUpperCase();

                    trackArtist.textContent =
                        tracks[currentTrack].artist ||
                        "";

                    updateTitle();
                }

                preloadNextTrack();
            }

        } catch (error) {

            if (
                !cached
            ) {

                trackTitle.textContent =
                    "FAILED TO LOAD PLAYLIST";

                trackArtist.textContent =
                    "";

                setEqualizerColor(
                    "loading"
                );
            }
        }
    }

    function restoreSettings() {

        playMode =
            clamp(
                num(
                    KEY.mode,
                    0
                ),
                0,
                2
            );

        const volume =
            clamp(
                num(
                    KEY.volume,
                    1
                ),
                0,
                1
            );

        audio.volume =
            volume;

        audio.muted =
            localStorage.getItem(
                KEY.muted
            ) === "true";

        volumeBar.value =
            volume;

        shouldPlay =
            localStorage.getItem(
                KEY.playing
            ) === "true";

        displayMode =
            localStorage.getItem(
                KEY.display
            ) === "minimized"
                ? "minimized"
                : "expanded";

        updateMute();
        updateMode();
    }

    function bindEvents() {

        playBtn.addEventListener(
            "click",
            function () {

                if (
                    audio.paused
                ) {
                    playAudio();
                } else {
                    pauseAudio();
                }
            }
        );

        nextBtn.addEventListener(
            "click",
            nextTrack
        );

        prevBtn.addEventListener(
            "click",
            previousTrack
        );

        seekbar.addEventListener(
            "input",
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    audio.currentTime =
                        (
                            Number(
                                seekbar.value
                            ) / 100
                        ) *
                        audio.duration;
                }

                saveState(true);
            }
        );

        volumeBar.addEventListener(
            "input",
            function () {

                audio.volume =
                    Number(
                        volumeBar.value
                    );

                if (
                    audio.volume > 0
                ) {
                    audio.muted =
                        false;
                }

                updateMute();

                saveState(true);
            }
        );

        muteBtn.addEventListener(
            "click",
            function () {

                if (
                    audio.muted ||
                    audio.volume === 0
                ) {

                    audio.muted =
                        false;

                    if (
                        audio.volume === 0
                    ) {

                        audio.volume =
                            Math.max(
                                0.01,
                                num(
                                    KEY.volume,
                                    1
                                )
                            );

                        volumeBar.value =
                            audio.volume;
                    }

                } else {

                    audio.muted =
                        true;
                }

                updateMute();
                saveState(true);
            }
        );

        modeBtn.addEventListener(
            "click",
            function () {

                playMode =
                    (
                        playMode + 1
                    ) % 3;

                queuedNextIndex =
                    -1;

                preloadedIndex =
                    -1;

                updateMode();
                preloadNextTrack();
                saveState(true);
            }
        );

        minimizeBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                minimizePlayer();
            }
        );

        bubble.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                if (
                    bubble.dataset.dragged
                ) {

                    delete bubble.dataset.dragged;

                    return;
                }

                maximizePlayer();
            }
        );

        audio.addEventListener(
            "loadedmetadata",
            function () {

                if (
                    restoring &&
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    const savedTime =
                        Math.max(
                            0,
                            num(
                                KEY.time,
                                0
                            )
                        );

                    audio.currentTime =
                        Math.min(
                            savedTime,
                            Math.max(
                                0,
                                audio.duration -
                                0.01
                            )
                        );

                    seekbar.value =
                        String(
                            (
                                audio.currentTime /
                                audio.duration
                            ) * 100
                        );

                    restoring =
                        false;
                }
            }
        );

        audio.addEventListener(
            "canplay",
            function () {

                setEqualizerColor(
                    "loaded"
                );

                if (
                    shouldPlay &&
                    audio.paused
                ) {

                    playAudio();
                }

                preloadNextTrack();
            }
        );

        audio.addEventListener(
            "play",
            function () {

                updatePlayUI(
                    true
                );

                if (
                    !restoring
                ) {
                    saveState(true);
                }
            }
        );

        audio.addEventListener(
            "pause",
            function () {

                updatePlayUI(
                    false
                );

                if (
                    !restoring
                ) {
                    saveState(true);
                }
            }
        );

        audio.addEventListener(
            "volumechange",
            function () {

                volumeBar.value =
                    audio.volume;

                updateMute();

                if (
                    !restoring
                ) {
                    saveState(true);
                }
            }
        );

        audio.addEventListener(
            "timeupdate",
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    seekbar.value =
                        String(
                            (
                                audio.currentTime /
                                audio.duration
                            ) * 100
                        );

                    if (
                        audio.duration -
                        audio.currentTime <=
                        PRELOAD_SECONDS
                    ) {

                        preloadNextTrack();
                    }
                }

                if (
                    !restoring
                ) {
                    saveState();
                }
            }
        );

        audio.addEventListener(
            "ended",
            function () {

                if (
                    playMode === 2
                ) {

                    audio.currentTime =
                        0;

                    playAudio();

                } else {

                    nextTrack();
                }
            }
        );

        root.addEventListener(
            "pointerdown",
            dragStart,
            false
        );

        window.addEventListener(
            "resize",
            syncDisplay
        );

        window.addEventListener(
            "beforeunload",
            function () {

                saveState(true);
                savePositionForMode();
            }
        );

        window.addEventListener(
            "pagehide",
            function () {

                saveState(true);
                savePositionForMode();
            }
        );

        document.addEventListener(
            "visibilitychange",
            function () {

                saveState(true);

                if (
                    document.visibilityState ===
                    "hidden"
                ) {
                    savePositionForMode();
                }
            }
        );

        document.addEventListener(
            "pointerdown",
            function () {

                if (
                    shouldPlay &&
                    audio.paused
                ) {
                    playAudio();
                }
            },
            {
                passive: true
            }
        );
    }

    function playAudio() {

        shouldPlay =
            true;

        audio.play()
            .then(
                function () {

                    updatePlayUI(
                        true
                    );

                    if (
                        !restoring
                    ) {
                        saveState(true);
                    }
                }
            )
            .catch(
                function () {

                    updatePlayUI(
                        false
                    );

                    if (
                        !restoring
                    ) {
                        saveState(true);
                    }
                }
            );
    }

    function pauseAudio() {

        shouldPlay =
            false;

        audio.pause();

        updatePlayUI(
            false
        );

        saveState(true);
    }

    function nextTrack() {

        if (
            !tracks.length
        ) {
            return;
        }

        let nextIndex;

        if (
            queuedNextIndex >= 0 &&
            queuedNextIndex !==
            currentTrack
        ) {

            nextIndex =
                queuedNextIndex;

        } else {

            nextIndex =
                chooseNextTrack();
        }

        currentTrack =
            nextIndex;

        queuedNextIndex =
            -1;

        preloadedIndex =
            -1;

        loadTrack(
            currentTrack,
            false
        );

        preloadNextTrack();

        playAudio();
    }

    function previousTrack() {

        if (
            !tracks.length
        ) {
            return;
        }

        currentTrack =
            (
                currentTrack - 1 +
                tracks.length
            ) %
            tracks.length;

        queuedNextIndex =
            -1;

        preloadedIndex =
            -1;

        loadTrack(
            currentTrack,
            false
        );

        preloadNextTrack();

        playAudio();
    }

    function dragStart(event) {

        if (
            isMobile()
        ) {
            return;
        }

        if (
            event.button !==
            undefined &&
            event.button !== 0
        ) {
            return;
        }

        const bubbleTarget =
            event.target.closest(
                ".parijat-bubble"
            );

        if (
            !bubbleTarget &&
            event.target.closest(
                "button,input,select,textarea"
            )
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        drag = {
            pointerId:
                event.pointerId,

            startX:
                event.clientX,

            startY:
                event.clientY,

            left:
                rect.left,

            top:
                rect.top,

            moved:
                false,

            bubble:
                !!bubbleTarget
        };

        root.classList.add(
            "dragging"
        );

        document.addEventListener(
            "pointermove",
            dragMove,
            true
        );

        document.addEventListener(
            "pointerup",
            dragEnd,
            true
        );

        document.addEventListener(
            "pointercancel",
            dragEnd,
            true
        );

        event.preventDefault();
    }

    function dragMove(event) {

        if (
            !drag ||
            event.pointerId !==
            drag.pointerId
        ) {
            return;
        }

        const dx =
            event.clientX -
            drag.startX;

        const dy =
            event.clientY -
            drag.startY;

        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {
            drag.moved =
                true;
        }

        setPosition(
            drag.left + dx,
            drag.top + dy,
            root.offsetWidth,
            root.offsetHeight
        );
    }

    function dragEnd(event) {

        if (
            !drag ||
            event.pointerId !==
            drag.pointerId
        ) {
            return;
        }

        const state =
            drag;

        drag =
            null;

        root.classList.remove(
            "dragging"
        );

        document.removeEventListener(
            "pointermove",
            dragMove,
            true
        );

        document.removeEventListener(
            "pointerup",
            dragEnd,
            true
        );

        document.removeEventListener(
            "pointercancel",
            dragEnd,
            true
        );

        if (
            state.bubble
        ) {

            saveBubblePosition();

            if (
                state.moved
            ) {

                bubble.dataset.dragged =
                    "true";

                setTimeout(
                    function () {

                        delete bubble.dataset.dragged;

                    },
                    120
                );
            }

        } else {

            saveExpandedPosition();
        }

        saveState(true);
    }

    function savePositionForMode() {

        if (
            displayMode ===
            "minimized"
        ) {

            saveBubblePosition();

        } else {

            saveExpandedPosition();
        }
    }

    function start() {

        if (
            document.getElementById(
                "parijat-player-root"
            )
        ) {
            return;
        }

        createPlayer();

        restoreSettings();

        bindEvents();

        moveContainer();

        syncDisplay();

        loadPlaylist();

        setInterval(
            function () {
                saveState();
            },
            500
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once: true
            }
        );

    } else {

        start();
    }

})();