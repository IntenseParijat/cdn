(function () {
    "use strict";

    const PLAYER_ID = "parijat-floating-player";
    const PLAYLIST_URL =
        "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";

    const MOBILE_BREAKPOINT = 768;
    const VIEWPORT_MARGIN = 16;

    const STORAGE = {
        track: "parijatPlayer.track",
        time: "parijatPlayer.time",
        volume: "parijatPlayer.volume",
        muted: "parijatPlayer.muted",
        playing: "parijatPlayer.playing",
        mode: "parijatPlayer.mode",
        display: "parijatPlayer.displayMode",
        left: "parijatPlayer.left",
        top: "parijatPlayer.top",
        bubbleLeft: "parijatPlayer.bubbleLeft",
        bubbleTop: "parijatPlayer.bubbleTop",
        playlist: "parijatPlayer.playlist"
    };

    let root = null;
    let player = null;
    let audio = null;

    let prevBtn = null;
    let playBtn = null;
    let nextBtn = null;
    let seekbar = null;
    let trackTitle = null;
    let trackArtist = null;
    let muteBtn = null;
    let volumeBar = null;
    let modeBtn = null;
    let minimizeBtn = null;
    let bubble = null;
    let equalizer = null;

    let tracks = [];
    let currentTrack = 0;
    let playMode = 0;
    let displayMode = "expanded";
    let shouldBePlaying = false;
    let autoplayRetry = false;

    let originalTitle = document.title;

    let dragState = null;
    let loadingToken = 0;

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    function readNumber(key, fallback) {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) ? value : fallback;
    }

    const PLAYER_HTML = `
    <div class="parijat-player">

      <div class="parijat-glow"></div>

      <div class="parijat-top-row">

        <button
          type="button"
          class="parijat-control"
          id="parijat-prev"
          aria-label="Previous track">

          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white">

            <path d="M6 6h2v12H6zm3.5 6L18 18V6z"/>
          </svg>

        </button>

        <button
          type="button"
          class="parijat-control"
          id="parijat-play"
          aria-label="Play">

          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white">

            <path d="M8 5v14l11-7z"/>
          </svg>

        </button>

        <button
          type="button"
          class="parijat-control"
          id="parijat-next"
          aria-label="Next track">

          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white">

            <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>
          </svg>

        </button>

      </div>

      <div class="parijat-track-info">

        <div
          class="parijat-track-title"
          id="parijat-track-title">
          LOADING...
        </div>

        <div
          class="parijat-track-artist"
          id="parijat-track-artist">
        </div>

      </div>

      <div
        class="parijat-equalizer"
        id="parijat-equalizer">

        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>

      </div>

      <div class="parijat-seek-row">

        <input
          type="range"
          id="parijat-seek"
          min="0"
          max="100"
          step="0.01"
          value="0"
          aria-label="Seek">

        <button
          type="button"
          id="parijat-mode"
          class="parijat-round-button"
          aria-label="Playback mode">
        </button>

      </div>

      <div class="parijat-volume-row">

        <button
          type="button"
          id="parijat-mute"
          class="parijat-round-button"
          aria-label="Mute">
        </button>

        <input
          type="range"
          id="parijat-volume"
          min="0"
          max="1"
          step="0.01"
          value="1"
          aria-label="Volume">

      </div>

      <audio
        id="parijat-audio"
        preload="auto">
      </audio>

    </div>
  `;

    const PLAYER_CSS = `
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
      box-sizing: border-box;
    }

    #${PLAYER_ID}.dragging {
      cursor: grabbing;
    }

    #${PLAYER_ID} .parijat-player {
      position: relative;
      width: 100%;
      max-width: 360px;
      box-sizing: border-box;
      padding: 20px;
      border-radius: 20px;
      background:
        linear-gradient(
          145deg,
          rgba(20,20,20,.96),
          rgba(35,35,35,.88)
        );
      border:
        1px solid
        rgba(255,115,87,.25);
      box-shadow:
        0 0 25px
        rgba(255,115,87,.12),
        inset 0 0 25px
        rgba(255,255,255,.03);
      overflow: hidden;
      backdrop-filter: blur(18px);
      pointer-events: auto;
    }

    #${PLAYER_ID} .parijat-glow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(
          circle at center,
          rgba(255,115,87,.12),
          transparent 70%
        );
      opacity: 0;
      transition: opacity .4s ease;
      pointer-events: none;
    }

    #${PLAYER_ID}
      .parijat-player.playing
      .parijat-glow {
      opacity: 1;
    }

    #${PLAYER_ID} .parijat-top-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    #${PLAYER_ID} .parijat-control {
      width: 58px;
      height: 58px;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      color: white;
      background:
        linear-gradient(
          145deg,
          #ff7357,
          #ff512f
        );
      box-shadow:
        0 0 18px
        rgba(255,115,87,.4);
      cursor: pointer !important;
      transition:
        transform .2s ease,
        box-shadow .2s ease;
    }

    #${PLAYER_ID}
      .parijat-control:hover {
      transform: scale(1.08);
      box-shadow:
        0 0 25px
        rgba(255,115,87,.8);
    }

    #${PLAYER_ID} .parijat-track-info {
      width: 100%;
      text-align: center;
      margin-bottom: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    #${PLAYER_ID} .parijat-track-title {
      width: 100%;
      color: #fff;
      font-family:
        Orbitron,
        Arial,
        sans-serif;
      font-size: 12px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      line-height: 1.4;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    #${PLAYER_ID} .parijat-track-artist {
      width: 100%;
      margin-top: 5px;
      color:
        rgba(255,255,255,.55);
      font-family:
        Orbitron,
        Arial,
        sans-serif;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    #${PLAYER_ID} .parijat-equalizer {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 5px;
      height: 34px;
      margin-bottom: 18px;
    }

    #${PLAYER_ID}
      .parijat-equalizer span {
      width: 5px;
      height: 10px;
      border-radius: 20px;
      background: #ff7357;
      box-shadow:
        0 0 12px
        rgba(255,115,87,.8);
      animation:
        parijat-equalizer
        1s infinite ease-in-out;
      animation-play-state: paused;
      transition:
        background .2s ease,
        box-shadow .2s ease;
    }

    #${PLAYER_ID}
      .parijat-player.playing
      .parijat-equalizer span {
      animation-play-state: running;
    }

    #${PLAYER_ID}
      .parijat-equalizer.loading span {
      background: #8b7cff;
      box-shadow:
        0 0 12px
        rgba(139,124,255,.9);
    }

    #${PLAYER_ID}
      .parijat-equalizer.loaded span {
      background: #ff7357;
      box-shadow:
        0 0 12px
        rgba(255,115,87,.8);
    }

    @keyframes parijat-equalizer {
      0%, 100% {
        height: 10px;
      }

      50% {
        height: 34px;
      }
    }

    #${PLAYER_ID} .parijat-seek-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    #${PLAYER_ID} #parijat-seek {
      flex: 1;
      min-width: 0;
      accent-color: #ff7357;
      cursor: pointer;
    }

    #${PLAYER_ID} .parijat-volume-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
    }

    #${PLAYER_ID} #parijat-volume {
      flex: 1;
      min-width: 0;
      accent-color: #ff7357;
      cursor: pointer;
    }

    #${PLAYER_ID}
      .parijat-round-button {
      width: 38px;
      height: 38px;
      min-width: 38px;
      padding: 0;
      border: none;
      border-radius: 50%;
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
        rgba(255,115,87,.4);
      cursor: pointer !important;
      transition:
        transform .2s ease,
        box-shadow .2s ease;
    }

    #${PLAYER_ID}
      .parijat-round-button:hover {
      transform: scale(1.08);
      box-shadow:
        0 0 18px
        rgba(255,115,87,.8);
    }

    #${PLAYER_ID}
      .parijat-minimize {
      position: absolute;
      top: 7px;
      right: 7px;
      z-index: 5;
      width: 28px;
      height: 28px;
      padding: 0;
      border:
        1px solid
        rgba(255,255,255,.12);
      border-radius: 50%;
      background:
        rgba(20,20,20,.72);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font:
        700 18px/1
        Arial,
        sans-serif;
      cursor: pointer !important;
    }

    #${PLAYER_ID}
      .parijat-bubble {
      display: none;
    }

    #${PLAYER_ID}.minimized {
      width: 58px;
      height: 58px;
      max-width: 58px;
    }

    #${PLAYER_ID}.minimized
      .parijat-player {
      display: none;
    }

    #${PLAYER_ID}.minimized
      .parijat-minimize {
      display: none;
    }

    #${PLAYER_ID}.minimized
      .parijat-bubble {
      width: 58px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
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
      color: white;
      font-size: 28px;
      line-height: 1;
      cursor: grab !important;
      box-sizing: border-box;
      box-shadow:
        0 0 20px
        rgba(255,115,87,.18),
        inset 0 0 20px
        rgba(255,255,255,.03);
      touch-action: none;
    }

    #${PLAYER_ID}.minimized
      .parijat-bubble::after {
      content: "";
      display: none;
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      background:
        conic-gradient(
          from 0deg,
          transparent 0deg,
          transparent 50deg,
          #ff7357 95deg,
          #ff7357 145deg,
          transparent 190deg,
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
        parijat-loading-ring
        1s linear infinite;
      pointer-events: none;
    }

    #${PLAYER_ID}.minimized
      .parijat-bubble.playing::after {
      display: block;
    }

    @keyframes parijat-loading-ring {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 768px) {

      #${PLAYER_ID} {
        position: relative !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: auto !important;
        cursor: default !important;
        touch-action: auto !important;
      }

      #${PLAYER_ID}
        .parijat-player {
        width:
          calc(100% - 32px);
        max-width: 360px;
        margin:
          20px auto;
      }

      #${PLAYER_ID}
        .parijat-minimize,
      #${PLAYER_ID}
        .parijat-bubble {
        display: none !important;
      }
    }
  `;

    function injectStyles() {
        if (
            document.getElementById(
                PLAYER_ID + "-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            PLAYER_ID + "-styles";

        style.textContent =
            PLAYER_CSS;

        document.head.appendChild(
            style
        );
    }

    function createPlayer() {
        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return false;
        }

        injectStyles();

        root =
            document.createElement(
                "div"
            );

        root.id =
            PLAYER_ID;

        root.innerHTML =
            PLAYER_HTML;

        document.body.appendChild(
            root
        );

        player =
            root.querySelector(
                ".parijat-player"
            );

        audio =
            root.querySelector(
                "#parijat-audio"
            );

        prevBtn =
            root.querySelector(
                "#parijat-prev"
            );

        playBtn =
            root.querySelector(
                "#parijat-play"
            );

        nextBtn =
            root.querySelector(
                "#parijat-next"
            );

        seekbar =
            root.querySelector(
                "#parijat-seek"
            );

        trackTitle =
            root.querySelector(
                "#parijat-track-title"
            );

        trackArtist =
            root.querySelector(
                "#parijat-track-artist"
            );

        muteBtn =
            root.querySelector(
                "#parijat-mute"
            );

        volumeBar =
            root.querySelector(
                "#parijat-volume"
            );

        modeBtn =
            root.querySelector(
                "#parijat-mode"
            );

        equalizer =
            root.querySelector(
                "#parijat-equalizer"
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

        minimizeBtn.title =
            "Minimize music player";

        minimizeBtn.setAttribute(
            "aria-label",
            "Minimize music player"
        );

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

        bubble.title =
            "Open music player";

        bubble.setAttribute(
            "aria-label",
            "Open music player"
        );

        root.appendChild(
            minimizeBtn
        );

        root.appendChild(
            bubble
        );

        return true;
    }

    function updateTabTitle() {
        const name =
            trackTitle &&
                trackTitle.textContent
                ? trackTitle.textContent.trim()
                : "";

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

    function setEqualizerState(
        state
    ) {
        equalizer.classList.remove(
            "loading",
            "loaded"
        );

        if (
            state === "loading"
        ) {
            equalizer.classList.add(
                "loading"
            );
        }

        if (
            state === "loaded"
        ) {
            equalizer.classList.add(
                "loaded"
            );
        }
    }

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

    function updateMuteButton() {
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

    function updateModeButton() {
        const icons = [

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z"/>
        </svg>
      `,

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.59L14.76 17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L8.41 18H4Z"/>
        </svg>
      `,

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
      `
        ];

        modeBtn.innerHTML =
            icons[playMode];
    }

    function saveState() {
        if (!audio) return;

        try {
            localStorage.setItem(
                STORAGE.track,
                String(currentTrack)
            );

            localStorage.setItem(
                STORAGE.time,
                String(audio.currentTime || 0)
            );

            localStorage.setItem(
                STORAGE.volume,
                String(audio.volume)
            );

            localStorage.setItem(
                STORAGE.muted,
                String(audio.muted)
            );

            localStorage.setItem(
                STORAGE.playing,
                String(shouldBePlaying)
            );

            localStorage.setItem(
                STORAGE.mode,
                String(playMode)
            );

            localStorage.setItem(
                STORAGE.display,
                displayMode
            );

        } catch (_) { }
    }

    function savePosition() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        const left =
            Math.round(
                rect.left
            );

        const top =
            Math.round(
                rect.top
            );

        localStorage.setItem(
            STORAGE.left,
            String(left)
        );

        localStorage.setItem(
            STORAGE.top,
            String(top)
        );

        if (
            root.classList.contains(
                "minimized"
            )
        ) {
            localStorage.setItem(
                STORAGE.bubbleLeft,
                String(left)
            );

            localStorage.setItem(
                STORAGE.bubbleTop,
                String(top)
            );
        }
    }

    function getSavedBubblePosition() {
        const left =
            readNumber(
                STORAGE.bubbleLeft,
                NaN
            );

        const top =
            readNumber(
                STORAGE.bubbleTop,
                NaN
            );

        return {
            left,
            top
        };
    }

    function restoreExpandedPosition() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const left =
            readNumber(
                STORAGE.left,
                NaN
            );

        const top =
            readNumber(
                STORAGE.top,
                NaN
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

            clampPlayer();

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
            !root ||
            isMobile()
        ) {
            return;
        }

        const saved =
            getSavedBubblePosition();

        if (
            Number.isFinite(saved.left) &&
            Number.isFinite(saved.top)
        ) {

            root.style.left =
                saved.left + "px";

            root.style.top =
                saved.top + "px";

            root.style.right =
                "auto";

            clampPlayer();

        } else {

            restoreExpandedPosition();
        }
    }

    function clampPlayer() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        const maxLeft =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerWidth -
                rect.width -
                VIEWPORT_MARGIN
            );

        const maxTop =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight -
                rect.height -
                VIEWPORT_MARGIN
            );

        const left =
            clamp(
                rect.left,
                VIEWPORT_MARGIN,
                maxLeft
            );

        const top =
            clamp(
                rect.top,
                VIEWPORT_MARGIN,
                maxTop
            );

        root.style.left =
            left + "px";

        root.style.top =
            top + "px";

        root.style.right =
            "auto";
    }

    function moveToCurrentContainer() {
        const sidebar =
            document.querySelector(
                ".sidebar-container"
            );

        if (isMobile()) {

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

            root.style.visibility =
                "visible";

            displayMode =
                "expanded";

            return;
        }

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

        root.style.visibility =
            "visible";
    }

    function syncDisplayMode() {
        moveToCurrentContainer();

        if (isMobile()) {
            return;
        }

        const saved =
            localStorage.getItem(
                STORAGE.display
            );

        displayMode =
            saved === "minimized"
                ? "minimized"
                : "expanded";

        if (
            displayMode ===
            "minimized"
        ) {

            root.classList.add(
                "minimized"
            );

            restoreBubblePosition();

        } else {

            root.classList.remove(
                "minimized"
            );

            restoreExpandedPosition();
        }
    }

    function setDisplayMode(mode) {
        if (isMobile()) {
            return;
        }

        if (
            mode === "minimized"
        ) {

            const rect =
                root.getBoundingClientRect();

            localStorage.setItem(
                STORAGE.bubbleLeft,
                String(
                    Math.round(
                        rect.left
                    )
                )
            );

            localStorage.setItem(
                STORAGE.bubbleTop,
                String(
                    Math.round(
                        rect.top
                    )
                )
            );

            displayMode =
                "minimized";

            root.classList.add(
                "minimized"
            );

            restoreBubblePosition();

            saveState();
            savePosition();

            return;
        }

        expandPlayer();
    }

    function expandPlayer() {
        if (isMobile()) {
            return;
        }

        const bubbleRect =
            root.getBoundingClientRect();

        const desiredLeft =
            bubbleRect.left;

        const desiredTop =
            bubbleRect.top;

        root.classList.remove(
            "minimized"
        );

        root.style.position =
            "fixed";

        root.style.left =
            desiredLeft + "px";

        root.style.top =
            desiredTop + "px";

        root.style.right =
            "auto";

        root.style.visibility =
            "hidden";

        requestAnimationFrame(
            function () {

                const rect =
                    root.getBoundingClientRect();

                const maxLeft =
                    Math.max(
                        VIEWPORT_MARGIN,
                        window.innerWidth -
                        rect.width -
                        VIEWPORT_MARGIN
                    );

                const maxTop =
                    Math.max(
                        VIEWPORT_MARGIN,
                        window.innerHeight -
                        rect.height -
                        VIEWPORT_MARGIN
                    );

                const left =
                    clamp(
                        desiredLeft,
                        VIEWPORT_MARGIN,
                        maxLeft
                    );

                const top =
                    clamp(
                        desiredTop,
                        VIEWPORT_MARGIN,
                        maxTop
                    );

                root.style.left =
                    left + "px";

                root.style.top =
                    top + "px";

                root.style.visibility =
                    "visible";

                displayMode =
                    "expanded";

                saveState();
                savePosition();
            }
        );
    }

    function startDrag(event) {
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

        const target =
            event.target;

        const isBubble =
            !!target.closest(
                ".parijat-bubble"
            );

        if (
            !isBubble &&
            target.closest(
                "button,input,select,textarea"
            )
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        dragState = {
            pointerId:
                event.pointerId,

            startX:
                event.clientX,

            startY:
                event.clientY,

            startLeft:
                rect.left,

            startTop:
                rect.top,

            moved:
                false
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

    function dragMove(event) {
        if (
            !dragState ||
            event.pointerId !==
            dragState.pointerId
        ) {
            return;
        }

        const dx =
            event.clientX -
            dragState.startX;

        const dy =
            event.clientY -
            dragState.startY;

        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {
            dragState.moved =
                true;
        }

        const maxLeft =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerWidth -
                root.offsetWidth -
                VIEWPORT_MARGIN
            );

        const maxTop =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight -
                root.offsetHeight -
                VIEWPORT_MARGIN
            );

        const left =
            clamp(
                dragState.startLeft +
                dx,
                VIEWPORT_MARGIN,
                maxLeft
            );

        const top =
            clamp(
                dragState.startTop +
                dy,
                VIEWPORT_MARGIN,
                maxTop
            );

        root.style.left =
            left + "px";

        root.style.top =
            top + "px";

        root.style.right =
            "auto";
    }

    function endDrag(event) {
        if (!dragState) {
            return;
        }

        if (
            event.pointerId !==
            undefined &&
            event.pointerId !==
            dragState.pointerId
        ) {
            return;
        }

        const moved =
            dragState.moved;

        dragState =
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
            endDrag,
            true
        );

        document.removeEventListener(
            "pointercancel",
            endDrag,
            true
        );

        if (
            moved &&
            displayMode ===
            "minimized"
        ) {

            const rect =
                root.getBoundingClientRect();

            localStorage.setItem(
                STORAGE.bubbleLeft,
                String(
                    Math.round(
                        rect.left
                    )
                )
            );

            localStorage.setItem(
                STORAGE.bubbleTop,
                String(
                    Math.round(
                        rect.top
                    )
                )
            );

            bubble.dataset.dragged =
                "true";

            setTimeout(
                function () {
                    delete bubble.dataset.dragged;
                },
                100
            );
        }

        savePosition();
        saveState();
    }

    function loadTrack(
        index,
        restoreTime
    ) {

        if (!tracks.length) {
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

        loadingToken += 1;

        const token =
            loadingToken;

        setEqualizerState(
            "loading"
        );

        trackTitle.textContent =
            track.title ||
            "UNTITLED";

        trackArtist.textContent =
            track.artist ||
            "";

        updateTabTitle();

        seekbar.value =
            "0";

        audio.pause();

        audio.src =
            track.src;

        audio.load();

        if (!restoreTime) {
            return;
        }

        const savedTime =
            Math.max(
                0,
                readNumber(
                    STORAGE.time,
                    0
                )
            );

        const restore =
            function () {

                if (
                    token !==
                    loadingToken
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

    function trackLoaded() {
        setEqualizerState(
            "loaded"
        );

        updateTabTitle();

        if (
            shouldBePlaying &&
            audio.paused
        ) {
            playAudio();
        }
    }

    async function playAudio() {
        shouldBePlaying =
            true;

        try {

            await audio.play();

            autoplayRetry =
                false;

            updatePlayButton(
                true
            );

            saveState();

        } catch (_) {

            autoplayRetry =
                true;

            updatePlayButton(
                false
            );

            saveState();
        }
    }

    function pauseAudio() {
        shouldBePlaying =
            false;

        autoplayRetry =
            false;

        audio.pause();

        updatePlayButton(
            false
        );

        saveState();
    }

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
            currentTrack,
            false
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
            currentTrack,
            false
        );

        playAudio();
    }

    function updateVolume() {
        audio.volume =
            clamp(
                Number(
                    volumeBar.value
                ),
                0,
                1
            );

        if (
            audio.volume > 0
        ) {
            audio.muted =
                false;
        }

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
                        readNumber(
                            STORAGE.volume,
                            1
                        )
                    );

                volumeBar.value =
                    String(
                        audio.volume
                    );
            }

        } else {

            audio.muted =
                true;
        }

        updateMuteButton();
        saveState();
    }

    function cycleMode() {
        playMode =
            (
                playMode + 1
            ) % 3;

        updateModeButton();
        saveState();
    }

    function getCachedPlaylist() {
        try {

            const cached =
                JSON.parse(
                    localStorage.getItem(
                        STORAGE.playlist
                    ) ||
                    "null"
                );

            return Array.isArray(
                cached
            )
                ? cached
                : null;

        } catch (_) {

            return null;
        }
    }

    function normalizePlaylist(
        data
    ) {

        if (
            !Array.isArray(data)
        ) {

            throw new Error(
                "Playlist is not an array"
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

    async function loadPlaylist() {

        let playlist =
            null;

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

            playlist =
                normalizePlaylist(
                    await response.json()
                );

            if (
                !playlist.length
            ) {

                throw new Error(
                    "Playlist is empty"
                );
            }

            localStorage.setItem(
                STORAGE.playlist,
                JSON.stringify(
                    playlist
                )
            );

        } catch (error) {

            playlist =
                getCachedPlaylist();

            if (
                !playlist ||
                !playlist.length
            ) {

                trackTitle.textContent =
                    "FAILED TO LOAD PLAYLIST";

                trackArtist.textContent =
                    "";

                setEqualizerState(
                    "loading"
                );

                console.error(
                    "[Cyber Player] Playlist error:",
                    error
                );

                return;
            }
        }

        tracks =
            playlist;

        currentTrack =
            clamp(
                readNumber(
                    STORAGE.track,
                    0
                ),
                0,
                tracks.length - 1
            );

        playMode =
            clamp(
                readNumber(
                    STORAGE.mode,
                    0
                ),
                0,
                2
            );

        updateModeButton();

        loadTrack(
            currentTrack,
            true
        );

        displayMode =
            localStorage.getItem(
                STORAGE.display
            ) === "minimized"
                ? "minimized"
                : "expanded";

        syncDisplayMode();

        if (
            shouldBePlaying
        ) {

            setTimeout(
                function () {
                    playAudio();
                },
                0
            );
        } else {

            updatePlayButton(
                false
            );
        }
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

                setDisplayMode(
                    "expanded"
                );
            }
        );

        audio.addEventListener(
            "loadedmetadata",
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    const savedTime =
                        Math.max(
                            0,
                            readNumber(
                                STORAGE.time,
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
                }
            }
        );

        audio.addEventListener(
            "canplay",
            trackLoaded
        );

        audio.addEventListener(
            "loadeddata",
            trackLoaded
        );

        audio.addEventListener(
            "error",
            function () {

                setEqualizerState(
                    "loading"
                );
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
                }

                saveState();
            }
        );

        audio.addEventListener(
            "play",
            function () {

                shouldBePlaying =
                    true;

                autoplayRetry =
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
                    String(
                        audio.volume
                    );

                updateMuteButton();
                saveState();
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
            startDrag,
            false
        );

        window.addEventListener(
            "resize",
            syncDisplayMode
        );

        document.addEventListener(
            "pointerdown",
            function () {

                if (
                    autoplayRetry &&
                    shouldBePlaying &&
                    audio.paused
                ) {
                    playAudio();
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
                    autoplayRetry &&
                    shouldBePlaying &&
                    audio.paused
                ) {
                    playAudio();
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

    function restoreInitialState() {

        const savedVolume =
            clamp(
                readNumber(
                    STORAGE.volume,
                    1
                ),
                0,
                1
            );

        audio.volume =
            savedVolume;

        audio.muted =
            localStorage.getItem(
                STORAGE.muted
            ) === "true";

        shouldBePlaying =
            localStorage.getItem(
                STORAGE.playing
            ) === "true";

        playMode =
            clamp(
                readNumber(
                    STORAGE.mode,
                    0
                ),
                0,
                2
            );

        volumeBar.value =
            String(
                savedVolume
            );

        updateMuteButton();
        updateModeButton();
    }

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
            !root ||
            !player ||
            !audio
        ) {
            return;
        }

        restoreInitialState();

        bindEvents();

        moveToCurrentContainer();

        if (
            isMobile()
        ) {

            displayMode =
                "expanded";

        } else {

            const savedDisplay =
                localStorage.getItem(
                    STORAGE.display
                );

            displayMode =
                savedDisplay ===
                    "minimized"
                    ? "minimized"
                    : "expanded";
        }

        syncDisplayMode();

        updateMuteButton();
        updateModeButton();
        updatePlayButton(false);

        loadPlaylist();

        setInterval(
            saveState,
            500
        );
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