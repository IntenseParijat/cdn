(function () {
    "use strict";

    const PLAYER_ID = "parijat-floating-player";
    const PLAYLIST_URL = "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";
    const DRAWER_BREAKPOINT = 1620;
    const MARGIN = 16;
    const PRELOAD_SECONDS = 15;

    const STORAGE = {
        track: "parijatPlayer.track",
        trackSrc: "parijatPlayer.trackSrc",
        time: "parijatPlayer.time",
        volume: "parijatPlayer.volume",
        muted: "parijatPlayer.muted",
        playing: "parijatPlayer.playing",
        mode: "parijatPlayer.mode",
        display: "parijatPlayer.display",
        left: "parijatPlayer.left",
        top: "parijatPlayer.top",
        bubbleLeft: "parijatPlayer.bubbleLeft",
        bubbleTop: "parijatPlayer.bubbleTop",
        playlist: "parijatPlayer.playlist"
    };

    let root = null;
    let player = null;
    let audio = null;
    let preloader = null;

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
    let stateReady = false;
    let preloadedIndex = -1;
    let queuedNextIndex = -1;
    let loadingToken = 0;
    let hydrating = false;
    let dragState = null;

    const originalTitle = document.title;

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

      <audio
        id="parijat-preloader"
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
      color: #ffffff;
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
      min-height: 8px;
      border-radius: 20px;
      background: #ff7357;
      box-shadow:
        0 0 12px
        rgba(255,115,87,.8);
      transform-origin: bottom center;
      animation-play-state: paused;
    }

    #${PLAYER_ID}
      .parijat-player.playing
      .parijat-equalizer span {
      animation-play-state: running;
    }

    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(1) {
      animation:
        parijat-eq-1
        .72s
        infinite
        ease-in-out;
    }

    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(2) {
      animation:
        parijat-eq-2
        .93s
        infinite
        ease-in-out
        .11s;
    }

    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(3) {
      animation:
        parijat-eq-3
        .68s
        infinite
        ease-in-out
        .23s;
    }

    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(4) {
      animation:
        parijat-eq-4
        .87s
        infinite
        ease-in-out
        .07s;
    }

    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(5) {
      animation:
        parijat-eq-5
        .77s
        infinite
        ease-in-out
        .31s;
    }

    #${PLAYER_ID}
      .parijat-equalizer.loading span {
      background: #8b7cff;
      box-shadow:
        0 0 12px
        rgba(139,124,255,.95);
    }

    #${PLAYER_ID}
      .parijat-equalizer.loaded span {
      background: #ff7357;
      box-shadow:
        0 0 12px
        rgba(255,115,87,.8);
    }

    @keyframes parijat-eq-1 {
      0%,100% {
        height: 8px;
      }
      35% {
        height: 28px;
      }
      65% {
        height: 14px;
      }
    }

    @keyframes parijat-eq-2 {
      0%,100% {
        height: 14px;
      }
      30% {
        height: 32px;
      }
      70% {
        height: 9px;
      }
    }

    @keyframes parijat-eq-3 {
      0%,100% {
        height: 22px;
      }
      25% {
        height: 10px;
      }
      55% {
        height: 33px;
      }
      80% {
        height: 15px;
      }
    }

    @keyframes parijat-eq-4 {
      0%,100% {
        height: 11px;
      }
      40% {
        height: 30px;
      }
      75% {
        height: 17px;
      }
    }

    @keyframes parijat-eq-5 {
      0%,100% {
        height: 16px;
      }
      28% {
        height: 31px;
      }
      58% {
        height: 9px;
      }
      82% {
        height: 24px;
      }
    }

    #${PLAYER_ID}
      .parijat-seek-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    #${PLAYER_ID}
      #parijat-seek {
      flex: 1;
      min-width: 0;
      accent-color: #ff7357;
      cursor: pointer;
    }

    #${PLAYER_ID}
      .parijat-volume-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
    }

    #${PLAYER_ID}
      #parijat-volume {
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

    #${PLAYER_ID}
      #parijat-preloader {
      display: none;
    }

    @media screen and (max-width: 1619px) {

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
        margin: 20px auto;
      }

      #${PLAYER_ID}
        .parijat-minimize,
      #${PLAYER_ID}
        .parijat-bubble {
        display: none !important;
      }
    }

    @media screen and (max-width: 500px) {

      #${PLAYER_ID}
        .parijat-control {
        width: 50px;
        height: 50px;
      }

      #${PLAYER_ID}
        .parijat-top-row {
        gap: 10px;
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
            document.createElement("style");

        style.id =
            PLAYER_ID + "-styles";

        style.textContent =
            PLAYER_CSS;

        document.head.appendChild(style);
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
            document.createElement("div");

        root.id =
            PLAYER_ID;

        root.className =
            "music-player parijat-floating-player";

        root.innerHTML =
            PLAYER_HTML;

        document.body.appendChild(root);

        player =
            root.querySelector(
                ".parijat-player"
            );

        audio =
            root.querySelector(
                "#parijat-audio"
            );

        preloader =
            root.querySelector(
                "#parijat-preloader"
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
            document.createElement("button");

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
            document.createElement("button");

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

    function saveState(force) {
        if (
            !audio ||
            (!stateReady && !force)
        ) {
            return;
        }

        try {
            localStorage.setItem(
                STORAGE.track,
                String(currentTrack)
            );

            localStorage.setItem(
                STORAGE.trackSrc,
                tracks[currentTrack]?.src ||
                audio.currentSrc ||
                audio.src ||
                ""
            );

            localStorage.setItem(
                STORAGE.time,
                String(
                    Number.isFinite(
                        audio.currentTime
                    )
                        ? audio.currentTime
                        : 0
                )
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
                String(displayMode)
            );
        } catch (_) { }
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

    function setAbsolutePosition(
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

    function restoreExpandedPosition() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const left =
            Number(
                localStorage.getItem(
                    STORAGE.left
                )
            );

        const top =
            Number(
                localStorage.getItem(
                    STORAGE.top
                )
            );

        if (
            Number.isFinite(left) &&
            Number.isFinite(top)
        ) {

            root.style.position =
                "fixed";

            root.style.left =
                left + "px";

            root.style.top =
                top + "px";

            root.style.right =
                "auto";

            clampCurrentPosition();

        } else {

            root.style.position =
                "fixed";

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

        const left =
            Number(
                localStorage.getItem(
                    STORAGE.bubbleLeft
                )
            );

        const top =
            Number(
                localStorage.getItem(
                    STORAGE.bubbleTop
                )
            );

        if (
            Number.isFinite(left) &&
            Number.isFinite(top)
        ) {

            setAbsolutePosition(
                left,
                top,
                58,
                58
            );

        } else {

            const rect =
                root.getBoundingClientRect();

            setAbsolutePosition(
                rect.left,
                rect.top,
                58,
                58
            );
        }
    }

    function clampCurrentPosition() {
        if (
            !root ||
            isMobile()
        ) {
            return;
        }

        const rect =
            root.getBoundingClientRect();

        setAbsolutePosition(
            rect.left,
            rect.top,
            rect.width,
            rect.height
        );
    }

    function isMobile() {
        return (
            window.innerWidth <
            DRAWER_BREAKPOINT
        );
    }

    function moveToCurrentContainer() {
        if (!root) {
            return;
        }

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

            root.style.top =
                "auto";

            root.style.left =
                "auto";

            root.style.right =
                "auto";

            root.style.bottom =
                "auto";

            root.style.width =
                "100%";

            root.style.maxWidth =
                "none";

            root.style.margin =
                "0";

            root.style.padding =
                "0";

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

            root.style.margin =
                "0";

            root.style.padding =
                "0";

            root.style.zIndex =
                "2147483000";

            root.style.cursor =
                "grab";
        }
    }

    function syncDisplayMode() {
        moveToCurrentContainer();

        if (isMobile()) {
            return;
        }

        root.style.visibility =
            "visible";

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

        updateBubbleState();
    }

    function setDisplayMode(mode) {
        if (isMobile()) {
            return;
        }

        if (
            mode ===
            "minimized"
        ) {

            if (
                !root.classList.contains(
                    "minimized"
                )
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
            }

            displayMode =
                "minimized";

            root.classList.add(
                "minimized"
            );

            restoreBubblePosition();

            saveState();
            saveBubblePosition();

            return;
        }

        expandPlayer();
    }

    function expandPlayer() {
        if (
            isMobile()
        ) {
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

                setAbsolutePosition(
                    desiredLeft,
                    desiredTop,
                    rect.width,
                    rect.height
                );

                root.style.visibility =
                    "visible";

                displayMode =
                    "expanded";

                saveExpandedPosition();
                saveState();
            }
        );
    }

    function updatePlayButton(
        playing
    ) {

        if (playing) {

            playBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">

          <path
            d="M6 5h4v14H6zm8 0h4v14h-4z"/>
        </svg>
      `;

        } else {

            playBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">

          <path
            d="M8 5v14l11-7z"/>
        </svg>
      `;
        }

        player.classList.toggle(
            "playing",
            playing
        );

        bubble.classList.toggle(
            "playing",
            playing
        );
    }

    function updateBubbleState() {
        if (!bubble) {
            return;
        }

        bubble.classList.toggle(
            "playing",
            !!audio &&
            !audio.paused
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

        if (
            playMode ===
            0
        ) {

            modeBtn.innerHTML = `
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
            playMode ===
            1
        ) {

            modeBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.59L14.76 17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L8.41 18H4Z"/>
        </svg>
      `;

        } else {

            modeBtn.innerHTML = `
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

    function setEqualizerState(
        state
    ) {

        equalizer.classList.remove(
            "loading",
            "loaded"
        );

        if (
            state ===
            "loading"
        ) {

            equalizer.classList.add(
                "loading"
            );

        } else if (
            state ===
            "loaded"
        ) {

            equalizer.classList.add(
                "loaded"
            );
        }
    }

    function updateTabTitle() {

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

        const token =
            ++loadingToken;

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

        if (!restoreTime) {
            audio.pause();
        }

        audio.src =
            track.src;

        audio.load();

        preloadedIndex =
            -1;

        if (!restoreTime) {
            saveState();
            return;
        }

        hydrating =
            true;

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

                hydrating =
                    false;

                saveState(true);
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

    function restoreInitialSettings() {

        playMode =
            clamp(
                readNumber(
                    STORAGE.mode,
                    0
                ),
                0,
                2
            );

        const volume =
            clamp(
                readNumber(
                    STORAGE.volume,
                    1
                ),
                0,
                1
            );

        audio.volume =
            volume;

        audio.muted =
            localStorage.getItem(
                STORAGE.muted
            ) === "true";

        volumeBar.value =
            String(
                volume
            );

        shouldBePlaying =
            localStorage.getItem(
                STORAGE.playing
            ) === "true";

        displayMode =
            localStorage.getItem(
                STORAGE.display
            ) === "minimized"
                ? "minimized"
                : "expanded";

        updateMuteButton();
        updateModeButton();
    }

    async function loadPlaylist() {

        let cached =
            null;

        try {

            const stored =
                JSON.parse(
                    localStorage.getItem(
                        STORAGE.playlist
                    ) ||
                    "null"
                );

            if (
                Array.isArray(
                    stored
                ) &&
                stored.length
            ) {

                cached =
                    stored;
            }

        } catch (_) { }

        if (cached) {

            tracks =
                cached;

            initializeFromPlaylist();
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

            if (!fresh.length) {
                throw new Error(
                    "Playlist is empty"
                );
            }

            localStorage.setItem(
                STORAGE.playlist,
                JSON.stringify(
                    fresh
                )
            );

            const currentSrc =
                tracks[currentTrack]?.src ||
                localStorage.getItem(
                    STORAGE.trackSrc
                ) ||
                "";

            tracks =
                fresh;

            if (currentSrc) {

                const same =
                    tracks.findIndex(
                        function (track) {
                            return (
                                track.src ===
                                currentSrc
                            );
                        }
                    );

                if (
                    same >= 0
                ) {

                    currentTrack =
                        same;
                }
            }

            if (!cached) {

                initializeFromPlaylist();

            } else {

                refreshCurrentTrack();
            }

        } catch (error) {

            if (!cached) {

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
            }
        }
    }

    function normalizePlaylist(
        data
    ) {

        if (
            !Array.isArray(
                data
            )
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

    function initializeFromPlaylist() {

        currentTrack =
            findRestoredTrack();

        loadTrack(
            currentTrack,
            true
        );

        stateReady =
            true;

        updateModeButton();
        updateMuteButton();

        moveToCurrentContainer();

        if (
            !isMobile()
        ) {

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

        } else {

            displayMode =
                "expanded";

            root.classList.remove(
                "minimized"
            );
        }

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

        preloadNextTrack();
    }

    function refreshCurrentTrack() {

        if (
            !tracks.length
        ) {
            return;
        }

        const savedSrc =
            localStorage.getItem(
                STORAGE.trackSrc
            );

        let index =
            currentTrack;

        if (savedSrc) {

            const same =
                tracks.findIndex(
                    function (track) {
                        return (
                            track.src ===
                            savedSrc
                        );
                    }
                );

            if (
                same >= 0
            ) {

                index =
                    same;
            }
        }

        currentTrack =
            clamp(
                index,
                0,
                tracks.length - 1
            );

        const currentSrc =
            audio.currentSrc ||
            audio.src ||
            "";

        const newSrc =
            tracks[currentTrack].src;

        if (
            currentSrc !==
            newSrc
        ) {

            const keepPlaying =
                shouldBePlaying;

            loadTrack(
                currentTrack,
                true
            );

            shouldBePlaying =
                keepPlaying;

            if (
                shouldBePlaying
            ) {
                playAudio();
            }

        } else {

            trackTitle.textContent =
                tracks[currentTrack].title ||
                "UNTITLED";

            trackArtist.textContent =
                tracks[currentTrack].artist ||
                "";

            updateTabTitle();
        }

        preloadNextTrack();
    }

    function findRestoredTrack() {

        const savedSrc =
            localStorage.getItem(
                STORAGE.trackSrc
            );

        if (savedSrc) {

            const index =
                tracks.findIndex(
                    function (track) {
                        return (
                            track.src ===
                            savedSrc
                        );
                    }
                );

            if (
                index >= 0
            ) {
                return index;
            }
        }

        return clamp(
            readNumber(
                STORAGE.track,
                0
            ),
            0,
            Math.max(
                0,
                tracks.length - 1
            )
        );
    }

    function preloadNextTrack() {

        if (
            !tracks.length ||
            !preloader
        ) {
            return;
        }

        let nextIndex =
            queuedNextIndex;

        if (
            nextIndex < 0 ||
            nextIndex ===
            currentTrack ||
            nextIndex >=
            tracks.length
        ) {

            if (
                playMode === 1 &&
                tracks.length > 1
            ) {

                do {

                    nextIndex =
                        Math.floor(
                            Math.random() *
                            tracks.length
                        );

                } while (
                    nextIndex ===
                    currentTrack
                );

            } else {

                nextIndex =
                    (
                        currentTrack + 1
                    ) %
                    tracks.length;
            }

            queuedNextIndex =
                nextIndex;
        }

        if (
            preloadedIndex ===
            nextIndex
        ) {
            return;
        }

        const next =
            tracks[nextIndex];

        if (
            !next ||
            !next.src
        ) {
            return;
        }

        preloadedIndex =
            nextIndex;

        preloader.src =
            next.src;

        preloader.load();
    }

    async function playAudio() {

        shouldBePlaying =
            true;

        try {

            await audio.play();

            updatePlayButton(
                true
            );

            saveState();

        } catch (_) {

            updatePlayButton(
                false
            );

            saveState();
        }
    }

    function pauseAudio() {

        shouldBePlaying =
            false;

        audio.pause();

        updatePlayButton(
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

        if (
            queuedNextIndex >= 0 &&
            queuedNextIndex !==
            currentTrack
        ) {

            currentTrack =
                queuedNextIndex;

        } else if (
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

            currentTrack =
                next;

        } else {

            currentTrack =
                (
                    currentTrack + 1
                ) %
                tracks.length;
        }

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
            currentTrack <= 0
                ? tracks.length - 1
                : currentTrack - 1;

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
        saveState(true);
    }

    function toggleMute() {

        if (
            audio.muted ||
            audio.volume === 0
        ) {

            audio.muted =
                false;

            if (
                audio.volume ===
                0
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
        saveState(true);
    }

    function cycleMode() {

        playMode =
            (
                playMode + 1
            ) % 3;

        queuedNextIndex =
            -1;

        preloadedIndex =
            -1;

        updateModeButton();

        preloadNextTrack();

        saveState(true);
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
            event.button !==
            0
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
                false,

            bubble:
                isBubble
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

        setAbsolutePosition(
            dragState.startLeft + dx,
            dragState.startTop + dy,
            root.offsetWidth,
            root.offsetHeight
        );
    }

    function endDrag(event) {

        if (
            !dragState
        ) {
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

        const wasBubble =
            dragState.bubble;

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
            wasBubble
        ) {

            saveBubblePosition();

            if (
                moved
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

        muteBtn.addEventListener(
            "click",
            toggleMute
        );

        modeBtn.addEventListener(
            "click",
            cycleMode
        );

        volumeBar.addEventListener(
            "input",
            updateVolume
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
                    hydrating &&
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

                    hydrating =
                        false;

                    saveState(true);
                }
            }
        );

        audio.addEventListener(
            "canplay",
            function () {

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
        );

        audio.addEventListener(
            "play",
            function () {

                updatePlayButton(
                    true
                );

                updateBubbleState();

                saveState();
            }
        );

        audio.addEventListener(
            "pause",
            function () {

                updatePlayButton(
                    false
                );

                updateBubbleState();

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

                saveState();
            }
        );

        audio.addEventListener(
            "progress",
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration -
                    audio.currentTime <=
                    PRELOAD_SECONDS
                ) {

                    preloadNextTrack();
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

        audio.addEventListener(
            "error",
            function () {

                setEqualizerState(
                    "loading"
                );
            }
        );

        preloader.addEventListener(
            "canplay",
            function () {

                if (
                    queuedNextIndex >= 0
                ) {
                    preloadedIndex =
                        queuedNextIndex;
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
            function () {

                syncDisplayMode();

            }
        );

        document.addEventListener(
            "pointerdown",
            function () {

                if (
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

                saveState(true);

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    savePositionForMode();
                }
            }
        );

        window.addEventListener(
            "pagehide",
            function () {

                saveState(true);
                savePositionForMode();
            }
        );

        window.addEventListener(
            "beforeunload",
            function () {

                saveState(true);
                savePositionForMode();
            }
        );
    }

    function init() {

        if (
            !createPlayer()
        ) {
            return;
        }

        restoreInitialSettings();

        bindEvents();

        moveToCurrentContainer();

        syncDisplayMode();

        updateMuteButton();
        updateModeButton();
        updatePlayButton(false);

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
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();