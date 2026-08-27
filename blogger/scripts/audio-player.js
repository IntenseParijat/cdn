(function () {
    "use strict";

    const PLAYLIST_URL =
        "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";

    const PLAYER_ID = "parijat-floating-player";
    const BREAKPOINT = 600;
    const MARGIN = 16;

    const STORAGE = {
        track: "cyberPlayerTrack",
        time: "cyberPlayerTime",
        volume: "cyberPlayerVolume",
        muted: "cyberPlayerMuted",
        playing: "cyberPlayerPlaying",
        mode: "cyberPlayerMode",
        displayMode: "cyberPlayerDisplayMode",
        left: "floatingMusicPlayerLeft",
        top: "floatingMusicPlayerTop"
    };

    let widget = null;
    let player = null;
    let audio = null;

    let playBtn = null;
    let nextBtn = null;
    let prevBtn = null;
    let seekbar = null;
    let trackTitle = null;
    let trackArtist = null;
    let volumeBar = null;
    let muteBtn = null;
    let modeBtn = null;

    let minimizeBtn = null;
    let bubble = null;

    let tracks = [];
    let currentTrack = 0;
    let playMode = 0;
    let displayMode = "expanded";

    let originalTitle = document.title;

    let pendingResume = false;

    let dragging = false;
    let dragMoved = false;
    let dragPointerId = null;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;


    /* =========================================================
       PLAYER HTML
       ========================================================= */

    const PLAYER_HTML = `
    <div class="cyber-player" id="player">

      <div class="glow"></div>

      <div class="top-row">

        <button id="prevBtn">
          <svg viewBox="0 0 24 24"
               width="24"
               height="24"
               fill="white">
            <path d="M6 6h2v12H6zm3.5 6L18 18V6z"/>
          </svg>
        </button>

        <button id="playBtn">
          <svg id="playIcon"
               viewBox="0 0 24 24"
               width="24"
               height="24"
               fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <button id="nextBtn">
          <svg viewBox="0 0 24 24"
               width="24"
               height="24"
               fill="white">
            <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>
          </svg>
        </button>

      </div>

      <div class="track-info">

        <div class="track-title" id="trackTitle">
          LOADING...
        </div>

        <div class="track-artist" id="trackArtist"></div>

      </div>

      <div class="equalizer">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div class="seekbar-container">

        <input
          type="range"
          id="seekbar"
          value="0"
          min="0"
          max="100"
          step="0.01"
        />

        <button
          id="modeBtn"
          class="mode-btn"
          aria-label="Playback mode">
        </button>

      </div>

      <div class="volume-container">

        <button
          id="muteBtn"
          aria-label="Mute">
        </button>

        <input
          type="range"
          id="volumeBar"
          min="0"
          max="1"
          step="0.01"
          value="1"
        />

      </div>

      <audio id="audio"></audio>

    </div>
  `;


    /* =========================================================
       PLAYER CSS
       ========================================================= */

    const PLAYER_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap');

    #${PLAYER_ID} {
      position: fixed;

      top: 85px;
      right: 32px;
      left: auto;

      width: 360px;
      max-width: calc(100vw - 24px);

      margin: 0;
      padding: 0;

      z-index: 2147483000;

      overflow: visible;

      pointer-events: auto;

      user-select: none;
      -webkit-user-select: none;

      touch-action: none;

      cursor: grab;
    }


    #${PLAYER_ID}.dragging {
      cursor: grabbing;
    }


    /* ---------------------------------------------------------
       MAIN PLAYER
       --------------------------------------------------------- */

    #${PLAYER_ID} .cyber-player {
      box-sizing: border-box;

      position: relative;

      width: 100%;
      max-width: 360px;

      padding: 20px;

      border-radius: 20px;

      background:
        linear-gradient(
          145deg,
          rgba(20,20,20,0.95),
          rgba(35,35,35,0.85)
        );

      border:
        1px solid
        rgba(255,115,87,0.25);

      box-shadow:
        0 0 25px rgba(255,115,87,0.12),
        inset 0 0 25px rgba(255,255,255,0.03);

      overflow: hidden;

      backdrop-filter: blur(18px);

      pointer-events: auto;
    }


    #${PLAYER_ID} .glow {

      position: absolute;

      inset: 0;

      background:
        radial-gradient(
          circle at center,
          rgba(255,115,87,0.12),
          transparent 70%
        );

      opacity: 0;

      transition: 0.5s;

      pointer-events: none;
    }


    #${PLAYER_ID} .cyber-player.playing .glow {
      opacity: 1;
    }


    /* ---------------------------------------------------------
       TOP CONTROLS
       --------------------------------------------------------- */

    #${PLAYER_ID} .top-row {

      display: flex;

      justify-content: center;

      gap: 16px;

      margin-bottom: 16px;
    }


    #${PLAYER_ID} .top-row button {

      width: 58px;
      height: 58px;

      border: none;

      border-radius: 50%;

      cursor: pointer !important;

      display: flex;

      align-items: center;
      justify-content: center;

      color: white;

      background:
        linear-gradient(
          145deg,
          #ff7357,
          #ff512f
        );

      box-shadow:
        0 0 18px rgba(255,115,87,0.4);

      transition: 0.25s;

      position: relative;

      z-index: 2;

      pointer-events: auto;
    }


    #${PLAYER_ID} .top-row button:hover {

      transform: scale(1.08);

      box-shadow:
        0 0 25px rgba(255,115,87,0.8);
    }


    /* ---------------------------------------------------------
       TRACK INFORMATION
       --------------------------------------------------------- */

    #${PLAYER_ID} .track-info {

      width: 100%;

      text-align: center;

      margin-bottom: 18px;

      display: flex;

      flex-direction: column;

      align-items: center;
    }


    #${PLAYER_ID} .track-title {

      color: #ffffff;

      font-family:
        'Orbitron',
        sans-serif;

      font-size: 12px;

      letter-spacing: 1.5px;

      text-transform: uppercase;

      line-height: 1.4;

      word-break: break-word;

      overflow-wrap: anywhere;
    }


    #${PLAYER_ID} .track-artist {

      margin-top: 4px;

      color:
        rgba(255,255,255,.55);

      font-family:
        'Orbitron',
        sans-serif;

      font-size: 10px;

      letter-spacing: 1px;

      text-transform: uppercase;

      line-height: 1.3;

      word-break: break-word;

      overflow-wrap: anywhere;
    }


    /* ---------------------------------------------------------
       EQUALIZER
       --------------------------------------------------------- */

    #${PLAYER_ID} .equalizer {

      display: flex;

      justify-content: center;

      align-items: flex-end;

      gap: 5px;

      height: 34px;

      margin-bottom: 18px;
    }


    #${PLAYER_ID} .equalizer span {

      width: 5px;

      border-radius: 20px;

      background: #ff7357;

      box-shadow:
        0 0 12px
        rgba(255,115,87,0.8);

      animation:
        parijat-eq
        1s infinite ease-in-out;

      animation-play-state:
        paused;
    }


    #${PLAYER_ID} .cyber-player.playing
      .equalizer span {

      animation-play-state:
        running;
    }


    #${PLAYER_ID}
      .equalizer span:nth-child(1) {
      animation-delay: 0s;
    }

    #${PLAYER_ID}
      .equalizer span:nth-child(2) {
      animation-delay: .15s;
    }

    #${PLAYER_ID}
      .equalizer span:nth-child(3) {
      animation-delay: .30s;
    }

    #${PLAYER_ID}
      .equalizer span:nth-child(4) {
      animation-delay: .45s;
    }

    #${PLAYER_ID}
      .equalizer span:nth-child(5) {
      animation-delay: .60s;
    }


    @keyframes parijat-eq {

      0%,100% {
        height: 10px;
      }

      50% {
        height: 34px;
      }
    }


    /* ---------------------------------------------------------
       SEEK BAR
       --------------------------------------------------------- */

    #${PLAYER_ID} .seekbar-container {

      display: flex;

      align-items: center;

      gap: 10px;

      width: 100%;
    }


    #${PLAYER_ID} #seekbar {

      flex: 1;

      accent-color:
        #ff7357;

      cursor: pointer;
    }


    /* ---------------------------------------------------------
       VOLUME
       --------------------------------------------------------- */

    #${PLAYER_ID} .volume-container {

      display: flex;

      align-items: center;

      gap: 12px;

      margin-top: 14px;

      width: 100%;
    }


    #${PLAYER_ID} #muteBtn {

      width: 38px;
      height: 38px;

      border: none;

      border-radius: 50%;

      cursor: pointer;

      display: flex;

      align-items: center;
      justify-content: center;

      background:
        linear-gradient(
          145deg,
          #ff7357,
          #ff512f
        );

      box-shadow:
        0 0 12px
        rgba(255,115,87,0.4);

      transition: .25s;
    }


    #${PLAYER_ID} #muteBtn:hover {

      transform: scale(1.08);

      box-shadow:
        0 0 18px
        rgba(255,115,87,0.8);
    }


    #${PLAYER_ID} #volumeBar {

      flex: 1;

      accent-color:
        #ff7357;

      cursor: pointer;
    }


    /* ---------------------------------------------------------
       PLAY MODE BUTTON
       --------------------------------------------------------- */

    #${PLAYER_ID} .mode-btn {

      width: 38px;
      height: 38px;

      min-width: 38px;

      border: none;

      border-radius: 50%;

      cursor: pointer;

      display: flex;

      align-items: center;
      justify-content: center;

      background:
        linear-gradient(
          145deg,
          #ff7357,
          #ff512f
        );

      box-shadow:
        0 0 12px
        rgba(255,115,87,0.4);

      transition: .25s;
    }


    #${PLAYER_ID} .mode-btn:hover {

      transform: scale(1.08);

      box-shadow:
        0 0 18px
        rgba(255,115,87,0.8);
    }


    /* ---------------------------------------------------------
       MINIMIZE BUTTON
       --------------------------------------------------------- */

    #${PLAYER_ID} .floating-minimize-btn {

      position: absolute;

      top: 7px;
      right: 7px;

      z-index: 10;

      width: 28px;
      height: 28px;

      padding: 0;

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius: 50%;

      background:
        rgba(20,20,20,.72);

      color: #ffffff;

      font:
        700 18px/26px
        Arial,sans-serif;

      cursor: pointer !important;

      display: flex;

      align-items: center;
      justify-content: center;
    }


    /* ---------------------------------------------------------
       MINIMIZED BUBBLE
       --------------------------------------------------------- */

    #${PLAYER_ID}
      .music-player-bubble {

      display: none;
    }


    #${PLAYER_ID}.parijat-player-minimized {

      width: 58px;

      max-width: 58px;

      height: 58px;
    }


    #${PLAYER_ID}.parijat-player-minimized
      #player {

      display: none;
    }


    #${PLAYER_ID}.parijat-player-minimized
      .floating-minimize-btn {

      display: none;
    }


    #${PLAYER_ID}.parijat-player-minimized
      .music-player-bubble {

      position: relative;

      display: flex;

      align-items: center;
      justify-content: center;

      width: 58px;
      height: 58px;

      margin: 0;
      padding: 0;

      border:
        1px solid
        rgba(255,115,87,.4);

      border-radius: 50%;

      background:
        linear-gradient(
          145deg,
          #1f1f1f,
          #121212
        );

      color: #ffffff;

      font-size: 28px;

      line-height: 1;

      cursor: pointer !important;

      box-sizing: border-box;

      box-shadow:
        0 0 20px
        rgba(255,115,87,.18),

        inset 0 0 20px
        rgba(255,255,255,.03);

      touch-action: none;
    }


    /*
     * Loading-style ring around the bubble.
     */

    #${PLAYER_ID}.parijat-player-minimized
      .music-player-bubble::after {

      content: "";

      display: none;

      position: absolute;

      inset: -5px;

      border-radius: 50%;

      background:
        conic-gradient(
          from 0deg,

          transparent 0deg,
          transparent 45deg,

          #ff7357 90deg,
          #ff7357 135deg,

          transparent 180deg,
          transparent 360deg
        );

      -webkit-mask:
        radial-gradient(
          farthest-side,
          transparent calc(100% - 2px),
          #000 calc(100% - 2px)
        );

      mask:
        radial-gradient(
          farthest-side,
          transparent calc(100% - 2px),
          #000 calc(100% - 2px)
        );

      animation:
        parijat-player-loading
        1s linear infinite;

      pointer-events: none;
    }


    #${PLAYER_ID}.parijat-player-minimized
      .music-player-bubble.is-playing::after {

      display: block;
    }


    @keyframes parijat-player-loading {

      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }


    /* ---------------------------------------------------------
       SMALL SCREENS
       --------------------------------------------------------- */

    @media (max-width: 600px) {

      #${PLAYER_ID} {

        top: 76px;

        right: 12px;

        width:
          min(
            360px,
            calc(100vw - 24px)
          );
      }
    }
  `;


    /* =========================================================
       CREATE PLAYER
       ========================================================= */

    function createPlayer() {

        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return false;
        }


        const style =
            document.createElement("style");

        style.id =
            PLAYER_ID +
            "-styles";

        style.textContent =
            PLAYER_CSS;

        document.head.appendChild(
            style
        );


        widget =
            document.createElement("div");

        widget.id =
            PLAYER_ID;

        widget.innerHTML =
            PLAYER_HTML;

        document.body.appendChild(
            widget
        );


        player =
            widget.querySelector(
                "#player"
            );

        audio =
            widget.querySelector(
                "#audio"
            );

        playBtn =
            widget.querySelector(
                "#playBtn"
            );

        nextBtn =
            widget.querySelector(
                "#nextBtn"
            );

        prevBtn =
            widget.querySelector(
                "#prevBtn"
            );

        seekbar =
            widget.querySelector(
                "#seekbar"
            );

        trackTitle =
            widget.querySelector(
                "#trackTitle"
            );

        trackArtist =
            widget.querySelector(
                "#trackArtist"
            );

        volumeBar =
            widget.querySelector(
                "#volumeBar"
            );

        muteBtn =
            widget.querySelector(
                "#muteBtn"
            );

        modeBtn =
            widget.querySelector(
                "#modeBtn"
            );


        /* ---------------------------------------------------------
           Minimize control
           --------------------------------------------------------- */

        minimizeBtn =
            document.createElement(
                "button"
            );

        minimizeBtn.type =
            "button";

        minimizeBtn.className =
            "floating-minimize-btn";

        minimizeBtn.textContent =
            "−";

        minimizeBtn.title =
            "Minimize player";

        minimizeBtn.setAttribute(
            "aria-label",
            "Minimize player"
        );


        /* ---------------------------------------------------------
           Bubble
           --------------------------------------------------------- */

        bubble =
            document.createElement(
                "button"
            );

        bubble.type =
            "button";

        bubble.className =
            "music-player-bubble";

        bubble.textContent =
            "🎵";

        bubble.title =
            "Open music player";

        bubble.setAttribute(
            "aria-label",
            "Open music player"
        );


        widget.appendChild(
            minimizeBtn
        );

        widget.appendChild(
            bubble
        );

        return true;
    }


    /* =========================================================
       TAB TITLE
       ========================================================= */

    function updateTabTitle() {

        const name =
            trackTitle?.textContent?.trim();

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
            name.toUpperCase() +
            " • About Parijat";
    }


    /* =========================================================
       PLAYER STATE
       ========================================================= */

    function saveState() {

        if (!audio) {
            return;
        }

        try {

            localStorage.setItem(
                STORAGE.track,
                String(
                    currentTrack
                )
            );

            localStorage.setItem(
                STORAGE.time,
                String(
                    audio.currentTime || 0
                )
            );

            localStorage.setItem(
                STORAGE.volume,
                String(
                    audio.volume
                )
            );

            localStorage.setItem(
                STORAGE.muted,
                String(
                    audio.muted
                )
            );

            localStorage.setItem(
                STORAGE.playing,
                String(
                    !audio.paused
                )
            );

            localStorage.setItem(
                STORAGE.mode,
                String(
                    playMode
                )
            );

            localStorage.setItem(
                STORAGE.displayMode,
                displayMode
            );

        } catch (_) { }
    }


    function savePosition() {

        if (
            !widget ||
            !isDesktop()
        ) {
            return;
        }

        const rect =
            widget.getBoundingClientRect();

        localStorage.setItem(
            STORAGE.left,
            String(
                Math.round(
                    rect.left
                )
            )
        );

        localStorage.setItem(
            STORAGE.top,
            String(
                Math.round(
                    rect.top
                )
            )
        );
    }


    /* =========================================================
       VIEWPORT
       ========================================================= */

    function isDesktop() {

        return (
            window.innerWidth >
            BREAKPOINT
        );
    }


    function clampPlayer() {

        if (
            !widget ||
            !isDesktop()
        ) {
            return;
        }

        const rect =
            widget.getBoundingClientRect();

        const maxLeft =
            Math.max(
                MARGIN,
                window.innerWidth -
                rect.width -
                MARGIN
            );

        const maxTop =
            Math.max(
                MARGIN,
                window.innerHeight -
                rect.height -
                MARGIN
            );

        const left =
            Math.max(
                MARGIN,
                Math.min(
                    rect.left,
                    maxLeft
                )
            );

        const top =
            Math.max(
                MARGIN,
                Math.min(
                    rect.top,
                    maxTop
                )
            );

        widget.style.left =
            left + "px";

        widget.style.top =
            top + "px";

        widget.style.right =
            "auto";
    }


    function restorePosition() {

        if (!isDesktop()) {
            return;
        }

        const savedLeft =
            Number(
                localStorage.getItem(
                    STORAGE.left
                )
            );

        const savedTop =
            Number(
                localStorage.getItem(
                    STORAGE.top
                )
            );


        if (
            Number.isFinite(
                savedLeft
            ) &&
            Number.isFinite(
                savedTop
            )
        ) {

            widget.style.left =
                savedLeft + "px";

            widget.style.top =
                savedTop + "px";

            widget.style.right =
                "auto";

        } else {

            widget.style.left =
                "auto";

            widget.style.top =
                "85px";

            widget.style.right =
                "32px";
        }


        clampPlayer();
    }


    /* =========================================================
       DISPLAY MODE
       ========================================================= */

    function setDisplayMode(
        mode
    ) {

        if (
            mode === "minimized"
        ) {

            displayMode =
                "minimized";

            widget.classList.add(
                "parijat-player-minimized"
            );

            clampPlayer();
            savePosition();
            saveState();

            return;
        }


        expandSafely();
    }


    function expandSafely() {

        if (!isDesktop()) {
            return;
        }


        const oldRect =
            widget.getBoundingClientRect();


        /*
         * Reveal the player invisibly.
         */

        widget.classList.remove(
            "parijat-player-minimized"
        );

        widget.style.visibility =
            "hidden";

        widget.style.left =
            oldRect.left + "px";

        widget.style.top =
            oldRect.top + "px";

        widget.style.right =
            "auto";


        /*
         * Wait for the browser to calculate
         * the full player's dimensions.
         */

        requestAnimationFrame(
            function () {

                clampPlayer();

                displayMode =
                    "expanded";

                widget.style.visibility =
                    "visible";

                savePosition();
                saveState();
            }
        );
    }


    function restoreDisplayMode() {

        displayMode =
            localStorage.getItem(
                STORAGE.displayMode
            ) === "minimized"
                ? "minimized"
                : "expanded";

        if (
            !isDesktop()
        ) {

            displayMode =
                "expanded";

            widget.classList.remove(
                "parijat-player-minimized"
            );

            return;
        }


        widget.classList.toggle(
            "parijat-player-minimized",
            displayMode ===
            "minimized"
        );
    }


    /* =========================================================
       PLAYBACK UI
       ========================================================= */

    function updatePlayButton(
        playing
    ) {

        playBtn.innerHTML =
            playing
                ? `
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white"
          >
            <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>
          </svg>
        `
                : `
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white"
          >
            <path d="M8 5v14l11-7z"/>
          </svg>
        `;

        player.classList.toggle(
            "playing",
            playing
        );

        bubble.classList.toggle(
            "is-playing",
            playing
        );
    }


    function updateMuteButton() {

        const muted =
            audio.muted ||
            audio.volume === 0;

        muteBtn.innerHTML =
            muted
                ? `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white"
          >
            <path d="M16.5 12L19 14.5L17.5 16L15 13.5L12.5 16L11 14.5L13.5 12L11 9.5L12.5 8L15 10.5L17.5 8L19 9.5zM3 9v6h4l5 5V4L7 9H3z"/>
          </svg>
        `
                : `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3z"/>
          </svg>
        `;
    }


    function updateModeButton() {

        const icons = [

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z"/>
        </svg>
      `,

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.59L14.76 17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L8.41 18H4Z"/>
        </svg>
      `,

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z"/>
          <circle
            cx="7"
            cy="18"
            r="4"
            fill="white"
          />
          <text
            x="7"
            y="20"
            text-anchor="middle"
            font-size="5"
            fill="#ff512f"
            font-family="Arial"
            font-weight="bold"
          >1</text>
        </svg>
      `
        ];

        modeBtn.innerHTML =
            icons[playMode];
    }


    /* =========================================================
       TRACK LOADING
       ========================================================= */

    function loadTrack(
        index
    ) {

        if (
            !tracks.length
        ) {
            return;
        }


        currentTrack =
            Math.max(
                0,
                Math.min(
                    index,
                    tracks.length - 1
                )
            );


        const track =
            tracks[currentTrack];


        audio.src =
            track.src;


        trackTitle.textContent =
            track.title ||
            "UNTITLED";


        trackArtist.textContent =
            track.artist ||
            "";


        updateTabTitle();
    }


    /* =========================================================
       PLAYLIST
       ========================================================= */

    async function loadPlaylist() {

        try {

            const response =
                await fetch(
                    PLAYLIST_URL,
                    {
                        cache: "no-cache"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Playlist request failed: " +
                    response.status
                );
            }


            const data =
                await response.json();


            if (!Array.isArray(data)) {

                throw new Error(
                    "Playlist JSON is not an array"
                );
            }


            tracks =
                data
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


            if (!tracks.length) {

                trackTitle.textContent =
                    "PLAYLIST EMPTY";

                return;
            }


            currentTrack =
                Math.max(
                    0,
                    Math.min(
                        n(
                            localStorage.getItem(
                                STORAGE.track
                            ),
                            0
                        ),
                        tracks.length - 1
                    )
                );


            playMode =
                Math.max(
                    0,
                    Math.min(
                        2,
                        n(
                            localStorage.getItem(
                                STORAGE.mode
                            ),
                            0
                        )
                    )
                );


            loadTrack(
                currentTrack
            );


            restoreState();

        } catch (error) {

            console.error(
                "[Cyber Player]",
                error
            );

            trackTitle.textContent =
                "FAILED TO LOAD PLAYLIST";
        }
    }


    /* =========================================================
       RESTORE AUDIO STATE
       ========================================================= */

    function restoreState() {

        const savedTime =
            Math.max(
                0,
                n(
                    localStorage.getItem(
                        STORAGE.time
                    ),
                    0
                )
            );


        const savedVolume =
            Math.max(
                0,
                Math.min(
                    1,
                    n(
                        localStorage.getItem(
                            STORAGE.volume
                        ),
                        1
                    )
                )
            );


        const savedMuted =
            localStorage.getItem(
                STORAGE.muted
            ) === "true";


        const savedPlaying =
            localStorage.getItem(
                STORAGE.playing
            ) === "true";


        audio.volume =
            savedVolume;

        audio.muted =
            savedMuted;

        volumeBar.value =
            savedVolume;


        updateMuteButton();
        updateModeButton();


        const restoreTime =
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    audio.currentTime =
                        Math.min(
                            savedTime,
                            Math.max(
                                0,
                                audio.duration - 0.01
                            )
                        );


                    seekbar.value =
                        (
                            audio.currentTime /
                            audio.duration
                        ) * 100;
                }
            };


        if (
            audio.readyState >= 1
        ) {

            restoreTime();

        } else {

            audio.addEventListener(
                "loadedmetadata",
                restoreTime,
                {
                    once: true
                }
            );
        }


        if (
            savedPlaying
        ) {

            pendingResume =
                true;

            tryResume();

        } else {

            pendingResume =
                false;

            audio.pause();

            updatePlayButton(
                false
            );
        }


        restoreDisplayMode();
    }


    /* =========================================================
       AUTOPLAY RESUME
       ========================================================= */

    async function tryResume() {

        if (
            !pendingResume
        ) {
            return;
        }


        try {

            await audio.play();

            pendingResume =
                false;

            updatePlayButton(
                true
            );

        } catch (_) {

            /*
             * Browser autoplay policy.
             * The saved state stays intact.
             */
        }
    }


    /* =========================================================
       PLAY / PAUSE
       ========================================================= */

    async function playAudio() {

        try {

            await audio.play();

            pendingResume =
                false;

            updatePlayButton(
                true
            );

            saveState();

        } catch (error) {

            pendingResume =
                true;

            updatePlayButton(
                false
            );

            console.warn(
                "[Cyber Player] Playback blocked:",
                error
            );
        }
    }


    function pauseAudio() {

        audio.pause();

        pendingResume =
            false;

        updatePlayButton(
            false
        );

        saveState();
    }


    /* =========================================================
       NEXT / PREVIOUS
       ========================================================= */

    function nextTrack() {

        if (!tracks.length) {
            return;
        }


        if (
            playMode === 1 &&
            tracks.length > 1
        ) {

            let next =
                currentTrack;


            while (
                next === currentTrack
            ) {

                next =
                    Math.floor(
                        Math.random() *
                        tracks.length
                    );
            }


            currentTrack =
                next;

        } else {

            currentTrack =
                (
                    currentTrack + 1
                ) %
                tracks.length;
        }


        loadTrack(
            currentTrack
        );


        playAudio();
    }


    function previousTrack() {

        if (!tracks.length) {
            return;
        }


        currentTrack =
            currentTrack <= 0
                ? tracks.length - 1
                : currentTrack - 1;


        loadTrack(
            currentTrack
        );


        playAudio();
    }


    /* =========================================================
       VOLUME
       ========================================================= */

    function updateVolume() {

        audio.volume =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(
                        volumeBar.value
                    )
                )
            );


        audio.muted =
            audio.volume === 0;


        updateMuteButton();

        saveState();
    }


    function toggleMute() {

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
                        n(
                            audio.dataset.previousVolume,
                            1
                        )
                    );


                volumeBar.value =
                    audio.volume;
            }

        } else {

            audio.dataset.previousVolume =
                String(
                    audio.volume
                );

            audio.muted =
                true;
        }


        updateMuteButton();

        saveState();
    }


    /* =========================================================
       PLAY MODE
       ========================================================= */

    function cycleMode() {

        playMode =
            (
                playMode + 1
            ) % 3;


        updateModeButton();

        saveState();
    }


    /* =========================================================
       DRAGGING
       ========================================================= */

    function beginDrag(
        event
    ) {

        if (
            !isDesktop()
        ) {
            return;
        }


        if (
            event.button !== undefined &&
            event.button !== 0
        ) {
            return;
        }


        const target =
            event.target;


        /*
         * Don't drag when a player control
         * is being clicked.
         *
         * The minimized bubble is the exception.
         */

        const isBubble =
            !!target.closest(
                ".music-player-bubble"
            );


        if (
            !isBubble &&
            target.closest(
                "button,input,a,select,textarea"
            )
        ) {
            return;
        }


        const rect =
            widget.getBoundingClientRect();


        dragging =
            true;

        dragMoved =
            false;

        dragPointerId =
            event.pointerId;


        dragStartX =
            event.clientX;

        dragStartY =
            event.clientY;


        dragStartLeft =
            rect.left;

        dragStartTop =
            rect.top;


        widget.classList.add(
            "dragging"
        );


        document.addEventListener(
            "pointermove",
            handleDrag,
            true
        );


        document.addEventListener(
            "pointerup",
            endDrag,
            true
        );


        document.addEventListener(
            "pointercancel",
            endDrag,
            true
        );


        event.preventDefault();
    }


    function handleDrag(
        event
    ) {

        if (
            !dragging ||
            event.pointerId !==
            dragPointerId
        ) {
            return;
        }


        const dx =
            event.clientX -
            dragStartX;


        const dy =
            event.clientY -
            dragStartY;


        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {

            dragMoved =
                true;
        }


        const maxLeft =
            Math.max(
                MARGIN,
                window.innerWidth -
                widget.offsetWidth -
                MARGIN
            );


        const maxTop =
            Math.max(
                MARGIN,
                window.innerHeight -
                widget.offsetHeight -
                MARGIN
            );


        const left =
            Math.max(
                MARGIN,
                Math.min(
                    dragStartLeft + dx,
                    maxLeft
                )
            );


        const top =
            Math.max(
                MARGIN,
                Math.min(
                    dragStartTop + dy,
                    maxTop
                )
            );


        widget.style.left =
            left + "px";

        widget.style.top =
            top + "px";

        widget.style.right =
            "auto";
    }


    function endDrag(
        event
    ) {

        if (!dragging) {
            return;
        }


        if (
            event.pointerId !==
            undefined &&
            event.pointerId !==
            dragPointerId
        ) {
            return;
        }


        dragging =
            false;


        dragPointerId =
            null;


        widget.classList.remove(
            "dragging"
        );


        document.removeEventListener(
            "pointermove",
            handleDrag,
            true
        );


        document.removeEventListener(
            "pointerup",
            endDrag,
            true
        );


        document.removeEventListener(
            "pointercancel",
            endDrag,
            true
        );


        savePosition();
        saveState();


        /*
         * Prevent a drag of the bubble from
         * being interpreted as a click.
         */

        if (
            dragMoved
        ) {

            bubble.dataset.dragged =
                "true";


            setTimeout(
                function () {

                    delete bubble.dataset.dragged;

                },
                50
            );
        }
    }


    /* =========================================================
       EVENTS
       ========================================================= */

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


                saveState();
            }
        );


        volumeBar.addEventListener(
            "input",
            updateVolume
        );


        muteBtn.addEventListener(
            "click",
            toggleMute
        );


        modeBtn.addEventListener(
            "click",
            cycleMode
        );


        minimizeBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                setDisplayMode(
                    "minimized"
                );
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


                expandSafely();
            }
        );


        audio.addEventListener(
            "loadedmetadata",
            function () {

                if (
                    !Number.isFinite(
                        audio.duration
                    )
                ) {
                    return;
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
                        (
                            audio.currentTime /
                            audio.duration
                        ) * 100;
                }


                saveState();
            }
        );


        audio.addEventListener(
            "play",
            function () {

                pendingResume =
                    false;

                updatePlayButton(
                    true
                );

                updateTabTitle();

                saveState();
            }
        );


        audio.addEventListener(
            "pause",
            function () {

                updatePlayButton(
                    false
                );

                saveState();
            }
        );


        audio.addEventListener(
            "volumechange",
            function () {

                volumeBar.value =
                    audio.volume;

                updateMuteButton();

                saveState();
            }
        );


        audio.addEventListener(
            "ended",
            function () {

                nextTrack();
            }
        );


        document.addEventListener(
            "pointerdown",
            function () {

                if (
                    pendingResume
                ) {

                    tryResume();
                }
            },
            {
                passive: true
            }
        );


        document.addEventListener(
            "keydown",
            function () {

                if (
                    pendingResume
                ) {

                    tryResume();
                }
            },
            {
                passive: true
            }
        );


        window.addEventListener(
            "resize",
            function () {

                if (
                    isDesktop()
                ) {

                    clampPlayer();

                } else {

                    widget.style.left =
                        "auto";

                    widget.style.right =
                        "12px";

                    widget.style.top =
                        "76px";
                }
            }
        );


        document.addEventListener(
            "visibilitychange",
            function () {

                saveState();

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    savePosition();
                }
            }
        );


        window.addEventListener(
            "pagehide",
            function () {

                saveState();
                savePosition();

            },
            {
                capture: true
            }
        );


        window.addEventListener(
            "beforeunload",
            function () {

                saveState();
                savePosition();

            }
        );
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init() {

        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return;
        }


        createPlayer();


        if (
            !widget ||
            !player ||
            !audio
        ) {

            console.error(
                "[Cyber Player] Failed to create player."
            );

            return;
        }


        bindEvents();

        syncDisplayMode();

        loadPlaylist();


        /*
         * Frequent state saving while the page is open.
         */

        window.setInterval(
            saveState,
            250
        );
    }


    /*
     * Small helper used by playlist/state code.
     */

    function n(
        value,
        fallback
    ) {

        const result =
            Number(value);

        return Number.isFinite(
            result
        )
            ? result
            : fallback;
    }


    function syncDisplayMode() {

        if (
            !isDesktop()
        ) {

            widget.style.left =
                "auto";

            widget.style.right =
                "12px";

            widget.style.top =
                "76px";

            widget.classList.remove(
                "parijat-player-minimized"
            );

            displayMode =
                "expanded";

            return;
        }


        restorePosition();
        restoreDisplayMode();
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();